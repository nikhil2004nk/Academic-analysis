import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('academic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Get('subjects')
  @Roles(Role.SUPERADMIN, Role.STUDENT)
  getSubjects(@Query('activeOnly') activeOnly?: string) {
    const isActiveOnly = activeOnly === 'true';
    return this.academicService.findAllSubjects(isActiveOnly);
  }

  @Post('subjects')
  @Roles(Role.SUPERADMIN)
  createSubject(@Body('name') name: string) {
    return this.academicService.createSubject(name);
  }

  @Post('subjects/:id')
  @Roles(Role.SUPERADMIN)
  updateSubject(@Param('id') id: string, @Body('name') name: string) {
    return this.academicService.updateSubject(id, name);
  }

  @Post('subjects/:id/toggle-active')
  @Roles(Role.SUPERADMIN)
  toggleSubjectActive(@Param('id') id: string) {
    return this.academicService.toggleSubjectActive(id);
  }

  @Delete('subjects/:id')
  @Roles(Role.SUPERADMIN)
  deleteSubject(@Param('id') id: string) {
    return this.academicService.deleteSubject(id);
  }

  @Post('exams')
  @Roles(Role.SUPERADMIN)
  createExam(@Body() createExamDto: CreateExamDto) {
    return this.academicService.createExam(createExamDto);
  }

  @Get('exams')
  @Roles(Role.SUPERADMIN, Role.STUDENT)
  getExams() {
    return this.academicService.findAllExams();
  }

  @Get('exams/:id')
  @Roles(Role.SUPERADMIN, Role.STUDENT)
  getExamById(@Param('id') id: string) {
    return this.academicService.getExamById(id);
  }

  @Delete('exams/:id')
  @Roles(Role.SUPERADMIN)
  deleteExam(@Param('id') id: string) {
    return this.academicService.deleteExam(id);
  }

  @Put('exams/:id')
  @Roles(Role.SUPERADMIN)
  updateExam(@Param('id') id: string, @Body() updateExamDto: CreateExamDto) {
    return this.academicService.updateExam(id, updateExamDto);
  }

  @Post('exams/:id/marks')
  @Roles(Role.SUPERADMIN)
  saveMarks(@Param('id') examId: string, @Body() marksData: any[]) {
    return this.academicService.saveMarks(examId, marksData);
  }

  @Get('exams/:id/marks')
  @Roles(Role.SUPERADMIN)
  getMarksByExam(@Param('id') examId: string) {
    return this.academicService.getMarksByExam(examId);
  }

  @Get('students/:id/marks')
  @Roles(Role.SUPERADMIN)
  getMarksByStudent(@Param('id') studentId: string) {
    return this.academicService.getMarksByStudent(studentId);
  }

  @Post('students/:id/marks')
  @Roles(Role.SUPERADMIN)
  saveMarksByStudent(@Param('id') studentId: string, @Body() marksData: any[]) {
    return this.academicService.saveMarksByStudent(studentId, marksData);
  }

  @Post('students/:id/marks/import')
  @Roles(Role.SUPERADMIN)
  importHistoricalMarks(@Param('id') studentId: string, @Body() payload: any[]) {
    return this.academicService.importHistoricalMarks(studentId, payload);
  }

  @Get('dashboard/student/:id')
  @Roles(Role.SUPERADMIN, Role.STUDENT)
  getDashboardData(
    @Param('id') studentId: string, 
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    // Basic authorization check: Student can only view their own dashboard
    if (req.user.role === Role.STUDENT && req.user.id !== studentId) {
      studentId = req.user.id; // Override if they try to look at another's
    }
    return this.academicService.getStudentDashboard(studentId, startDate, endDate);
  }
}
