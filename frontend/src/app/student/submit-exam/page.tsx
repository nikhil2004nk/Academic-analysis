"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

export default function SubmitExamPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [existingExams, setExistingExams] = useState<any[]>([]);
  const [takenExamIds, setTakenExamIds] = useState<Set<string>>(new Set());
  
  const [activeTab, setActiveTab] = useState<'existing' | 'custom' | 'submissions'>('existing');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  const [isAbsent, setIsAbsent] = useState(false);
  
  const [formData, setFormData] = useState({
    examName: '',
    examDate: new Date().toISOString().split('T')[0],
    examType: 'OTHER',
    totalMaxMarks: 300,
    marks: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch subjects
    api.get('/academic/subjects?activeOnly=true')
      .then(res => setSubjects(res.data))
      .catch(err => alert('Failed to load subjects'));

    // Fetch existing exams
    api.get('/academic/exams')
      .then(res => setExistingExams(res.data))
      .catch(err => console.error('Failed to load existing exams'));
      
    // Fetch user's taken exams (to filter out)
    api.get(`/academic/students/${user.id}/submissions`)
      .then(res => {
        setSubmissions(res.data);
        const ids = new Set<string>();
        res.data.forEach((r: any) => {
          if (r.examId && r.approvalStatus !== 'REJECTED') ids.add(r.examId);
        });
        setTakenExamIds(ids);
      })
      .catch(err => console.error('Failed to load student submissions'));
  }, [user]);

  // Available exams are those that exist AND the student hasn't taken
  const availableExams = existingExams.filter(e => !takenExamIds.has(e.id));

  const handleExamSelect = (examId: string) => {
    setSelectedExamId(examId);
    if (examId) {
      const exam = existingExams.find(e => e.id === examId);
      if (exam) {
        const maxMarks = exam.examSubjects?.reduce((acc: number, curr: any) => acc + curr.maxMarks, 0) || 300;
        setFormData(prev => ({
          ...prev,
          examName: exam.name,
          examDate: exam.date.split('T')[0],
          examType: exam.type,
          totalMaxMarks: maxMarks
        }));
      }
    }
  };

  const handleTabChange = (tab: 'existing' | 'custom' | 'submissions') => {
    setActiveTab(tab);
    if (tab === 'custom') {
      setSelectedExamId('');
      setFormData(prev => ({
        ...prev,
        examName: '',
        examDate: new Date().toISOString().split('T')[0],
        examType: 'OTHER',
        totalMaxMarks: 300
      }));
    } else if (tab === 'existing') {
      setSelectedExamId(''); // reset selection
    } else if (tab === 'submissions') {
      // Refresh submissions
      api.get(`/academic/students/${user?.id}/submissions`).then(res => setSubmissions(res.data));
    }
  };

  const handleResubmit = (sub: any) => {
    // Fill form with the previous data
    const isCustom = sub.exam?.approvalStatus === 'REJECTED' || sub.exam?.approvalStatus === 'PENDING';
    setActiveTab(isCustom ? 'custom' : 'existing');
    
    if (!isCustom) {
      setSelectedExamId(sub.examId);
    } else {
      setSelectedExamId('');
    }
    
    setIsAbsent(sub.status === 'ABSENT');
    setFormData({
      examName: sub.exam?.name || '',
      examDate: sub.exam?.date ? sub.exam.date.split('T')[0] : new Date().toISOString().split('T')[0],
      examType: sub.exam?.type || 'OTHER',
      totalMaxMarks: sub.totalMaxMarks || 300,
      marks: sub.marks || {},
    });
  };

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
    if (isAbsent) return 0;
    return Object.values(formData.marks).reduce((acc, curr) => acc + curr, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Not logged in');
    
    if (activeTab === 'existing' && !selectedExamId) {
      return alert('Please select an exam first');
    }
    
    setLoading(true);
    try {
      const payload: any = {
        ...formData,
        status: isAbsent ? 'ABSENT' : 'PRESENT',
        totalObtainedMarks: calculateObtained()
      };
      
      if (activeTab === 'existing') {
        payload.examId = selectedExamId;
      }
      
      await api.post(`/academic/students/${user.id}/submit-exam`, payload);
      alert('Exam submitted successfully! Waiting for admin approval.');
      
      // Update local taken state
      if (activeTab === 'existing') {
        setTakenExamIds(prev => new Set([...prev, selectedExamId]));
      }
      
      setFormData({
        examName: '',
        examDate: new Date().toISOString().split('T')[0],
        examType: 'OTHER',
        totalMaxMarks: 300,
        marks: {},
      });
      setSelectedExamId('');
      setIsAbsent(false);
    } catch (error) {
      alert('Failed to submit exam');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const displayedSubjects = activeTab === 'custom' 
    ? subjects 
    : subjects.filter(s => existingExams.find(e => e.id === selectedExamId)?.examSubjects?.some((es: any) => es.subjectId === s.id));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Submit Exam Marks
          </CardTitle>
          <CardDescription>
            Submit your marks for a school exam or log a custom practice test.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TABS */}
          <div className="flex gap-4 mb-6 border-b border-border/50 pb-2 overflow-x-auto">
            <button 
              type="button"
              className={`font-semibold pb-2 transition-all whitespace-nowrap ${activeTab === 'existing' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => handleTabChange('existing')}
            >
              Select Existing Exam
            </button>
            <button 
              type="button"
              className={`font-semibold pb-2 transition-all whitespace-nowrap ${activeTab === 'custom' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => handleTabChange('custom')}
            >
              Create Custom Exam
            </button>
            <button 
              type="button"
              className={`font-semibold pb-2 transition-all whitespace-nowrap ${activeTab === 'submissions' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => handleTabChange('submissions')}
            >
              My Submissions
            </button>
          </div>

          {activeTab === 'submissions' ? (
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  You haven't submitted any exams yet.
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3 font-medium">Exam Name</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Score</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {submissions.map((sub: any) => (
                        <tr key={sub.id} className="bg-card hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            {sub.exam ? sub.exam.name : 'Unknown Exam'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {sub.exam ? new Date(sub.exam.date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {sub.status === 'ABSENT' ? (
                              <span className="text-red-500 font-medium text-xs">ABSENT</span>
                            ) : (
                              <span className="font-semibold">{sub.totalMarksObtained} <span className="text-muted-foreground font-normal">/ {sub.totalMaxMarks}</span></span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                              ${sub.approvalStatus === 'APPROVED' ? 'bg-green-500/10 text-green-500' : 
                                sub.approvalStatus === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 
                                'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}`}
                            >
                              {sub.approvalStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {sub.approvalStatus === 'REJECTED' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs h-8"
                                onClick={() => handleResubmit(sub)}
                              >
                                Edit & Resubmit
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'existing' && (
              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium">Select Official Exam</label>
                {availableExams.length === 0 ? (
                  <div className="p-4 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                    You have already submitted marks for all available exams! 🎉
                  </div>
                ) : (
                  <Select 
                    options={availableExams.map(exam => ({
                      label: `${exam.name} (${new Date(exam.date).toLocaleDateString()})`,
                      value: exam.id
                    }))}
                    value={selectedExamId}
                    onChange={(value: string) => handleExamSelect(value)}
                    placeholder="-- Select Exam --"
                  />
                )}
              </div>
            )}

            {(activeTab === 'custom' || (activeTab === 'existing' && selectedExamId)) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exam Name</label>
                    <Input 
                      required 
                      disabled={activeTab === 'existing'}
                      placeholder="e.g. Mock Test 1"
                      value={formData.examName}
                      onChange={e => setFormData({...formData, examName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <div className={activeTab === 'existing' ? 'opacity-50 pointer-events-none' : ''}>
                      <DatePicker 
                        required 
                        value={formData.examDate}
                        onChange={(value: string) => setFormData({...formData, examDate: value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exam Type</label>
                    <div className={activeTab === 'existing' ? 'opacity-50 pointer-events-none' : ''}>
                      <Select 
                        options={[
                          { label: 'JEE Mains', value: 'MAINS' },
                          { label: 'JEE Advanced', value: 'ADVANCED' },
                          { label: 'Other / Custom', value: 'OTHER' }
                        ]}
                        value={formData.examType}
                        onChange={(value: string) => setFormData({...formData, examType: value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Maximum Marks</label>
                    <Input 
                      type="number" 
                      required 
                      min="1"
                      disabled={activeTab === 'existing'}
                      value={formData.totalMaxMarks}
                      onChange={e => setFormData({...formData, totalMaxMarks: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Subject Marks</h3>
                    <label className="flex items-center space-x-2 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-all">
                      <input 
                        type="checkbox" 
                        className="rounded border-red-500 text-red-500 focus:ring-red-500 w-4 h-4 cursor-pointer"
                        checked={isAbsent}
                        onChange={(e) => setIsAbsent(e.target.checked)}
                      />
                      <span className="text-sm font-medium text-red-500">I was absent for this exam</span>
                    </label>
                  </div>

                  {!isAbsent && (
                    displayedSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subjects found for this exam.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {displayedSubjects.map(subject => (
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
                    )
                  )}
                  {isAbsent && (
                    <div className="p-4 text-center border border-dashed border-red-500/30 bg-red-500/5 rounded-lg">
                      <p className="text-red-500/80 text-sm">You are marking yourself as Absent. No marks will be recorded.</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-border/50 pt-4 mt-6">
                  <div className="text-sm text-muted-foreground">
                    Total Obtained: <span className="font-bold text-foreground">{calculateObtained()}</span> / {formData.totalMaxMarks}
                  </div>
                  <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all">
                    {loading ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                </div>
              </>
            )}
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
