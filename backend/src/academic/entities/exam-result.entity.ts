import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exam } from './exam.entity';
import { User } from '../../users/entities/user.entity';
import { SubjectMark } from './subject-mark.entity';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
}

@Entity('exam_results')
export class ExamResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column()
  examId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  studentId: string;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'float', default: 0 })
  totalMarksObtained: number;

  @Column({ type: 'float', default: 0 })
  totalMaxMarks: number;

  @Column({ type: 'float', default: 0 })
  percentage: number;

  @OneToMany(() => SubjectMark, mark => mark.examResult, { cascade: true })
  subjectMarks: SubjectMark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
