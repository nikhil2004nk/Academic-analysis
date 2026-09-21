import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { Subject } from './entities/subject.entity';
import { Exam } from './entities/exam.entity';
import { ExamSubject } from './entities/exam-subject.entity';
import { ExamResult } from './entities/exam-result.entity';
import { SubjectMark } from './entities/subject-mark.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subject,
      Exam,
      ExamSubject,
      ExamResult,
      SubjectMark,
    ]),
    UsersModule,
  ],
  controllers: [AcademicController],
  providers: [AcademicService],
})
export class AcademicModule {}
