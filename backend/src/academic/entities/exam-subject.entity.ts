import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Exam } from './exam.entity';
import { Subject } from './subject.entity';

@Entity('exam_subjects')
export class ExamSubject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, exam => exam.examSubjects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column()
  examId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column()
  subjectId: string;

  @Column({ type: 'int', default: 100 })
  maxMarks: number;
}
