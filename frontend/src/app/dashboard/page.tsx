"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function StudentDashboard({ userId }: { userId: string }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/academic/dashboard/student/${userId}`)
      .then(res => setResults(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="animate-pulse">Loading analytics...</div>;
  if (results.length === 0) return <div>No exam results available yet.</div>;

  // Process data for charts
  const chartData = results.map(r => {
    const dataPoint: any = {
      name: format(new Date(r.exam.date), 'MMM dd'),
      overall: r.percentage
    };
    r.subjectMarks.forEach((sm: any) => {
      dataPoint[sm.subject.name] = sm.marksObtained;
    });
    return dataPoint;
  });

  // Calculate insights
  const totalExams = results.length;
  const avgPercentage = results.reduce((acc, r) => acc + r.percentage, 0) / totalExams;
  const maxPercentage = Math.max(...results.map(r => r.percentage));
  
  // Best/Worst subject based on average marks
  const subjectTotals: Record<string, { total: number, count: number }> = {};
  results.forEach(r => {
    r.subjectMarks.forEach((sm: any) => {
      if (!subjectTotals[sm.subject.name]) subjectTotals[sm.subject.name] = { total: 0, count: 0 };
      subjectTotals[sm.subject.name].total += sm.marksObtained;
      subjectTotals[sm.subject.name].count += 1;
    });
  });

  let bestSubject = { name: '-', avg: -Infinity };
  let worstSubject = { name: '-', avg: Infinity };

  Object.entries(subjectTotals).forEach(([name, data]) => {
    const avg = data.total / data.count;
    if (avg > bestSubject.avg) bestSubject = { name, avg };
    if (avg < worstSubject.avg) worstSubject = { name, avg };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exams Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExams}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPercentage.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Strongest Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-300">{bestSubject.name}</div>
            <p className="text-xs text-green-400/80 mt-1">Avg: {bestSubject.avg.toFixed(1)} marks</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-400">Needs Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300">{worstSubject.name}</div>
            <p className="text-xs text-red-400/80 mt-1">Avg: {worstSubject.avg.toFixed(1)} marks</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Performance Progress (Overall %)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="overall" stroke="#3b82f6" strokeWidth={3} name="Overall Percentage" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Subject-wise Marks Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="Physics" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="Chemistry" stroke="#ec4899" strokeWidth={2} />
              <Line type="monotone" dataKey="Mathematics" stroke="#14b8a6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white text-glow">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back to the Academics portal, <span className="font-semibold text-primary">{user?.name}</span>.
        </p>
      </div>

      {user?.role === 'superadmin' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="animate-hover">
            <CardHeader>
              <CardTitle className="text-lg">Your Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary capitalize">{user?.role}</p>
            </CardContent>
          </Card>
          
          <Card className="animate-hover">
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <p className="text-xl font-bold text-white">All systems operational</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <StudentDashboard userId={user?.id || ''} />
      )}
    </div>
  );
}
