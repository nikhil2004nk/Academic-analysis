"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function SubmitExamPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    examName: '',
    examDate: new Date().toISOString().split('T')[0],
    examType: 'OTHER',
    totalMaxMarks: 300,
    marks: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/academic/subjects?activeOnly=true')
      .then(res => setSubjects(res.data))
      .catch(err => alert('Failed to load subjects'));
  }, []);

  const handleMarkChange = (subjectId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      marks: {
        ...prev.marks,
        [subjectId]: value ? Number(value) : 0
      }
    }));
  };

  const calculateObtained = () => {
    return Object.values(formData.marks).reduce((acc, curr) => acc + curr, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Not logged in');
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        totalObtainedMarks: calculateObtained()
      };
      await api.post(`/academic/students/${user.id}/submit-exam`, payload);
      alert('Exam submitted successfully! Waiting for admin approval.');
      setFormData({
        examName: '',
        examDate: new Date().toISOString().split('T')[0],
        examType: 'OTHER',
        totalMaxMarks: 300,
        marks: {},
      });
    } catch (error) {
      alert('Failed to submit exam');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Submit Exam Marks
          </CardTitle>
          <CardDescription>
            Enter your custom or external exam marks. An admin will review and approve them before they appear on your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Exam Name</label>
                <Input 
                  required 
                  placeholder="e.g. Mock Test 1"
                  value={formData.examName}
                  onChange={e => setFormData({...formData, examName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input 
                  type="date" 
                  required 
                  value={formData.examDate}
                  onChange={e => setFormData({...formData, examDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Exam Type</label>
                <select 
                  className="flex h-11 w-full rounded-lg border border-border/50 bg-input/50 px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={formData.examType}
                  onChange={e => setFormData({...formData, examType: e.target.value})}
                >
                  <option value="MAINS">JEE Mains</option>
                  <option value="ADVANCED">JEE Advanced</option>
                  <option value="OTHER">Other / Custom</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Maximum Marks</label>
                <Input 
                  type="number" 
                  required 
                  min="1"
                  value={formData.totalMaxMarks}
                  onChange={e => setFormData({...formData, totalMaxMarks: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 mt-6">
              <h3 className="text-lg font-semibold mb-4">Subject Marks</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjects.map(subject => (
                  <div key={subject.id} className="space-y-2 bg-background/50 p-3 rounded-lg border border-border/30">
                    <label className="text-sm font-medium text-foreground/80">{subject.name}</label>
                    <Input 
                      type="number" 
                      placeholder="0"
                      value={formData.marks[subject.id] || ''}
                      onChange={e => handleMarkChange(subject.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-border/50 pt-4 mt-6">
              <div className="text-sm text-muted-foreground">
                Total Obtained: <span className="font-bold text-foreground">{calculateObtained()}</span> / {formData.totalMaxMarks}
              </div>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all">
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
