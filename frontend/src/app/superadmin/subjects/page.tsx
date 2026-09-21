"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/modal';
import api from '@/lib/api';

interface Subject {
  id: string;
  name: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/academic/subjects');
      setSubjects(res.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId) {
        await api.post(`/academic/subjects/${editingId}`, { name });
        setEditingId(null);
      } else {
        await api.post('/academic/subjects', { name });
      }
      setName('');
      fetchSubjects();
      toast(editingId ? 'Subject updated successfully' : 'Subject created successfully', 'success');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save subject', error);
      toast('Failed to save subject', 'error');
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setName(subject.name);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? It may affect existing exams.')) return;
    try {
      await api.delete(`/academic/subjects/${id}`);
      fetchSubjects();
      toast('Subject deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete subject', error);
      toast('Failed to delete subject (It might be in use by an exam)', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Subjects Management</h2>
          <p className="text-muted-foreground">Manage the subjects available for exams.</p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setName('');
          setIsModalOpen(true);
        }}>Add Subject</Button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Subject' : 'Add New Subject'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject Name</label>
            <Input 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Biology" 
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Card>
        <CardHeader>
          <CardTitle>Existing Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No subjects found.</TableCell>
                </TableRow>
              ) : (
                subjects.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(sub)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(sub.id)}>
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
