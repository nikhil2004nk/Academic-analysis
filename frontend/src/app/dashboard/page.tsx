"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";

const PIE_COLORS = ['#22c55e', '#ef4444'];
const SUBJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', 
  '#10b981', '#6366f1', '#f43f5e', '#84cc16', '#06b6d4'
];

function StudentDashboard({ userId }: { userId: string }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedExamId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    api.get(`/academic/dashboard/student/${userId}`)
      .then(res => setResults(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="animate-pulse">Loading analytics...</div>;
  if (results.length === 0) return (
    <div className="text-muted-foreground p-8 text-center bg-white/5 rounded-lg border border-white/10">
      No exam results available yet. Check back later!
    </div>
  );

  // --- 1. Top Level Metrics & Attendance ---
  const totalExams = results.length;
  const presentExams = results.filter(r => r.status === 'PRESENT');
  const presentCount = presentExams.length;
  const absentCount = totalExams - presentCount;
  
  const attendanceRate = totalExams > 0 ? (presentCount / totalExams) * 100 : 0;
  
  const attendanceData = [
    { name: 'Present', value: presentCount },
    { name: 'Absent', value: absentCount }
  ];

  const overallAvgPercentage = presentCount > 0 
    ? presentExams.reduce((acc, r) => acc + r.percentage, 0) / presentCount 
    : 0;

  // --- 2. Subject-wise Analytics ---
  const subjectStats: Record<string, { totalObtained: number, totalMax: number, count: number }> = {};
  
  presentExams.forEach(r => {
    r.subjectMarks.forEach((sm: any) => {
      const subjectName = sm.subject.name;
      const examSubject = r.exam.examSubjects?.find((es: any) => es.subjectId === sm.subjectId);
      const maxMarks = examSubject ? examSubject.maxMarks : 100;

      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = { totalObtained: 0, totalMax: 0, count: 0 };
      }
      subjectStats[subjectName].totalObtained += sm.marksObtained;
      subjectStats[subjectName].totalMax += maxMarks;
      subjectStats[subjectName].count += 1;
    });
  });

  const subjectPerformance = Object.entries(subjectStats).map(([name, stats]) => {
    const percentage = stats.totalMax > 0 ? (stats.totalObtained / stats.totalMax) * 100 : 0;
    return {
      name,
      percentage: Number(percentage.toFixed(1)),
      avgMarks: Number((stats.totalObtained / stats.count).toFixed(1))
    };
  }).sort((a, b) => b.percentage - a.percentage);

  const bestSubject = subjectPerformance.length > 0 ? subjectPerformance[0] : { name: '-', percentage: 0 };
  const worstSubject = subjectPerformance.length > 0 ? subjectPerformance[subjectPerformance.length - 1] : { name: '-', percentage: 0 };

  const allSubjects = Object.keys(subjectStats);
  const subjectColorMap: Record<string, string> = {};
  allSubjects.forEach((sub, idx) => {
    subjectColorMap[sub] = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
  });

  // --- 3. Line Chart Data ---
  const lineChartData = results.map(r => {
    const dataPoint: any = {
      name: format(new Date(r.exam.date), 'MMM dd'),
      overall: r.percentage,
      _details: {
        examName: r.exam.name,
        overall: `${r.totalMarksObtained} / ${r.totalMaxMarks}`
      }
    };
    
    if (r.status === 'PRESENT') {
      r.subjectMarks.forEach((sm: any) => {
        const examSubject = r.exam.examSubjects?.find((es: any) => es.subjectId === sm.subjectId);
        const maxMarks = examSubject ? examSubject.maxMarks : 100;
        const subPercentage = maxMarks > 0 ? (sm.marksObtained / maxMarks) * 100 : 0;
        dataPoint[sm.subject.name] = Number(subPercentage.toFixed(1));
        dataPoint._details[sm.subject.name] = `${sm.marksObtained} / ${maxMarks}`;
      });
    }
    return dataPoint;
  });

  // Custom Tooltips
  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const details = payload[0].payload._details;
      return (
        <div className="bg-black/95 border border-white/20 p-3 rounded-md shadow-xl min-w-[200px]">
          <p className="font-bold text-white mb-1">{label}</p>
          {details?.examName && <p className="text-xs text-muted-foreground mb-3">{details.examName}</p>}
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
                </div>
                <div className="text-right pl-4">
                  <span className="text-white font-bold">{entry.value}%</span>
                  {details && details[entry.dataKey] && (
                    <span className="text-xs text-muted-foreground ml-2">({details[entry.dataKey]})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/95 border border-white/20 p-3 rounded-md shadow-xl min-w-[180px]">
          <p className="font-bold text-white mb-3 text-base">{label}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Avg Percentage:</span>
              <span className="text-white font-bold">{data.percentage}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Avg Marks:</span>
              <span className="text-yellow-500 font-bold">{data.avgMarks}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{attendanceRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{presentCount} Present, {absentCount} Absent</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{overallAvgPercentage.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Strongest Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-300 truncate" title={bestSubject.name}>{bestSubject.name}</div>
            <p className="text-xs text-green-400/80 mt-1">{bestSubject.percentage}% avg</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-400">Needs Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300 truncate" title={worstSubject.name}>{worstSubject.name}</div>
            <p className="text-xs text-red-400/80 mt-1">{worstSubject.percentage}% avg</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Attendance Pie Chart */}
        <Card className="bg-white/5 border-white/10 col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Attendance</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            {totalExams > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm">No attendance data</div>
            )}
          </CardContent>
        </Card>

        {/* Subject-wise Performance Bar Chart */}
        <Card className="bg-white/5 border-white/10 col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Subject Performance (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.7)', fontSize: 12}} />
                  <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.7)', fontSize: 12}} domain={[0, 100]} />
                  <RechartsTooltip content={<CustomBarTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                  <Bar dataKey="percentage" name="Average %" radius={[4, 4, 0, 0]}>
                    {subjectPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={subjectColorMap[entry.name] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No subject data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Detailed Progress Over Time (%)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.7)', fontSize: 12}} />
              <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} tick={{fill: 'rgba(255,255,255,0.7)', fontSize: 12}} />
              <RechartsTooltip content={<CustomLineTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="overall" stroke="#ffffff" strokeWidth={3} name="Overall Percentage" dot={{r: 4, fill: '#fff'}} />
              {allSubjects.map(sub => (
                <Line 
                  key={sub} 
                  type="monotone" 
                  dataKey={sub} 
                  stroke={subjectColorMap[sub]} 
                  strokeWidth={2} 
                  dot={{r: 3, fill: subjectColorMap[sub]}}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Exam Results Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Exam History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader className="bg-black/20">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-white/70">Exam Date</TableHead>
                  <TableHead className="text-white/70">Exam Name</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-right text-white/70">Marks</TableHead>
                  <TableHead className="text-right text-white/70">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <React.Fragment key={r.exam.id}>
                    <TableRow 
                      onClick={() => r.status === 'PRESENT' && toggleExpand(r.exam.id)}
                      className={`border-white/10 transition-colors ${r.status === 'PRESENT' ? 'cursor-pointer hover:bg-white/5' : ''} ${r.status === 'ABSENT' ? 'bg-red-500/5 hover:bg-red-500/10' : ''}`}
                    >
                      <TableCell className="w-10 text-muted-foreground">
                        {r.status === 'PRESENT' && (
                          expandedExamId === r.exam.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{format(new Date(r.exam.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">{r.exam.name}</TableCell>
                      <TableCell>
                        {r.status === 'PRESENT' 
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500">Present</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-500">Absent</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'PRESENT' ? (
                          <span className="font-semibold text-yellow-500/90">{r.totalMarksObtained} <span className="text-muted-foreground font-normal text-xs">/ {r.totalMaxMarks}</span></span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-white/90">
                        {r.status === 'PRESENT' ? `${r.percentage.toFixed(1)}%` : <span className="text-muted-foreground font-normal">N/A</span>}
                      </TableCell>
                    </TableRow>
                    
                    {expandedExamId === r.exam.id && r.status === 'PRESENT' && (
                      <TableRow className="bg-black/30 hover:bg-black/30 border-white/5">
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-4 pl-14">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Subject Breakdown</h4>
                            <div className="flex flex-wrap gap-4">
                              {r.subjectMarks.map((sm: any) => {
                                const examSubject = r.exam.examSubjects?.find((es: any) => es.subjectId === sm.subjectId);
                                const maxMarks = examSubject ? examSubject.maxMarks : 100;
                                const subPercentage = maxMarks > 0 ? (sm.marksObtained / maxMarks) * 100 : 0;
                                const color = subjectColorMap[sm.subject.name] || '#3b82f6';
                                
                                return (
                                  <div key={sm.subject.id} className="bg-white/5 border border-white/10 rounded-md p-3 min-w-[140px]">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                      <span className="text-sm font-medium text-white/90 truncate" title={sm.subject.name}>{sm.subject.name}</span>
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                      <span className="text-lg font-bold" style={{ color }}>{sm.marksObtained} <span className="text-xs text-muted-foreground font-normal">/ {maxMarks}</span></span>
                                      <span className="text-xs font-medium text-white/70 bg-black/40 px-1.5 py-0.5 rounded">{subPercentage.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
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
