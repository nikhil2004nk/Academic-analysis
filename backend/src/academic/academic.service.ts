import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { Exam } from './entities/exam.entity';
import { ExamSubject } from './entities/exam-subject.entity';
import { ExamResult, AttendanceStatus } from './entities/exam-result.entity';
import { SubjectMark } from './entities/subject-mark.entity';
import { CreateExamDto } from './dto/create-exam.dto';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(ExamResult)
    private readonly examResultRepository: Repository<ExamResult>,
  ) {}

  async onModuleInit() {
    // Auto-seed PCM subjects
    const subjects = ['Physics', 'Chemistry', 'Mathematics'];
    for (const sub of subjects) {
      const exists = await this.subjectRepository.findOne({ where: { name: sub } });
      if (!exists) {
        await this.subjectRepository.save({ name: sub });
      }
    }
  }

  async findAllSubjects(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.subjectRepository.find({ where, order: { name: 'ASC' } });
  }

  async createSubject(name: string) {
    if (!name) throw new BadRequestException('Subject name is required');
    return this.subjectRepository.save({ name });
  }

  async updateSubject(id: string, name: string) {
    if (!name) throw new BadRequestException('Subject name is required');
    await this.subjectRepository.update(id, { name });
    return this.subjectRepository.findOne({ where: { id } });
  }

  async toggleSubjectActive(id: string) {
    const subject = await this.subjectRepository.findOne({ where: { id } });
    if (!subject) throw new BadRequestException('Subject not found');
    await this.subjectRepository.update(id, { isActive: !subject.isActive });
    return this.subjectRepository.findOne({ where: { id } });
  }

  async deleteSubject(id: string) {
    return this.subjectRepository.delete(id);
  }

  async createExam(createExamDto: CreateExamDto) {
    const exam = this.examRepository.create({
      name: createExamDto.name,
      date: new Date(createExamDto.date),
      type: createExamDto.type,
    });

    const examSubjects = createExamDto.subjects.map(sub => {
      const examSubject = new ExamSubject();
      examSubject.subjectId = sub.subjectId;
      examSubject.maxMarks = sub.maxMarks;
      return examSubject;
    });

    exam.examSubjects = examSubjects;
    return this.examRepository.save(exam);
  }

  async updateExam(id: string, updateExamDto: CreateExamDto) {
    const exam = await this.getExamById(id);
    
    exam.name = updateExamDto.name;
    exam.date = new Date(updateExamDto.date);
    exam.type = updateExamDto.type;

    const newSubjectIds = updateExamDto.subjects.map(s => s.subjectId);

    // Delete removed subjects
    if (newSubjectIds.length > 0) {
      await this.examRepository.manager
        .createQueryBuilder()
        .delete()
        .from(ExamSubject)
        .where('examId = :id AND subjectId NOT IN (:...newSubjectIds)', { id, newSubjectIds })
        .execute();
    } else {
      // If no subjects, delete all
      await this.examRepository.manager
        .createQueryBuilder()
        .delete()
        .from(ExamSubject)
        .where('examId = :id', { id })
        .execute();
    }

    // Reconstruct exam subjects (TypeORM will update existing and insert new on save)
    exam.examSubjects = updateExamDto.subjects.map(sub => {
      const examSubject = new ExamSubject();
      examSubject.examId = exam.id;
      examSubject.subjectId = sub.subjectId;
      examSubject.maxMarks = sub.maxMarks;
      return examSubject;
    });

    return this.examRepository.save(exam);
  }

  async findAllExams() {
    return this.examRepository.find({
      relations: {
        examSubjects: {
          subject: true,
        }
      },
      order: { date: 'DESC' },
    });
  }

  async getExamById(id: string) {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: {
        examSubjects: {
          subject: true,
        }
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async deleteExam(id: string) {
    const exam = await this.getExamById(id);
    return this.examRepository.remove(exam);
  }

  async saveMarks(examId: string, marksData: any[]) {
    // marksData should be an array of student results
    // [{ studentId: 'uuid', status: 'PRESENT', marks: { subjectId: 80, subjectId2: 70 } }]
    const exam = await this.getExamById(examId);

    const results: ExamResult[] = [];

    for (const data of marksData) {
      let result = await this.examResultRepository.findOne({
        where: { examId, studentId: data.studentId },
        relations: {
          subjectMarks: true,
        },
      });

      if (!result) {
        result = new ExamResult();
        result.examId = examId;
        result.studentId = data.studentId;
      }

      result.status = data.status;

      if (data.status === AttendanceStatus.ABSENT) {
        result.totalMarksObtained = 0;
        result.totalMaxMarks = 0;
        result.percentage = 0;
        result.subjectMarks = [];
      } else {
        let totalObtained = 0;
        let totalMax = 0;
        const subjectMarks: SubjectMark[] = [];

        for (const exSub of exam.examSubjects) {
          const marksObtained = data.marks[exSub.subjectId] || 0;
          totalObtained += marksObtained;
          totalMax += exSub.maxMarks;

          const sm = new SubjectMark();
          sm.subjectId = exSub.subjectId;
          sm.marksObtained = marksObtained;
          subjectMarks.push(sm);
        }

        result.subjectMarks = subjectMarks;

        // Override with explicit totals if provided
        if (data.totalMaxMarks !== undefined && data.totalMaxMarks !== null) {
          totalMax = data.totalMaxMarks;
        }
        if (data.totalObtainedMarks !== undefined && data.totalObtainedMarks !== null) {
          totalObtained = data.totalObtainedMarks;
        }

        result.totalMarksObtained = totalObtained;
        result.totalMaxMarks = totalMax;
        result.percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      }

      results.push(result);
    }

    return this.examResultRepository.save(results);
  }

  async getMarksByExam(examId: string) {
    const results = await this.examResultRepository.find({
      where: { examId },
      relations: { subjectMarks: true },
    });
    return results.map(r => {
      const marksMap: Record<string, number> = {};
      r.subjectMarks.forEach(sm => {
        marksMap[sm.subjectId] = sm.marksObtained;
      });
      return {
        studentId: r.studentId,
        status: r.status,
        marks: marksMap,
        totalMaxMarks: r.totalMaxMarks,
        totalObtainedMarks: r.totalMarksObtained,
      };
    });
  }

  async getMarksByStudent(studentId: string) {
    const results = await this.examResultRepository.find({
      where: { studentId },
      relations: { subjectMarks: true },
    });
    return results.map(r => {
      const marksMap: Record<string, number> = {};
      r.subjectMarks.forEach(sm => {
        marksMap[sm.subjectId] = sm.marksObtained;
      });
      return {
        examId: r.examId,
        status: r.status,
        marks: marksMap,
        totalMaxMarks: r.totalMaxMarks,
        totalObtainedMarks: r.totalMarksObtained,
      };
    });
  }

  async saveMarksByStudent(studentId: string, marksData: any[]) {
    const savedResults: ExamResult[] = [];
    for (const data of marksData) {
      const examId = data.examId;
      const exam = await this.getExamById(examId);

      let result = await this.examResultRepository.findOne({
        where: { examId, studentId },
        relations: { subjectMarks: true },
      });

      if (!result) {
        result = new ExamResult();
        result.examId = examId;
        result.studentId = studentId;
      }

      result.status = data.status;

      if (data.status === AttendanceStatus.ABSENT) {
        result.totalMarksObtained = 0;
        result.totalMaxMarks = 0;
        result.percentage = 0;
        result.subjectMarks = [];
      } else {
        let totalObtained = 0;
        let totalMax = 0;
        const subjectMarks: SubjectMark[] = [];

        for (const exSub of exam.examSubjects) {
          const marksObtained = data.marks[exSub.subjectId] || 0;
          totalObtained += marksObtained;
          totalMax += exSub.maxMarks;

          const sm = new SubjectMark();
          sm.subjectId = exSub.subjectId;
          sm.marksObtained = marksObtained;
          subjectMarks.push(sm);
        }

        result.subjectMarks = subjectMarks;
        
        // Override with explicit totals if provided (for import without subjects)
        if (data.totalMaxMarks !== undefined && data.totalMaxMarks !== null) {
          totalMax = data.totalMaxMarks;
        }
        if (data.totalObtainedMarks !== undefined && data.totalObtainedMarks !== null) {
          totalObtained = data.totalObtainedMarks;
        }

        result.totalMarksObtained = totalObtained;
        result.totalMaxMarks = totalMax;
        result.percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      }

      const saved = await this.examResultRepository.save(result);
      savedResults.push(saved);
    }
    return savedResults;
  }

  async importHistoricalMarks(studentId: string, payload: any[]) {
    const createdSubjects: string[] = [];
    const createdExams: string[] = [];
    const rowReports: any[] = [];
    let recordsAdded = 0;

    for (let i = 0; i < payload.length; i++) {
      const row = payload[i];
      const { examName, examDate, examType, attendance, marks, totalMaxMarks, totalObtainedMarks } = row;
      const rowReport = {
        index: i + 1,
        examName,
        status: 'SUCCESS',
        message: 'Imported successfully.',
        createdItems: [] as string[]
      };

      try {
      
      // 1. Find or create exam
      let exam = await this.examRepository.findOne({
        where: { name: examName, date: new Date(examDate) },
        relations: { examSubjects: { subject: true } }
      });

      if (!exam) {
        exam = new Exam();
        exam.name = examName;
        exam.date = new Date(examDate);
        exam.type = examType || 'MAINS';
        exam.examSubjects = [];
        exam = await this.examRepository.save(exam);
        createdExams.push(examName);
        rowReport.createdItems.push(`Exam: ${examName}`);
      }

      // 2. Process subjects
      for (const [subjectName, mark] of Object.entries(marks)) {
        // Find subject case-insensitive
        let subject = await this.subjectRepository.findOne({
          where: { name: ILike(subjectName) }
        });

        if (!subject) {
          subject = await this.subjectRepository.save({ name: subjectName });
          createdSubjects.push(subjectName);
          rowReport.createdItems.push(`Subject: ${subjectName}`);
        }

        // Link subject to exam if not already linked
        const isLinked = exam.examSubjects?.some(es => es.subjectId === subject.id);
        if (!isLinked) {
          const exSub = new ExamSubject();
          exSub.subjectId = subject.id;
          exSub.maxMarks = 100; // Default max marks for imported historical exams
          exSub.examId = exam.id;
          if (!exam.examSubjects) exam.examSubjects = [];
          exam.examSubjects.push(exSub);
          await this.examRepository.save(exam);
        }
      }

      // 3. Save Marks (reuse saveMarksByStudent logic format)
      // We need to construct the payload expected by saveMarksByStudent
      const marksMap: Record<string, number> = {};
      
      // re-fetch exam to get all updated relations safely
      const updatedExam = await this.examRepository.findOne({
        where: { id: exam.id },
        relations: { examSubjects: { subject: true } }
      });

      for (const [subjectName, markVal] of Object.entries(marks)) {
        const sub = await this.subjectRepository.findOne({ where: { name: ILike(subjectName) } });
        if (sub) {
          marksMap[sub.id] = Number(markVal);
        }
      }

      const savePayload = [{
        examId: updatedExam!.id,
        status: attendance,
        marks: marksMap,
        totalMaxMarks: totalMaxMarks ? Number(totalMaxMarks) : null,
        totalObtainedMarks: totalObtainedMarks ? Number(totalObtainedMarks) : null,
      }];

      // Need to modify saveMarksByStudent to accept these
      await this.saveMarksByStudent(studentId, savePayload);
      recordsAdded++;
      } catch (err: any) {
        rowReport.status = 'FAILED';
        rowReport.message = err.message || 'Unknown error occurred.';
      }

      rowReports.push(rowReport);
    }

    return {
      message: 'Import processed',
      recordsAdded,
      createdExams: [...new Set(createdExams)],
      createdSubjects: [...new Set(createdSubjects)],
      rowReports
    };
  }

  async getStudentDashboard(studentId: string, startDate?: string, endDate?: string) {
    // Fetch all results to calculate global trends (like MoM) accurately regardless of filters
    const allResults = await this.examResultRepository.find({
      where: { studentId },
      relations: {
        exam: {
          examSubjects: true,
        },
        subjectMarks: {
          subject: true,
        }
      },
      order: { exam: { date: 'ASC' } },
    });

    const globalMonthStats: Record<string, { totalObtained: number, totalMax: number }> = {};
    allResults.forEach(r => {
      if (r.status !== AttendanceStatus.PRESENT) return;
      const d = new Date(r.exam.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!globalMonthStats[monthKey]) {
        globalMonthStats[monthKey] = { totalObtained: 0, totalMax: 0 };
      }
      globalMonthStats[monthKey].totalObtained += r.totalMarksObtained || 0;
      globalMonthStats[monthKey].totalMax += r.totalMaxMarks || 0;
    });

    const sortedMonths = Object.keys(globalMonthStats).sort((a, b) => b.localeCompare(a));
    let momIndicator: { diff: number; isPositive: boolean } | null = null;
    let targetMonth = sortedMonths.length > 0 ? sortedMonths[0] : null;

    if (startDate && endDate) {
       const d = new Date(endDate);
       targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    if (targetMonth) {
       const targetIndex = sortedMonths.indexOf(targetMonth);
       if (targetIndex >= 0 && targetIndex + 1 < sortedMonths.length) {
          const currentStats = globalMonthStats[sortedMonths[targetIndex]];
          const prevStats = globalMonthStats[sortedMonths[targetIndex + 1]];
          const currentPct = currentStats.totalMax > 0 ? (currentStats.totalObtained / currentStats.totalMax) * 100 : 0;
          const prevPct = prevStats.totalMax > 0 ? (prevStats.totalObtained / prevStats.totalMax) * 100 : 0;
          const diff = currentPct - prevPct;
          momIndicator = {
            diff: Number(diff.toFixed(1)),
            isPositive: diff >= 0
          };
       }
    }

    let results = allResults;
    if (startDate && endDate) {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      results = allResults.filter(r => {
        const t = new Date(r.exam.date).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    const presentExams = results.filter(r => r.status === AttendanceStatus.PRESENT);
    const typeStats: Record<string, { totalObtained: number, totalMax: number, count: number }> = {};
    
    presentExams.forEach(r => {
      const type = r.exam.type || 'MAINS';
      if (!typeStats[type]) {
        typeStats[type] = { totalObtained: 0, totalMax: 0, count: 0 };
      }
      typeStats[type].totalObtained += r.totalMarksObtained || 0;
      typeStats[type].totalMax += r.totalMaxMarks || 0;
      typeStats[type].count += 1;
    });

    const typePerformance = Object.entries(typeStats).map(([name, stats]) => {
      const percentage = stats.totalMax > 0 ? (stats.totalObtained / stats.totalMax) * 100 : 0;
      return {
        name,
        percentage: Number(percentage.toFixed(1)),
        count: stats.count
      };
    }).sort((a, b) => b.percentage - a.percentage);

    let highestExam: any = null;
    let lowestExam: any = null;
    let maxPct = -1;
    let minPct = 101;

    const monthStats: Record<string, { totalObtained: number, totalMax: number, date: Date }> = {};

    presentExams.forEach(r => {
      const pct = r.percentage || (r.totalMaxMarks > 0 ? (r.totalMarksObtained / r.totalMaxMarks) * 100 : 0);
      if (pct > maxPct) {
        maxPct = pct;
        highestExam = { name: r.exam.name, date: r.exam.date, percentage: Number(pct.toFixed(1)), marks: `${r.totalMarksObtained} / ${r.totalMaxMarks}` };
      }
      if (pct < minPct) {
        minPct = pct;
        lowestExam = { name: r.exam.name, date: r.exam.date, percentage: Number(pct.toFixed(1)), marks: `${r.totalMarksObtained} / ${r.totalMaxMarks}` };
      }

      // Track month stats
      const d = new Date(r.exam.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthStats[monthKey]) {
        monthStats[monthKey] = { totalObtained: 0, totalMax: 0, date: d };
      }
      monthStats[monthKey].totalObtained += r.totalMarksObtained || 0;
      monthStats[monthKey].totalMax += r.totalMaxMarks || 0;
    });

    let bestMonth: any = null;
    let bestMonthPct = -1;

    Object.values(monthStats).forEach(stats => {
      if (stats.totalMax > 0) {
        const pct = (stats.totalObtained / stats.totalMax) * 100;
        if (pct > bestMonthPct) {
          bestMonthPct = pct;
          bestMonth = {
            date: stats.date,
            percentage: Number(pct.toFixed(1)),
            marks: `${stats.totalObtained} / ${stats.totalMax}`
          };
        }
      }
    });

    const analysis = { highestExam, lowestExam, bestMonth, momIndicator };

    return { results, typePerformance, analysis };
  }
}
