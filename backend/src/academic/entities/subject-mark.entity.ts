import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ExamResult } from './exam-result.entity';
import { Subject } from './subject.entity';

@Entity('subject_marks')
export class SubjectMark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ExamResult, result => result.subjectMarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examResultId' })
  examResult: ExamResult;

  @Column()
  examResultId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column()
  subjectId: string;

  @Column({ type: 'float' })
  marksObtained: number;
}
