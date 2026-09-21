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

  const [importSummary, setImportSummary] = useState<any[] | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
          initialMarks[student.id] = { 
            status: existingMark.status, 
            marks: existingMark.marks || {},
            totalMaxMarks: existingMark.totalMaxMarks,
            totalObtainedMarks: existingMark.totalObtainedMarks
          };
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
          initialMarks[exam.id] = { 
            status: existingMark.status, 
            marks: existingMark.marks || {},
            totalMaxMarks: existingMark.totalMaxMarks,
            totalObtainedMarks: existingMark.totalObtainedMarks
          };
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

  const handleTotalChange = (entityId: string, field: 'totalMaxMarks' | 'totalObtainedMarks', value: string) => {
    setMarksData(prev => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        [field]: value === '' ? null : Number(value)
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
      if (mode === 'by_exam' && selectedExamId) {
        const marksPayload = Object.keys(marksData).map(studentId => {
          const cleanedMarks: Record<string, number> = {};
          if (marksData[studentId].marks) {
            for (const [subj, val] of Object.entries(marksData[studentId].marks)) {
              cleanedMarks[subj] = val === '' ? 0 : Number(val);
            }
          }
          return {
            studentId,
            status: marksData[studentId].status,
            marks: cleanedMarks,
            totalMaxMarks: marksData[studentId].totalMaxMarks,
            totalObtainedMarks: marksData[studentId].totalObtainedMarks
          };
        });
        const res = await api.post(`/academic/exams/${selectedExamId}/marks`, marksPayload);
        toast(`Saved marks for ${res.data.length} students`, 'success');
      } else if (mode === 'by_student' && selectedStudentId) {
        const marksPayload = Object.keys(marksData).map(examId => {
          const cleanedMarks: Record<string, number> = {};
          if (marksData[examId].marks) {
            for (const [subj, val] of Object.entries(marksData[examId].marks)) {
              cleanedMarks[subj] = val === '' ? 0 : Number(val);
            }
          }
          return {
            examId,
            status: marksData[examId].status,
            marks: cleanedMarks,
            totalMaxMarks: marksData[examId].totalMaxMarks,
            totalObtainedMarks: marksData[examId].totalObtainedMarks
          };
        });
        const res = await api.post(`/academic/students/${selectedStudentId}/marks`, marksPayload);
        toast(`Saved marks for ${res.data.length} exams`, 'success');
      }
    } catch (error) {
      console.error('Failed to save marks:', error);
      toast('Failed to save marks', 'error');
    }
  };

  const processFile = (file: File) => {
    setIsUploadModalOpen(false);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        // Don't use cellDates: true to avoid Javascript timezone shifting bugs
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Transform parsed data to expected payload
        // Expected columns: Exam Name, Date, Exam Type, Attendance, Total Max Marks, Total Obtained Marks, Subject1, Subject2...
        const payload: any[] = [];
        const frontendErrors: any[] = [];
        let rowIndex = 1;

        data.forEach((row: any) => {
          const marks: Record<string, number> = {};
          const reservedCols = ['Exam Name', 'Date', 'Exam Type', 'Attendance', 'Total Max Marks', 'Total Obtained Marks'];
          
          let calcObtained = 0;
          for (const key of Object.keys(row)) {
            if (!reservedCols.includes(key)) {
              const cellVal = String(row[key]).trim();
              if (cellVal !== '') {
                const val = Number(cellVal);
                if (!isNaN(val)) {
                  marks[key] = val;
                  calcObtained += val;
                }
              }
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

          const totalMaxMarks = row['Total Max Marks'] ? Number(row['Total Max Marks']) : null;
          const totalObtainedMarks = row['Total Obtained Marks'] ? Number(row['Total Obtained Marks']) : null;
          
          // Robust Date parsing
          let rawDate = row['Date'];
          if (typeof rawDate === 'number') {
            // Excel serial number format (bulletproof against JS timezone shifts)
            const parsed = XLSX.SSF.parse_date_code(rawDate);
            rawDate = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
          } else if (rawDate instanceof Date) {
            rawDate = format(rawDate, 'yyyy-MM-dd');
          } else if (typeof rawDate === 'string') {
            // If it's a string like DD-MM-YYYY
            if (rawDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
              const [dd, mm, yyyy] = rawDate.split('-');
              rawDate = `${yyyy}-${mm}-${dd}`;
            }
          }
          
          // Strict Validation
          if (totalObtainedMarks !== null && Object.keys(marks).length > 0 && totalObtainedMarks !== calcObtained) {
            frontendErrors.push({
              index: rowIndex,
              examName: row['Exam Name'],
              status: 'FAILED',
              message: `Validation Error: Sum of subjects (${calcObtained}) does not match Total Obtained Marks (${totalObtainedMarks}).`,
              createdItems: []
            });
          } else if (!rawDate) {
             frontendErrors.push({
              index: rowIndex,
              examName: row['Exam Name'],
              status: 'FAILED',
              message: `Validation Error: Date is required.`,
              createdItems: []
            });
          } else {
            payload.push({
              originalIndex: rowIndex, // Keep track to merge reports
              examName: row['Exam Name'],
              examDate: rawDate,
              examType: eType,
              attendance: eStatus,
              totalMaxMarks,
              totalObtainedMarks,
              marks
            });
          }
          rowIndex++;
        });

        // send valid rows to backend
        let backendReports: any[] = [];
        if (payload.length > 0) {
          const res = await api.post(`/academic/students/${selectedStudentId}/marks/import`, payload);
          const report = res.data;
          
          // The backend returns rowReports which corresponds to the valid payload array.
          // Map original indexes back
          backendReports = report.rowReports.map((br: any, i: number) => ({
            ...br,
            index: payload[i].originalIndex
          }));
          
          toast(`Imported ${report.recordsAdded} records successfully.`, 'success');
        }

        // Combine reports and show modal
        const combinedReports = [...frontendErrors, ...backendReports].sort((a, b) => a.index - b.index);
        setImportSummary(combinedReports);
        
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
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ''; // Reset input
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Exam Name': 'JEE Mains Mock 1',
        'Date': '2024-05-15',
        'Exam Type': 'MAINS',
        'Attendance': 'PRESENT',
        'Total Max Marks': 300,
        'Total Obtained Marks': 263,
        'Physics': 85,
        'Chemistry': 90,
        'Mathematics': 88
      },
      {
        'Exam Name': 'Advanced Mock Test 1',
        'Date': '2024-06-20',
        'Exam Type': 'ADVANCED',
        'Attendance': 'ABSENT',
        'Total Max Marks': 360,
        'Total Obtained Marks': 0,
        'Physics': '',
        'Chemistry': '',
        'Mathematics': ''
      },
      {
        'Exam Name': 'Custom Test No Subjects',
        'Date': '2024-07-10',
        'Exam Type': 'OTHER',
        'Attendance': 'PRESENT',
        'Total Max Marks': 100,
        'Total Obtained Marks': 75
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
                    ...exams.map(ex => ({ value: ex.id, label: `${ex.name} (${format(new Date(String(ex.date).substring(0, 10).replace(/-/g, '/')), 'MMM dd, yyyy')})` }))
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
                            {exam?.examSubjects.length === 0 ? (
                              <TableCell colSpan={2} className="text-right flex gap-4 justify-end">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Obtained</label>
                                  <input
                                    type="number"
                                    disabled={sData.status === 'ABSENT'}
                                    value={sData.totalObtainedMarks === undefined || sData.totalObtainedMarks === null ? '' : sData.totalObtainedMarks}
                                    onChange={(e) => handleTotalChange(student.id, 'totalObtainedMarks', e.target.value)}
                                    className="w-20 border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none disabled:opacity-50"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Max</label>
                                  <input
                                    type="number"
                                    disabled={sData.status === 'ABSENT'}
                                    value={sData.totalMaxMarks === undefined || sData.totalMaxMarks === null ? '' : sData.totalMaxMarks}
                                    onChange={(e) => handleTotalChange(student.id, 'totalMaxMarks', e.target.value)}
                                    className="w-20 border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none disabled:opacity-50"
                                    placeholder="0"
                                  />
                                </div>
                              </TableCell>
                            ) : (
                              exam?.examSubjects.map(sub => (
                                <TableCell key={sub.subject.id} className="text-right">
                                  <input
                                    type="number"
                                    disabled={sData.status === 'ABSENT'}
                                    value={sData.marks[sub.subject.id] === undefined ? '' : sData.marks[sub.subject.id]}
                                    onChange={(e) => handleMarkChange(student.id, sub.subject.id, e.target.value)}
                                    className="w-24 ml-auto text-right border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none disabled:opacity-50"
                                    placeholder="0"
                                  />
                                </TableCell>
                              ))
                            )}
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
                  <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>Import Excel</Button>
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
                          {exam.examSubjects.length === 0 ? (
                            <>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Total Obtained</label>
                                <input
                                  type="number"
                                  disabled={eData.status === 'ABSENT'}
                                  value={eData.totalObtainedMarks === undefined || eData.totalObtainedMarks === null ? '' : eData.totalObtainedMarks}
                                  onChange={(e) => handleTotalChange(exam.id, 'totalObtainedMarks', e.target.value)}
                                  className="w-full text-right border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none disabled:opacity-50"
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Total Max</label>
                                <input
                                  type="number"
                                  disabled={eData.status === 'ABSENT'}
                                  value={eData.totalMaxMarks === undefined || eData.totalMaxMarks === null ? '' : eData.totalMaxMarks}
                                  onChange={(e) => handleTotalChange(exam.id, 'totalMaxMarks', e.target.value)}
                                  className="w-full text-right border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none disabled:opacity-50"
                                  placeholder="0"
                                />
                              </div>
                            </>
                          ) : (
                            exam.examSubjects.map(sub => (
                              <div key={sub.subject.id} className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">{sub.subject.name} (/{sub.maxMarks})</label>
                                <input
                                  type="number"
                                  disabled={eData.status === 'ABSENT'}
                                  value={eData.marks[sub.subject.id] === undefined ? '' : eData.marks[sub.subject.id]}
                                  onChange={(e) => handleMarkChange(exam.id, sub.subject.id, e.target.value)}
                                  className="w-full text-right border-2 border-yellow-500/50 hover:border-yellow-400 focus:border-yellow-400 bg-black/50 text-white font-bold rounded-md p-2 transition-colors outline-none disabled:opacity-50"
                                  placeholder="0"
                                />
                              </div>
                            ))
                          )}
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
      
      {importSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl rounded-xl border border-border shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-border/50">
              <div>
                <h3 className="text-xl font-bold text-white">Import Summary</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {importSummary.filter(r => r.status === 'SUCCESS').length} Successful, {importSummary.filter(r => r.status === 'FAILED').length} Failed
                </p>
              </div>
              <Button variant="ghost" onClick={() => setImportSummary(null)}>Close</Button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message / Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importSummary.map((row, idx) => (
                    <TableRow key={idx} className={row.status === 'SUCCESS' ? 'bg-green-500/5 hover:bg-green-500/10' : 'bg-red-500/5 hover:bg-red-500/10'}>
                      <TableCell className="font-mono text-muted-foreground text-xs">{row.index}</TableCell>
                      <TableCell className="font-medium">{row.examName || 'Unnamed'}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${row.status === 'SUCCESS' ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{row.message}</p>
                        {row.createdItems && row.createdItems.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold text-white/70">Auto-created:</span> {row.createdItems.join(', ')}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="p-6 border-t border-border/50 bg-black/20 flex justify-end rounded-b-xl">
              <Button onClick={() => setImportSummary(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border/50">
              <h3 className="text-xl font-bold text-white">Upload Historical Marks</h3>
              <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)}>Close</Button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center">
              <div 
                className={`w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-colors cursor-pointer relative ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary/50 bg-black/20'}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <svg className="w-12 h-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="text-lg font-medium text-white mb-1">Drag and drop your file here</p>
                <p className="text-sm text-muted-foreground text-center">or click to browse from your computer</p>
                <p className="text-xs text-muted-foreground mt-4">Supports .xlsx, .xls, .csv</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
