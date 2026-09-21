"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { format, subWeeks, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LabelList
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { Select } from "@/components/ui/select";
import { MonthPicker } from "@/components/ui/month-picker";
import { cn } from "@/lib/utils";

const PIE_COLORS = ['#22c55e', '#ef4444'];
const SUBJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
  '#10b981', '#6366f1', '#f43f5e', '#84cc16', '#06b6d4'
];

function StudentDashboard({ userId, headerContent }: { userId: string, headerContent: React.ReactNode }) {
  const [results, setResults] = useState<any[]>([]);
  const [typePerformance, setTypePerformance] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  type ModalType = 'attendance' | 'subject' | 'exam' | 'type' | null;
  const [modalData, setModalData] = useState<{ type: ModalType, title: string, payload: any } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedExamId(prev => prev === id ? null : id);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const [timeFilter, setTimeFilter] = useState<string>('all-time');
  const [customMonth, setCustomMonth] = useState<string>('');
  const [chartGrouping, setChartGrouping] = useState<string>('auto');

  useEffect(() => {
    let url = `/academic/dashboard/student/${userId}`;
    const params = new URLSearchParams();

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = now;

    if (timeFilter === 'last-week') {
      startDate = subWeeks(now, 1);
    } else if (timeFilter === 'last-month') {
      startDate = subMonths(now, 1);
    } else if (timeFilter === 'last-6-months') {
      startDate = subMonths(now, 6);
    } else if (timeFilter === 'custom-month' && customMonth) {
      const [year, month] = customMonth.split('-');
      if (year && month) {
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
      }
    }

    if (startDate && endDate && timeFilter !== 'all-time') {
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    setLoading(true);
    api.get(url)
      .then(res => {
        setResults(res.data.results);
        setTypePerformance(res.data.typePerformance);
        setAnalysis(res.data.analysis);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, timeFilter, customMonth]);

  if (loading) return <div className="animate-pulse">Loading analytics...</div>;

  const timeFilterOptions = [
    { label: 'All Time', value: 'all-time' },
    { label: 'Last Week', value: 'last-week' },
    { label: 'Last Month', value: 'last-month' },
    { label: 'Last 6 Months', value: 'last-6-months' },
    { label: 'Select Month', value: 'custom-month' }
  ];

  const filterUI = (
    <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
      <div className="w-[180px]">
        <Select 
          options={timeFilterOptions}
          value={timeFilter}
          onChange={(value) => setTimeFilter(value)}
        />
      </div>
      {timeFilter === 'custom-month' && (
        <MonthPicker 
          value={customMonth}
          onChange={(value) => setCustomMonth(value)}
        />
      )}
    </div>
  );

  if (results.length === 0) return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {headerContent}
        {filterUI}
      </div>
      <div className="text-muted-foreground p-8 text-center bg-white/5 rounded-lg border border-white/10">
        No exam results available for this time period.
      </div>
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

  let totalMarksObtained = 0;
  let totalMaxMarks = 0;
  presentExams.forEach(r => {
    totalMarksObtained += r.totalMarksObtained || 0;
    totalMaxMarks += r.totalMaxMarks || 0;
  });
  const overallAvgPercentage = totalMaxMarks > 0
    ? (totalMarksObtained / totalMaxMarks) * 100
    : 0;

  // --- 1.5 MoM Growth Indicator (from Backend) ---
  const momIndicator = analysis?.momIndicator;

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
  let groupFormat = 'MMM dd';
  if (chartGrouping === 'auto') {
    if (timeFilter === 'all-time' || timeFilter === 'last-6-months') {
      groupFormat = 'MMM yyyy';
    }
  } else if (chartGrouping === 'month') {
    groupFormat = 'MMM yyyy';
  } else if (chartGrouping === 'day') {
    groupFormat = 'MMM dd';
  }

  const groupedData: Record<string, {
    dateRaw: Date;
    totalMarksObtained: number;
    totalMaxMarks: number;
    examNames: string[];
    subjectStats: Record<string, { obtained: number; max: number }>;
  }> = {};

  results.forEach(r => {
    if (r.status !== 'PRESENT') return;
    
    const dateObj = new Date(r.exam.date);
    const key = format(dateObj, groupFormat);
    
    if (!groupedData[key]) {
      groupedData[key] = {
        dateRaw: dateObj,
        totalMarksObtained: 0,
        totalMaxMarks: 0,
        examNames: [],
        subjectStats: {}
      };
    }

    groupedData[key].totalMarksObtained += r.totalMarksObtained;
    groupedData[key].totalMaxMarks += r.totalMaxMarks;
    groupedData[key].examNames.push(r.exam.name);

    r.subjectMarks.forEach((sm: any) => {
      const examSubject = r.exam.examSubjects?.find((es: any) => es.subjectId === sm.subjectId);
      const maxMarks = examSubject ? examSubject.maxMarks : 100;
      
      if (!groupedData[key].subjectStats[sm.subject.name]) {
        groupedData[key].subjectStats[sm.subject.name] = { obtained: 0, max: 0 };
      }
      groupedData[key].subjectStats[sm.subject.name].obtained += sm.marksObtained;
      groupedData[key].subjectStats[sm.subject.name].max += maxMarks;
    });
  });

  const lineChartData = Object.entries(groupedData).map(([key, data]) => {
    const overallPct = data.totalMaxMarks > 0 ? (data.totalMarksObtained / data.totalMaxMarks) * 100 : 0;
    
    const dataPoint: any = {
      name: key,
      _dateRaw: data.dateRaw.getTime(),
      overall: Number(overallPct.toFixed(1)),
      _details: {
        examName: data.examNames.length > 2 ? `${data.examNames.length} Exams` : data.examNames.join(', '),
        overall: `${data.totalMarksObtained} / ${data.totalMaxMarks}`
      }
    };

    Object.entries(data.subjectStats).forEach(([subName, stats]) => {
      const subPct = stats.max > 0 ? (stats.obtained / stats.max) * 100 : 0;
      dataPoint[subName] = Number(subPct.toFixed(1));
      dataPoint._details[subName] = `${stats.obtained} / ${stats.max}`;
    });

    return dataPoint;
  });

  lineChartData.sort((a, b) => a._dateRaw - b._dateRaw);

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

  const CustomTypeTooltip = ({ active, payload, label }: any) => {
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
              <span className="text-muted-foreground">Exams Taken:</span>
              <span className="text-yellow-500 font-bold">{data.count}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const tableMonthStats: Record<string, { totalObtained: number; totalMax: number }> = {};
  results.forEach(r => {
    if (r.status === 'PRESENT') {
      const monthYear = format(new Date(r.exam.date), 'MMMM yyyy');
      if (!tableMonthStats[monthYear]) {
        tableMonthStats[monthYear] = { totalObtained: 0, totalMax: 0 };
      }
      tableMonthStats[monthYear].totalObtained += r.totalMarksObtained || 0;
      tableMonthStats[monthYear].totalMax += r.totalMaxMarks || 0;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {headerContent}
        {filterUI}
      </div>
      {/* Metrics Row */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setModalData({ type: 'attendance', title: 'Exam History', payload: 'all' })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Exams Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalExams}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setModalData({ type: 'attendance', title: 'Attendance Details', payload: 'attendance' })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-blue-400">{attendanceRate.toFixed(0)}%</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{presentCount} Present, {absentCount} Absent</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-xl md:text-2xl font-bold text-yellow-500">{overallAvgPercentage.toFixed(1)}%</div>
              {momIndicator && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  momIndicator.isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {momIndicator.isPositive ? '↑' : '↓'} {Math.abs(momIndicator.diff)}%
                </span>
              )}
            </div>
            {momIndicator && <p className="text-[10px] text-muted-foreground mt-1">vs prev month</p>}
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors" onClick={() => bestSubject.name !== '-' && setModalData({ type: 'subject', title: `${bestSubject.name} Details`, payload: bestSubject.name })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-400">Strongest Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base lg:text-lg font-bold text-green-300 leading-tight" title={bestSubject.name}>{bestSubject.name}</div>
            <p className="text-[10px] sm:text-xs text-green-400/80 mt-1">{bestSubject.percentage}% avg</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors" onClick={() => worstSubject.name !== '-' && setModalData({ type: 'subject', title: `${worstSubject.name} Details`, payload: worstSubject.name })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-400">Needs Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base lg:text-lg font-bold text-red-300 leading-tight" title={worstSubject.name}>{worstSubject.name}</div>
            <p className="text-[10px] sm:text-xs text-red-400/80 mt-1">{worstSubject.percentage}% avg</p>
          </CardContent>
        </Card>
      </div>

      {/* Exam Analysis Row */}
      {analysis && analysis.highestExam && (
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-yellow-400">Highest Scoring Exam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-yellow-300 truncate" title={analysis.highestExam.name}>{analysis.highestExam.name}</div>
                  <p className="text-[10px] sm:text-xs text-yellow-400/80 mt-0.5">{format(new Date(analysis.highestExam.date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-white">{analysis.highestExam.percentage}%</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{analysis.highestExam.marks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-400">Best Performing Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-blue-300 truncate" title={format(new Date(analysis.bestMonth.date), 'MMMM yyyy')}>{format(new Date(analysis.bestMonth.date), 'MMMM yyyy')}</div>
                  <p className="text-[10px] sm:text-xs text-blue-400/80 mt-0.5">Avg Performance</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-white">{analysis.bestMonth.percentage}%</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{analysis.bestMonth.marks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Lowest Scoring Exam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white/80 truncate" title={analysis.lowestExam.name}>{analysis.lowestExam.name}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{format(new Date(analysis.lowestExam.date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-white">{analysis.lowestExam.percentage}%</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{analysis.lowestExam.marks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                    onClick={() => setModalData({ type: 'attendance', title: 'Attendance Details', payload: 'attendance' })}
                    className="cursor-pointer"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => {
                      const total = presentCount + absentCount;
                      const percent = total > 0 ? (entry.payload.value / total) * 100 : 0;
                      return <span className="text-white text-sm ml-1">{value} - {percent.toFixed(0)}%</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm">No attendance data</div>
            )}
          </CardContent>
        </Card>

        {/* Exam Type Performance Bar Chart */}
        <Card className="bg-white/5 border-white/10 col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Type Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {typePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typePerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} domain={[0, 100]} />
                  <RechartsTooltip content={<CustomTypeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar
                    dataKey="percentage"
                    radius={[4, 4, 0, 0]}
                    onClick={(data: any) => setModalData({ type: 'type', title: `${data.name} Details`, payload: data.name })}
                    className="cursor-pointer"
                  >
                    <LabelList dataKey="percentage" position="top" fill="rgba(255,255,255,0.7)" fontSize={12} formatter={(val: any) => `${val}%`} />
                    {typePerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SUBJECT_COLORS[(index + 3) % SUBJECT_COLORS.length]} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No type data</div>
            )}
          </CardContent>
        </Card>

        {/* Subject-wise Performance Bar Chart */}
        <Card className="bg-white/5 border-white/10 col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Subject Performance (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} domain={[0, 100]} />
                  <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar
                    dataKey="percentage"
                    name="Average %"
                    radius={[4, 4, 0, 0]}
                    onClick={(data: any) => setModalData({ type: 'subject', title: `${data.name} Details`, payload: data.name })}
                    className="cursor-pointer"
                  >
                    <LabelList dataKey="percentage" position="top" fill="rgba(255,255,255,0.7)" fontSize={12} formatter={(val: any) => `${val}%`} />
                    {subjectPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={subjectColorMap[entry.name] || '#3b82f6'} className="cursor-pointer hover:opacity-80 transition-opacity" />
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Detailed Progress Over Time (%)</CardTitle>
          <div className="w-[140px]">
            <Select 
              options={[
                { label: 'Auto Grouping', value: 'auto' },
                { label: 'Day-wise', value: 'day' },
                { label: 'Month-wise', value: 'month' }
              ]}
              value={chartGrouping}
              onChange={(val) => setChartGrouping(val)}
            />
          </div>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.5)" 
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} 
                angle={-45}
                textAnchor="end"
                height={60}
                minTickGap={5}
              />
              <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
              <RechartsTooltip content={<CustomLineTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="overall" stroke="#ffffff" strokeWidth={3} name="Overall Percentage" dot={{ r: 4, fill: '#fff' }} />
              {allSubjects.map(sub => (
                <Line
                  key={sub}
                  type="monotone"
                  dataKey={sub}
                  stroke={subjectColorMap[sub]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: subjectColorMap[sub] }}
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
          <div className="rounded-md border border-white/10 overflow-x-auto w-full pb-2">
            <Table>
              <TableHeader className="bg-black/20">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-white/70 cursor-pointer select-none hover:text-white" onClick={() => handleSort('date')}>
                    <div className="flex items-center">Exam Date {sortColumn === 'date' ? (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}</div>
                  </TableHead>
                  <TableHead className="text-white/70 cursor-pointer select-none hover:text-white" onClick={() => handleSort('name')}>
                    <div className="flex items-center">Exam Name {sortColumn === 'name' ? (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}</div>
                  </TableHead>
                  <TableHead className="text-white/70 cursor-pointer select-none hover:text-white" onClick={() => handleSort('type')}>
                    <div className="flex items-center">Type {sortColumn === 'type' ? (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}</div>
                  </TableHead>
                  <TableHead className="text-white/70 cursor-pointer select-none hover:text-white" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Status {sortColumn === 'status' ? (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}</div>
                  </TableHead>
                  <TableHead className="text-right text-white/70 cursor-pointer select-none hover:text-white" onClick={() => handleSort('marks')}>
                    <div className="flex items-center justify-end">Marks {sortColumn === 'marks' ? (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}</div>
                  </TableHead>
                  <TableHead className="text-right text-white/70 cursor-pointer select-none hover:text-white" onClick={() => handleSort('percentage')}>
                    <div className="flex items-center justify-end">Percentage {sortColumn === 'percentage' ? (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...results].sort((a, b) => {
                  let comparison = 0;
                  switch (sortColumn) {
                    case 'date':
                      comparison = new Date(a.exam.date).getTime() - new Date(b.exam.date).getTime();
                      break;
                    case 'name':
                      comparison = a.exam.name.localeCompare(b.exam.name);
                      break;
                    case 'type':
                      comparison = (a.exam.type || '').localeCompare(b.exam.type || '');
                      break;
                    case 'status':
                      comparison = a.status.localeCompare(b.status);
                      break;
                    case 'marks':
                      comparison = (a.totalMarksObtained || 0) - (b.totalMarksObtained || 0);
                      break;
                    case 'percentage':
                      comparison = (a.percentage || 0) - (b.percentage || 0);
                      break;
                  }
                  return sortDirection === 'asc' ? comparison : -comparison;
                }).map((r, i, sorted) => {
                  const currentMonthYear = format(new Date(r.exam.date), 'MMMM yyyy');
                  const prevMonthYear = i > 0 ? format(new Date(sorted[i - 1].exam.date), 'MMMM yyyy') : null;
                  const showSeparator = sortColumn === 'date' && currentMonthYear !== prevMonthYear;

                  return (
                    <React.Fragment key={r.exam.id}>
                      {showSeparator && (
                        <TableRow className="bg-black/40 hover:bg-black/40 border-y border-white/10">
                          <TableCell colSpan={7} className="py-2 px-4 text-xs">
                            <div className="flex items-center gap-6">
                              <span className="font-semibold text-primary uppercase tracking-widest">{currentMonthYear}</span>
                              {tableMonthStats[currentMonthYear] && (
                                <div className="flex items-center gap-4 tracking-normal">
                                  <span className="text-yellow-500/90 font-semibold">{tableMonthStats[currentMonthYear].totalObtained} <span className="text-muted-foreground font-normal text-xs">/ {tableMonthStats[currentMonthYear].totalMax}</span></span>
                                  <span className="text-white/90 font-bold">{tableMonthStats[currentMonthYear].totalMax > 0 ? `${((tableMonthStats[currentMonthYear].totalObtained / tableMonthStats[currentMonthYear].totalMax) * 100).toFixed(1)}%` : '-'}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
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
                      <TableCell className="text-muted-foreground capitalize">{r.exam.type || 'Standard'}</TableCell>
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
                        <TableCell colSpan={7} className="p-0">
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Overlay */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">{modalData.title}</h2>
              <button
                onClick={() => setModalData(null)}
                className="text-muted-foreground hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Subject Detail View */}
              {modalData.type === 'subject' && (() => {
                const subName = modalData.payload;
                const relevantExams = presentExams.filter(e => e.subjectMarks.some((sm: any) => sm.subject.name === subName));

                return (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">Detailed breakdown for {subName} across all attended exams.</p>
                    <div className="space-y-2">
                      {relevantExams.map(exam => {
                        const sm = exam.subjectMarks.find((s: any) => s.subject.name === subName);
                        const examSubject = exam.exam.examSubjects?.find((es: any) => es.subjectId === sm.subjectId);
                        const max = examSubject ? examSubject.maxMarks : 100;
                        const pct = (sm.marksObtained / max) * 100;

                        return (
                          <div key={exam.id} className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/5">
                            <div>
                              <div className="font-medium text-white/90">{exam.exam.name}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(exam.exam.date), 'MMM dd, yyyy')}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-yellow-500">{sm.marksObtained} <span className="text-sm text-muted-foreground font-normal">/ {max}</span></div>
                              <div className="text-xs font-medium text-white/70">{pct.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Type Detail View */}
              {modalData.type === 'type' && (() => {
                const typeName = modalData.payload;
                const relevantExams = presentExams.filter(e => (e.exam.type || 'MAINS') === typeName);

                return (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">Detailed breakdown for {typeName} exams.</p>
                    <div className="space-y-2">
                      {relevantExams.map(exam => {
                        const pct = exam.totalMaxMarks > 0 ? (exam.totalMarksObtained / exam.totalMaxMarks) * 100 : 0;

                        return (
                          <div key={exam.id} className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/5">
                            <div>
                              <div className="font-medium text-white/90">{exam.exam.name}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(exam.exam.date), 'MMM dd, yyyy')}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-yellow-500">{exam.totalMarksObtained} <span className="text-sm text-muted-foreground font-normal">/ {exam.totalMaxMarks}</span></div>
                              <div className="text-xs font-medium text-white/70">{pct.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Attendance Detail View */}
              {modalData.type === 'attendance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Present Exams ({presentCount})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {presentExams.map(exam => (
                        <div key={exam.id} className="bg-white/5 p-3 rounded-md border border-white/5 text-sm">
                          <span className="font-medium">{exam.exam.name}</span>
                          <div className="text-xs text-muted-foreground mt-1">{format(new Date(exam.exam.date), 'MMM dd, yyyy')}</div>
                        </div>
                      ))}
                      {presentExams.length === 0 && <div className="text-sm text-muted-foreground">No records</div>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      Absent Exams ({absentCount})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {results.filter(r => r.status === 'ABSENT').map(exam => (
                        <div key={exam.id} className="bg-white/5 p-3 rounded-md border border-white/5 text-sm">
                          <span className="font-medium">{exam.exam.name}</span>
                          <div className="text-xs text-muted-foreground mt-1">{format(new Date(exam.exam.date), 'MMM dd, yyyy')}</div>
                        </div>
                      ))}
                      {absentCount === 0 && <div className="text-sm text-muted-foreground">No records</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboardWrapper({ user, headerContent }: { user: any, headerContent: React.ReactNode }) {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get('/users');
        const studentsList = res.data.filter((u: any) => u.role === 'student');
        setStudents(studentsList);
        if (studentsList.length > 0) {
          setSelectedStudentId(studentsList[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>;

  const adminHeaderContent = (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white text-glow">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back to the Academics portal, <span className="font-semibold text-primary">{user?.name || 'Admin'}</span>.
        </p>
      </div>
      <div className="w-full sm:w-80 mt-2">
        <label className="text-sm font-semibold text-white/90 mb-1.5 block">View Dashboard For Student:</label>
        <Select
          options={students.map(s => ({ value: s.id, label: `${s.name} (${s.email})` }))}
          value={selectedStudentId}
          onChange={setSelectedStudentId}
          placeholder="Select a student"
        />
      </div>
    </div>
  );

  if (!selectedStudentId) {
    return (
      <div className="space-y-6">
        {adminHeaderContent}
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            No students found in the system.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <StudentDashboard userId={selectedStudentId} headerContent={adminHeaderContent} />;
}

export default function Dashboard() {
  const { user } = useAuth();

  const headerContent = (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-white text-glow">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome back to the Academics portal, <span className="font-semibold text-primary">{user?.name || 'Student'}</span>.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {user?.role === 'superadmin' ? (
        <AdminDashboardWrapper user={user} headerContent={headerContent} />
      ) : (
        <StudentDashboard userId={user?.id || ''} headerContent={headerContent} />
      )}
    </div>
  );
}
