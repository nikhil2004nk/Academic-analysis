"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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

  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('MAINS');
  const [subjectMarks, setSubjectMarks] = useState<Record<string, number>>({});

  const fetchData = async () => {
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        api.get('/academic/exams'),
        api.get('/academic/subjects')
      ]);
      setExams(examsRes.data);
      setSubjects(subjectsRes.data);
      
      // Init subject marks (default 100)
      const initMarks: Record<string, number> = {};
      subjectsRes.data.forEach((sub: Subject) => {
        initMarks[sub.id] = 100;
      });
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

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        date,
        type,
        subjects: Object.entries(subjectMarks).map(([subjectId, maxMarks]) => ({
          subjectId,
          maxMarks: Number(maxMarks)
        }))
      };
      
      await api.post('/academic/exams', payload);
      // Reset form
      setName('');
      setDate('');
      fetchData();
      toast('Exam created successfully!', 'success');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create exam:', error);
      toast('Failed to create exam', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Exams Management</h2>
          <p className="text-muted-foreground">Create and manage JEE Mock Exams.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add Exam</Button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Exam">
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Name</label>
              <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AITS Mains Test 1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input required type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Exam Type</label>
              <Select value={type} onChange={value => setType(value)} options={[
                { value: 'MAINS', label: 'JEE Mains' },
                { value: 'ADVANCED', label: 'JEE Advanced' }
              ]} />
            </div>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-medium mb-3">Max Marks per Subject</h4>
            <div className="grid grid-cols-1 gap-4">
              {subjects.map(sub => (
                <div key={sub.id} className="space-y-2 flex items-center justify-between">
                  <label className="text-sm font-medium">{sub.name}</label>
                  <Input 
                    type="number" 
                    required
                    min={0}
                    className="w-24"
                    value={subjectMarks[sub.id] || ''} 
                    onChange={e => setSubjectMarks({...subjectMarks, [sub.id]: Number(e.target.value)})} 
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Card>
        <CardHeader>
          <CardTitle>Existing Exams</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <TableCell className="font-medium">{format(new Date(exam.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{exam.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${exam.type === 'MAINS' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {exam.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {exam.examSubjects.reduce((acc, curr) => acc + curr.maxMarks, 0)}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
