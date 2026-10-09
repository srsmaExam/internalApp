'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Eye,
  FileCheck,
  Layers,
  MapPin,
  Phone,
  RotateCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Card,
  Input,
  Select,
  Spinner,
  StatTile,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';

interface StudentRankingItem {
  studentId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  batch: string | null;
  classLevel: string | null;
  city: string | null;
  school: string | null;
  board: string | null;
  isProvisional: boolean;
  testsTaken: number;
  avgScore: number;
  avgPercentile: number | null;
  lastAttemptAt: string | null;
}

interface CohortData {
  enrollment: 'provisional' | 'enrolled' | 'all';
  metrics: {
    totalStudents: number;
    totalPublishedTests: number;
    totalAttemptsSubmitted: number;
    avgScore: number | null;
  };
  batchSummaries?: Array<{
    batch: string;
    studentCount: number;
    attemptCount: number;
    avgScore: number;
    avgPercentile: number | null;
  }>;
  studentRankings: StudentRankingItem[];
  weakChapters: Array<{
    chapter: string;
    subject: string;
    totalAnswers: number;
    correctAnswers: number;
    accuracyPct: number;
  }>;
}

export function TeacherCohortAnalyticsClient() {
  const [enrollmentTab, setEnrollmentTab] = useState<'provisional' | 'enrolled' | 'all'>('provisional');
  const [data, setData] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for leaderboard
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  async function loadData(enrollment: 'provisional' | 'enrolled' | 'all') {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics/cohort?enrollment=${enrollment}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed to load cohort analytics');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(enrollmentTab);
  }, [enrollmentTab]);

  // Derived batch options from loaded data
  const availableBatches = useMemo(() => {
    if (!data?.batchSummaries) return [];
    return data.batchSummaries.map((b) => b.batch).filter(Boolean);
  }, [data]);

  // Filtered leaderboard
  const filteredRankings = useMemo(() => {
    if (!data?.studentRankings) return [];
    return data.studentRankings.filter((s) => {
      if (selectedBatch && (s.batch || 'General') !== selectedBatch) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesPhone = s.phone?.toLowerCase().includes(q);
        const matchesCity = s.city?.toLowerCase().includes(q);
        const matchesSchool = s.school?.toLowerCase().includes(q);
        return Boolean(matchesName || matchesPhone || matchesCity || matchesSchool);
      }
      return true;
    });
  }, [data, search, selectedBatch]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Spinner className="size-8 text-brand-700 dark:text-brand-400" />
        <p className="text-sm font-medium">Aggregating cohort performance metrics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Alert tone="red" title="Error">
        {error}
      </Alert>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cohort Overview &amp; Insights
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Institution-wide student performance trends, ranking leaderboard, lead contact info, and chapter diagnostics.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadData(enrollmentTab)}
          disabled={loading}
        >
          <RotateCw className={`mr-1.5 size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Cohort Category Switcher Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setEnrollmentTab('provisional')}
          className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            enrollmentTab === 'provisional'
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Self-service phone-login leads and JEE Online Test candidates"
        >
          Prospective Leads
        </button>
        <button
          type="button"
          onClick={() => setEnrollmentTab('enrolled')}
          className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            enrollmentTab === 'enrolled'
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Enrolled batch roster students"
        >
          Enrolled Roster
        </button>
        <button
          type="button"
          onClick={() => setEnrollmentTab('all')}
          className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            enrollmentTab === 'all'
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="All candidates across prospective leads and enrolled students"
        >
          All Candidates
        </button>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={
              enrollmentTab === 'provisional'
                ? 'Prospective Leads'
                : enrollmentTab === 'enrolled'
                  ? 'Enrolled Students'
                  : 'Total Candidates'
            }
            value={data.metrics.totalStudents}
            tone="brand"
            subtext={
              enrollmentTab === 'provisional'
                ? 'Active prospective candidate accounts'
                : enrollmentTab === 'enrolled'
                  ? 'Active roster candidates'
                  : 'All registered candidates'
            }
            icon={<Users className="size-4" />}
          />
          <StatTile
            label="Published Tests"
            value={data.metrics.totalPublishedTests}
            tone="emerald"
            subtext="Available tests in repository"
            icon={<Layers className="size-4" />}
          />
          <StatTile
            label="Graded Attempts"
            value={data.metrics.totalAttemptsSubmitted}
            tone="amber"
            subtext="Completed exam submissions"
            icon={<Award className="size-4" />}
          />
          <StatTile
            label="Cohort Average"
            value={data.metrics.avgScore !== null ? `${data.metrics.avgScore} M` : '—'}
            tone="purple"
            subtext="Mean evaluated attempt score"
            icon={<Sparkles className="size-4" />}
          />
        </div>
      )}

      {/* Batch-Level Performance */}
      {data?.batchSummaries && data.batchSummaries.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Batch &amp; Class Performance</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Comparative metrics across student batches and grade levels.
            </p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch / Category</TableHead>
                  <TableHead>Candidate Count</TableHead>
                  <TableHead>Total Submissions</TableHead>
                  <TableHead>Average Score</TableHead>
                  <TableHead className="text-right">Average Percentile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.batchSummaries.map((b) => (
                  <TableRow key={b.batch}>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      <Badge tone={b.batch === 'Prospective' ? 'amber' : 'slate'}>{b.batch}</Badge>
                    </TableCell>
                    <TableCell className="tnum text-slate-600 dark:text-slate-400">{b.studentCount}</TableCell>
                    <TableCell className="tnum text-slate-600 dark:text-slate-400">{b.attemptCount}</TableCell>
                    <TableCell className="tnum font-bold text-brand-700 dark:text-brand-400">{b.avgScore} M</TableCell>
                    <TableCell className="tnum text-right font-medium text-slate-700 dark:text-slate-300">
                      {b.avgPercentile !== null ? `${b.avgPercentile} %ile` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Class-Wide Weak Chapters */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Class-Wide Priority Revision Chapters</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Chapters with lowest overall accuracy across candidate responses.
          </p>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Total Responses</TableHead>
                <TableHead>Correct Answers</TableHead>
                <TableHead>Accuracy %</TableHead>
                <TableHead className="text-right">Revision Urgency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.weakChapters && data.weakChapters.length > 0 ? (
                data.weakChapters.map((wc, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold uppercase text-slate-700 dark:text-slate-300">
                      <Badge
                        tone={
                          wc.subject === 'physics'
                            ? 'brand'
                            : wc.subject === 'chemistry'
                              ? 'green'
                              : wc.subject === 'maths'
                                ? 'amber'
                                : 'purple'
                        }
                      >
                        {wc.subject}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{wc.chapter}</TableCell>
                    <TableCell className="tnum text-slate-600 dark:text-slate-400">{wc.totalAnswers}</TableCell>
                    <TableCell className="tnum font-semibold text-emerald-700 dark:text-emerald-400">{wc.correctAnswers}</TableCell>
                    <TableCell className="tnum font-bold text-slate-900 dark:text-slate-100">{wc.accuracyPct}%</TableCell>
                    <TableCell className="text-right">
                      {wc.accuracyPct < 40 ? (
                        <Badge tone="red">Critical Revision</Badge>
                      ) : wc.accuracyPct < 60 ? (
                        <Badge tone="amber">Moderate Focus</Badge>
                      ) : (
                        <Badge tone="green">Good</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">
                    No chapter accuracy data recorded yet for this category.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Cohort Leaderboard */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Candidate Ranking &amp; Leaderboard</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Detailed candidate scores, contact numbers, and direct links to diagnostic evaluation reports.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing {filteredRankings.length} candidate{filteredRankings.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Search & Batch Filters */}
        <Card>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate name, phone, or city…"
                className="pl-9"
                aria-label="Search candidates"
              />
            </div>

            <Select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              aria-label="Filter by batch"
            >
              <option value="">All Batches / Classes ({data?.studentRankings?.length ?? 0})</option>
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Candidate &amp; Contact Info</TableHead>
                <TableHead>Batch / Class</TableHead>
                <TableHead>Tests Taken</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Percentile</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRankings.map((s, idx) => {
                const hasScore = s.testsTaken > 0;
                return (
                  <TableRow key={s.studentId}>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                      {hasScore ? (
                        idx === 0 ? (
                          <span className="tnum flex size-6 items-center justify-center rounded-full bg-amber-400 font-black text-slate-950">
                            1
                          </span>
                        ) : idx === 1 ? (
                          <span className="tnum flex size-6 items-center justify-center rounded-full bg-slate-300 font-black text-slate-900">
                            2
                          </span>
                        ) : idx === 2 ? (
                          <span className="tnum flex size-6 items-center justify-center rounded-full bg-amber-700 font-black text-white">
                            3
                          </span>
                        ) : (
                          <span className="tnum font-bold text-slate-700 dark:text-slate-300">#{idx + 1}</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/teacher/students/${s.studentId}/analytics`}
                        className="font-bold text-slate-900 hover:text-brand-600 hover:underline dark:text-slate-100 dark:hover:text-brand-400"
                        title="View Board Readiness Diagnostic Report"
                      >
                        {s.fullName}
                      </Link>

                      {s.phone ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-brand-700 dark:text-brand-300">
                            <Phone className="size-3" />
                            {s.phone}
                          </span>
                        </div>
                      ) : null}

                      {(s.city || s.school || s.board) && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="size-3 text-slate-400" />
                          <span>
                            {[s.city, s.school, s.board].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge tone={s.isProvisional ? 'amber' : 'brand'}>
                        {s.batch ?? 'General'}
                      </Badge>
                      {s.classLevel && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Class: {s.classLevel}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="tnum text-slate-600 dark:text-slate-400">
                      {s.testsTaken}
                      {s.lastAttemptAt && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(s.lastAttemptAt).toLocaleDateString()}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="tnum font-black text-brand-700 dark:text-brand-400">
                      {s.testsTaken > 0 ? `${s.avgScore} M` : '—'}
                    </TableCell>

                    <TableCell className="tnum font-bold text-accent-600 dark:text-accent-400">
                      {s.avgPercentile !== null ? `${s.avgPercentile} %ile` : '—'}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/teacher/students/${s.studentId}/analytics`}
                          className={buttonClass('primary', 'sm')}
                          title="Open Student's Diagnostic Board Readiness Report"
                        >
                          <Sparkles className="mr-1 size-3" />
                          <span>Report</span>
                        </Link>
                        <Link
                          href={`/teacher/students/${s.studentId}/responses`}
                          className={buttonClass('secondary', 'sm')}
                          title="Open Test Responses &amp; Submissions"
                        >
                          <FileCheck className="mr-1 size-3" />
                          <span>Responses</span>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredRankings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    {search || selectedBatch
                      ? 'No candidates match the filter criteria.'
                      : enrollmentTab === 'provisional'
                        ? 'No prospective leads found. Prospective leads register via the JEE Online Test phone login.'
                        : 'No student accounts found in this category.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
