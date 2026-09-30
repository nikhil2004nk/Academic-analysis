import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ExamSubject } from './exam-subject.entity';
import { ApprovalStatus } from './exam-result.entity';

export enum ExamType {
  MAINS = 'MAINS',
  ADVANCED = 'ADVANCED',
  OTHER = 'OTHER',
}

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: ExamType,
    default: ExamType.MAINS,
  })
  type: ExamType;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.APPROVED, // Default approved for admin creations
  })
  approvalStatus: ApprovalStatus;

  @OneToMany(() => ExamSubject, examSubject => examSubject.exam, { cascade: true })
  examSubjects: ExamSubject[];

  @CreateDateColumn()
  createdAt: Date;
}
