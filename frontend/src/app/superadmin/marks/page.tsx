"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { format } from 'date-fns';
import { useToast } from '@/context/ToastContext';
import * as XLSX from 'xlsx';

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
  const [mode, setMode] = useState<'by_exam' | 'by_student'>('by_exam');
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const { toast } = useToast();
  
  // Marks data dictionary (key is studentId in by_exam mode, examId in by_student mode)
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
        toast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const fetchExistingMarksByExam = async (examId: string) => {
    try {
      const res = await api.get(`/academic/exams/${examId}/marks`);
      const existing = res.data; // Array of { studentId, status, marks }
      
      const initialMarks: Record<string, any> = {};
      students.forEach(student => {
        const existingMark = existing.find((m: any) => m.studentId === student.id);
        if (existingMark) {
          initialMarks[student.id] = { status: existingMark.status, marks: existingMark.marks || {} };
        } else {
          initialMarks[student.id] = { status: 'PRESENT', marks: {} };
        }
      });
      setMarksData(initialMarks);
    } catch (error) {
      console.error('Failed to fetch existing marks', error);
      toast('Failed to fetch existing marks', 'error');
    }
  };

  const fetchExistingMarksByStudent = async (studentId: string) => {
    try {
      const res = await api.get(`/academic/students/${studentId}/marks`);
      const existing = res.data; // Array of { examId, status, marks }
      
      const initialMarks: Record<string, any> = {};
      exams.forEach(exam => {
        const existingMark = existing.find((m: any) => m.examId === exam.id);
        if (existingMark) {
          initialMarks[exam.id] = { status: existingMark.status, marks: existingMark.marks || {} };
        } else {
          initialMarks[exam.id] = { status: 'PRESENT', marks: {} };
        }
      });
      setMarksData(initialMarks);
    } catch (error) {
      console.error('Failed to fetch existing marks', error);
      toast('Failed to fetch existing marks', 'error');
    }
  };

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    if (examId) {
      fetchExistingMarksByExam(examId);
    } else {
      setMarksData({});
    }
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (studentId) {
      fetchExistingMarksByStudent(studentId);
    } else {
      setMarksData({});
    }
  };

  const handleMarkChange = (entityId: string, subjectId: string, value: string) => {
    setMarksData(prev => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        marks: {
          ...prev[entityId]?.marks,
          [subjectId]: value === '' ? '' : Number(value)
        }
      }
    }));
  };

  const handleStatusChange = (entityId: string, status: string) => {
    setMarksData(prev => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        status
      }
    }));
  };

  const handleSaveMarks = async () => {
    try {
      const payload = Object.entries(marksData).map(([entityId, data]) => {
        const cleanedMarks: Record<string, number> = {};
        for (const [subj, val] of Object.entries(data.marks as Record<string, any>)) {
          cleanedMarks[subj] = val === '' ? 0 : Number(val);
        }
        
        if (mode === 'by_exam') {
          return {
            studentId: entityId,
            status: data.status,
            marks: cleanedMarks
          };
        } else {
          return {
            examId: entityId,
            status: data.status,
            marks: cleanedMarks
          };
        }
      });

      if (mode === 'by_exam') {
        await api.post(`/academic/exams/${selectedExamId}/marks`, payload);
      } else {
        await api.post(`/academic/students/${selectedStudentId}/marks`, payload);
      }
      
      toast('Marks saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save marks:', error);
      toast('Failed to save marks', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Transform parsed data to expected payload
        // Expected columns: Exam Name, Date, Exam Type, Attendance, Subject1, Subject2...
        const payload = data.map((row: any) => {
          const marks: Record<string, number> = {};
          const reservedCols = ['Exam Name', 'Date', 'Exam Type', 'Attendance'];
          for (const key of Object.keys(row)) {
            if (!reservedCols.includes(key)) {
              marks[key] = Number(row[key]);
            }
          }
          
          let eType = row['Exam Type']?.toUpperCase() || 'MAINS';
          if (eType !== 'MAINS' && eType !== 'ADVANCED') {
            eType = 'OTHER';
          }

          let eStatus = row['Attendance']?.toUpperCase() || 'PRESENT';
          if (eStatus !== 'PRESENT' && eStatus !== 'ABSENT') {
            eStatus = 'PRESENT';
          }
          
          return {
            examName: row['Exam Name'],
            examDate: row['Date'],
            examType: eType,
            attendance: eStatus,
            marks
          };
        });

        // send to backend
        const res = await api.post(`/academic/students/${selectedStudentId}/marks/import`, payload);
        const report = res.data;
        
        let msg = `Successfully imported ${report.recordsAdded} records.`;
        if (report.createdExams?.length > 0) msg += ` Created exams: ${report.createdExams.join(', ')}.`;
        if (report.createdSubjects?.length > 0) msg += ` Created subjects: ${report.createdSubjects.join(', ')}.`;
        
        toast(msg, 'success');
        
        // Refresh data
        const [examsRes, usersRes] = await Promise.all([
          api.get('/academic/exams'),
          api.get('/users')
        ]);
        setExams(examsRes.data);
        fetchExistingMarksByStudent(selectedStudentId);
        
      } catch (error) {
        console.error('Error importing file', error);
        toast('Failed to import marks. Check file format.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Exam Name': 'JEE Mains Mock 1',
        'Date': '2024-05-15',
        'Exam Type': 'MAINS',
        'Attendance': 'PRESENT',
        'Physics': 85,
        'Chemistry': 90,
        'Mathematics': 88
      },
      {
        'Exam Name': 'Advanced Mock Test 1',
        'Date': '2024-06-20',
        'Exam Type': 'ADVANCED',
        'Attendance': 'ABSENT',
        'Physics': '',
        'Chemistry': '',
        'Mathematics': ''
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MarksTemplate");
    XLSX.writeFile(wb, "marks_import_template.xlsx");
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Marks Entry</h2>
        <p className="text-muted-foreground">Enter marks and attendance bidirectionally.</p>
      </div>
      
      <div className="flex gap-4 border-b border-border/50 pb-4">
        <Button 
          variant={mode === 'by_exam' ? 'default' : 'outline'} 
          onClick={() => { setMode('by_exam'); setMarksData({}); setSelectedExamId(''); setSelectedStudentId(''); }}
        >
          By Exam
        </Button>
        <Button 
          variant={mode === 'by_student' ? 'default' : 'outline'} 
          onClick={() => { setMode('by_student'); setMarksData({}); setSelectedExamId(''); setSelectedStudentId(''); }}
        >
          By Student
        </Button>
      </div>

      {mode === 'by_exam' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Exam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Select 
                  value={selectedExamId}
                  onChange={handleExamChange}
                  options={[
                    { value: '', label: 'Select an exam...' },
                    ...exams.map(ex => ({ value: ex.id, label: `${ex.name} (${format(new Date(ex.date), 'MMM dd, yyyy')})` }))
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {selectedExamId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Enter Marks: {exams.find(e => e.id === selectedExamId)?.name}</CardTitle>
                <Button onClick={handleSaveMarks}>Save Marks</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Attendance</TableHead>
                        {exams.find(e => e.id === selectedExamId)?.examSubjects.map(sub => (
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
                        const exam = exams.find(e => e.id === selectedExamId);
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
                            {exam?.examSubjects.map(sub => (
                              <TableCell key={sub.subject.id} className="text-right">
                                <input
                                  type="number"
                                  disabled={sData.status === 'ABSENT'}
                                  value={sData.marks[sub.subject.id] === undefined ? '' : sData.marks[sub.subject.id]}
                                  onChange={(e) => handleMarkChange(student.id, sub.subject.id, e.target.value)}
                                  className="w-24 ml-auto text-right border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none"
                                  placeholder="0"
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
        </>
      )}

      {mode === 'by_student' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Student</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Select 
                  value={selectedStudentId}
                  onChange={handleStudentChange}
                  options={[
                    { value: '', label: 'Select a student...' },
                    ...students.map(st => ({ value: st.id, label: `${st.name} (${st.email})` }))
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {selectedStudentId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Enter Marks: {students.find(s => s.id === selectedStudentId)?.name}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" className="text-muted-foreground hover:text-white" onClick={handleDownloadTemplate}>
                    Download Template
                  </Button>
                  <div className="relative overflow-hidden inline-block">
                    <Button variant="outline" className="cursor-pointer">Import Excel</Button>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileUpload}
                      className="absolute left-0 top-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <Button onClick={handleSaveMarks}>Save Marks</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {exams.map(exam => {
                    const eData = marksData[exam.id];
                    if (!eData) return null;
                    return (
                      <div key={exam.id} className="border border-border/50 rounded-lg p-4 bg-white/5">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h4 className="font-semibold text-lg">{exam.name}</h4>
                            <p className="text-xs text-muted-foreground">{format(new Date(exam.date), 'MMMM dd, yyyy')}</p>
                          </div>
                          <div className="w-32">
                            <Select
                              value={eData.status}
                              onChange={(value) => handleStatusChange(exam.id, value)}
                              options={[
                                { value: 'PRESENT', label: 'Present' },
                                { value: 'ABSENT', label: 'Absent' }
                              ]}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {exam.examSubjects.map(sub => (
                            <div key={sub.subject.id} className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground">{sub.subject.name} (/{sub.maxMarks})</label>
                              <input
                                type="number"
                                disabled={eData.status === 'ABSENT'}
                                value={eData.marks[sub.subject.id] === undefined ? '' : eData.marks[sub.subject.id]}
                                onChange={(e) => handleMarkChange(exam.id, sub.subject.id, e.target.value)}
                                className="w-full text-right border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none"
                                placeholder="0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
