import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ExamSubject } from './exam-subject.entity';

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

  @OneToMany(() => ExamSubject, examSubject => examSubject.exam, { cascade: true })
  examSubjects: ExamSubject[];

  @CreateDateColumn()
  createdAt: Date;
}
