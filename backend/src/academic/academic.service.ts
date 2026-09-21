import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findAllSubjects() {
    return this.subjectRepository.find({ order: { name: 'ASC' } });
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

        result.totalMarksObtained = totalObtained;
        result.totalMaxMarks = totalMax;
        result.percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        result.subjectMarks = subjectMarks;
      }

      results.push(result);
    }

    return this.examResultRepository.save(results);
  }

  async getStudentDashboard(studentId: string) {
    const results = await this.examResultRepository.find({
      where: { studentId },
      relations: {
        exam: true,
        subjectMarks: {
          subject: true,
        }
      },
      order: { exam: { date: 'ASC' } },
    });

    return results;
  }
}
