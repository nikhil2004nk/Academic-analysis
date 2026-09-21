"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { format } from 'date-fns';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/modal';

interface Subject {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  name: string;
  date: string;
  type: string;
  examSubjects: {
    subject: Subject;
    maxMarks: number;
  }[];
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('MAINS');
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, boolean>>({});
  const [subjectMarks, setSubjectMarks] = useState<Record<string, number>>({});
  
  const [initialFormState, setInitialFormState] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const currentState = JSON.stringify({ name, date, type, selectedSubjects, subjectMarks });
    setIsDirty(currentState !== initialFormState);
  }, [name, date, type, selectedSubjects, subjectMarks, initialFormState]);

  const fetchData = async () => {
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        api.get('/academic/exams'),
        api.get('/academic/subjects?activeOnly=true')
      ]);
      setExams(examsRes.data);
      setSubjects(subjectsRes.data);
      // Init selected subjects and marks
      const initSelected: Record<string, boolean> = {};
      const initMarks: Record<string, number> = {};
      subjectsRes.data.forEach((sub: Subject) => {
        initSelected[sub.id] = true; // By default select all for new exams
        initMarks[sub.id] = 100;
      });
      setSelectedSubjects(initSelected);
      setSubjectMarks(initMarks);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName('');
    setDate('');
    setType('MAINS');
    setEditingExamId(null);
    const initSelected: Record<string, boolean> = {};
    const initMarks: Record<string, number> = {};
    subjects.forEach((sub: Subject) => {
      initSelected[sub.id] = true;
      initMarks[sub.id] = 100;
    });
    setSelectedSubjects(initSelected);
    setSubjectMarks(initMarks);
    setInitialFormState(JSON.stringify({ name: '', date: '', type: 'MAINS', selectedSubjects: initSelected, subjectMarks: initMarks }));
  };

  const handleEditClick = (exam: Exam) => {
    setEditingExamId(exam.id);
    setName(exam.name);
    setDate(String(exam.date).substring(0, 10));
    setType(exam.type);
    
    const newSelected: Record<string, boolean> = {};
    const newMarks: Record<string, number> = {};
    
    // First default all to false
    subjects.forEach(sub => {
      newSelected[sub.id] = false;
      newMarks[sub.id] = 100;
    });
    
    // Then set the actual ones
    exam.examSubjects?.forEach(es => {
      newSelected[es.subject.id] = true;
      newMarks[es.subject.id] = es.maxMarks;
    });
    
    setSelectedSubjects(newSelected);
    setSubjectMarks(newMarks);
    setInitialFormState(JSON.stringify({ name: exam.name, date: String(exam.date).substring(0, 10), type: exam.type, selectedSubjects: newSelected, subjectMarks: newMarks }));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        date,
        type,
        subjects: Object.keys(selectedSubjects)
          .filter(subjectId => selectedSubjects[subjectId])
          .map(subjectId => ({
            subjectId,
            maxMarks: Number(subjectMarks[subjectId] || 100)
          }))
      };
      
      if (editingExamId) {
        await api.put(`/academic/exams/${editingExamId}`, payload);
        toast('Exam updated successfully!', 'success');
      } else {
        await api.post('/academic/exams', payload);
        toast('Exam created successfully!', 'success');
      }
      
      resetForm();
      fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save exam:', error);
      toast('Failed to save exam', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Exams Management</h2>
          <p className="text-muted-foreground">Create and manage JEE Mock Exams.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full sm:w-auto">Add Exam</Button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { resetForm(); setIsModalOpen(false); }} 
        title={editingExamId ? "Edit Exam" : "Create New Exam"}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => { resetForm(); setIsModalOpen(false); }}>Cancel</Button>
            <Button type="submit" form="exam-form" disabled={!isDirty}>{editingExamId ? 'Update Exam' : 'Create Exam'}</Button>
          </div>
        }
      >
        <form id="exam-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Name</label>
              <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AITS Mains Test 1" />
            </div>
            <div className="space-y-2 relative">
              <label className="text-sm font-medium">Date</label>
              <DatePicker required value={date} onChange={setDate} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Exam Type</label>
              <Select value={type} onChange={value => setType(value)} options={[
                { value: 'MAINS', label: 'JEE Mains' },
                { value: 'ADVANCED', label: 'JEE Advanced' },
                { value: 'OTHER', label: 'Other' }
              ]} />
            </div>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-medium mb-3">Select Subjects & Max Marks</h4>
            <div className="grid grid-cols-1 gap-4">
              {subjects.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-black/20">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300"
                      checked={!!selectedSubjects[sub.id]}
                      onChange={(e) => setSelectedSubjects({...selectedSubjects, [sub.id]: e.target.checked})}
                    />
                    <label className="text-sm font-medium">{sub.name}</label>
                  </div>
                  {selectedSubjects[sub.id] && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Max:</label>
                      <Input 
                        type="number" 
                        required
                        min={0}
                        className="w-20 h-8"
                        value={subjectMarks[sub.id] === undefined ? '' : subjectMarks[sub.id]} 
                        onChange={e => setSubjectMarks({...subjectMarks, [sub.id]: Number(e.target.value)})} 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </form>
      </Modal>

      <Card>
        <CardHeader>
          <CardTitle>Existing Exams</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Max Marks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No exams created yet.</TableCell>
                </TableRow>
              ) : (
                exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{format(new Date(String(exam.date).substring(0, 10).replace(/-/g, '/')), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{exam.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${exam.type === 'MAINS' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {exam.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {exam.examSubjects && exam.examSubjects.length > 0 
                        ? exam.examSubjects.reduce((acc, curr) => acc + curr.maxMarks, 0) 
                        : <span className="text-muted-foreground text-xs italic">N/A (Custom)</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(exam)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => async function() {
                          if (confirm('Are you sure you want to delete this exam? All associated marks will also be deleted.')) {
                            try {
                              await api.delete(`/academic/exams/${exam.id}`);
                              fetchData();
                              toast('Exam deleted successfully', 'success');
                            } catch (error) {
                              console.error('Failed to delete exam', error);
                              toast('Failed to delete exam', 'error');
                            }
                          }
                        }()}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
