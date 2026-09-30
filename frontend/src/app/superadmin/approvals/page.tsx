"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/modal';

export default function ApprovalsPage() {
  const [pendingResults, setPendingResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic/approvals/pending');
      setPendingResults(res.data);
    } catch (error) {
      toast('Failed to load pending approvals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (resultId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.post(`/academic/approvals/${resultId}`, { status });
      toast(`Exam result ${status.toLowerCase()} successfully`, 'success');
      setPendingResults(prev => prev.filter(r => r.id !== resultId));
    } catch (error) {
      toast('Failed to update approval status', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/academic/approvals/${deletingId}`);
      toast('Request deleted successfully', 'success');
      setPendingResults(prev => prev.filter(r => r.id !== deletingId));
    } catch (error) {
      toast('Failed to delete request', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve exam marks submitted by students.
          </p>
        </div>
        <Button variant="outline" onClick={fetchApprovals}>Refresh List</Button>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Student</TableHead>
                <TableHead>Exam Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading pending submissions...
                  </TableCell>
                </TableRow>
              ) : pendingResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-lg font-medium">All Caught Up!</p>
                      <p className="text-sm text-muted-foreground">There are no pending exam submissions to review.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pendingResults.map((result) => (
                  <TableRow key={result.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="font-medium">{result.student?.name}</div>
                      <div className="text-xs text-muted-foreground">{result.student?.email}</div>
                    </TableCell>
                    <TableCell className="font-medium">{result.exam?.name}</TableCell>
                    <TableCell>{new Date(result.exam?.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border bg-background">
                        {result.exam?.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{result.totalMarksObtained}</span>
                        <span className="text-muted-foreground">/ {result.totalMaxMarks}</span>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                          {Number(result.percentage).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleAction(result.id, 'REJECTED')}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
                          onClick={() => handleAction(result.id, 'APPROVED')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 ml-2"
                          onClick={() => setDeletingId(result.id)}
                          title="Delete Request Entirely"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Request"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to completely delete this request? This action cannot be undone and will permanently remove the exam and marks from the database.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
