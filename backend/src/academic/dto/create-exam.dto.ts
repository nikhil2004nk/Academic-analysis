import { IsNotEmpty, IsString, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType } from '../entities/exam.entity';

export class SubjectMaxMarksDto {
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsNotEmpty()
  maxMarks: number;
}

export class CreateExamDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsEnum(ExamType)
  type: ExamType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectMaxMarksDto)
  subjects: SubjectMaxMarksDto[];
}
