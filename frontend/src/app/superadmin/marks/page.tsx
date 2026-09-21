"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { format } from 'date-fns';

interface Exam {
  id: string;
  name: string;
  date: string;
  examSubjects: {
    subject: { id: string, name: string };
    maxMarks: number;
  }[];
}

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function MarksEntryPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  
  // Marks data: studentId -> { status: 'PRESENT' | 'ABSENT', marks: { subjectId: value } }
  const [marksData, setMarksData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, usersRes] = await Promise.all([
          api.get('/academic/exams'),
          api.get('/users') // This returns all users if superadmin
        ]);
        setExams(examsRes.data);
        setStudents(usersRes.data.filter((u: any) => u.role === 'student'));
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    // Initialize marks payload
    const initialMarks: Record<string, any> = {};
    students.forEach(student => {
      initialMarks[student.id] = { status: 'PRESENT', marks: {} };
    });
    setMarksData(initialMarks);
  };

  const handleMarkChange = (studentId: string, subjectId: string, value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: {
          ...prev[studentId].marks,
          [subjectId]: value === '' ? 0 : Number(value)
        }
      }
    }));
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleSaveMarks = async () => {
    try {
      const payload = Object.entries(marksData).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        marks: data.marks
      }));

      await api.post(`/academic/exams/${selectedExamId}/marks`, payload);
      alert('Marks saved successfully!');
    } catch (error) {
      console.error('Failed to save marks:', error);
      alert('Failed to save marks');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Marks Entry</h2>
        <p className="text-muted-foreground">Select an exam to enter marks and attendance for students.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Exam</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select 
              value={selectedExamId}
              onChange={(value) => handleExamChange(value)}
              options={[
                { value: '', label: 'Select an exam...' },
                ...exams.map(ex => ({ value: ex.id, label: `${ex.name} (${format(new Date(ex.date), 'MMM dd, yyyy')})` }))
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {selectedExam && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Enter Marks: {selectedExam.name}</CardTitle>
            <Button onClick={handleSaveMarks}>Save Marks</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Attendance</TableHead>
                    {selectedExam.examSubjects.map(sub => (
                      <TableHead key={sub.subject.id} className="text-right">
                        {sub.subject.name} (/{sub.maxMarks})
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => {
                    const sData = marksData[student.id];
                    if (!sData) return null;
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                          <div className="text-xs text-muted-foreground font-normal">{student.email}</div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sData.status}
                            onChange={(value) => handleStatusChange(student.id, value)}
                            options={[
                              { value: 'PRESENT', label: 'Present' },
                              { value: 'ABSENT', label: 'Absent' }
                            ]}
                          />
                        </TableCell>
                        {selectedExam.examSubjects.map(sub => (
                          <TableCell key={sub.subject.id}>
                            <Input
                              type="number"
                              disabled={sData.status === 'ABSENT'}
                              value={sData.marks[sub.subject.id] === undefined ? '' : sData.marks[sub.subject.id]}
                              onChange={(e) => handleMarkChange(student.id, sub.subject.id, e.target.value)}
                              className="w-24 ml-auto text-right"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
