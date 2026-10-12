'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Gauge,
  Layers,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Card,
  CardBody,
  Dialog,
  Input,
  Select,
  Spinner,
  StatTile,
  useToast,
} from '@/components/ui';
import { QuestionBody } from '@/components/Katex';
import {
  generateMetadataExcel,
  generateSampleMetadataCsv,
  parseMetadataCsv,
  parseMetadataExcel,
  type ParsedMetadataRow,
} from '@/lib/metadata-csv';

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 ${className ?? ''}`}>
      {children}
    </label>
  );
}

const renderImg = (imgId: string) => (
  <span key={imgId} className="inline-block rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-500">
    [Figure: {imgId}]
  </span>
);

export type EditableQuestion = {
  paperId?: string | null;
  questionId: string;
  position: number;
  subject: string;
  type: string;
  body: string;
  options: any[];
  answer?: any;
  solution?: string | null;
  humanCode?: string | null;
  difficulty?: number | null;
  expectedTimeS?: number | null;
  chapter?: string | null;
  topic?: string | null;
  metadata?: any;
};

export type QuestionRowState = {
  testPaperId: string;
  questionType: string; // 'MCQ' | 'NVQ'
  topic: string;
  subTopic: string;
  difficultyGranular: number; // 1-10
  difficultyCategorical: string; // 'Easy' | 'Medium' | 'Hard'
  phase: number; // 1, 2, 3
  etaSeconds: number; // in seconds, e.g. 180
};

const COMMON_TOPICS = [
  '3D Geometry',
  'Vector Algebra',
  'Statistics',
  'Random Variables',
  'Calculus',
  'Coordinate Geometry',
  'Algebra',
  'Trigonometry',
];

export function PaperMetadataTable({
  paperId,
  paperTitle,
  paperCode,
  initialQuestions,
  onQuestionsUpdated,
}: {
  paperId: string;
  paperTitle?: string;
  paperCode?: string;
  initialQuestions: EditableQuestion[];
  onQuestionsUpdated?: (updated: EditableQuestion[]) => void;
}) {
  const { toast } = useToast();

  const defaultPaperId = paperCode || 'PT_01';

  // Helper to map a question to QuestionRowState
  const mapToRowState = (q: EditableQuestion): QuestionRowState => {
    const m = q.metadata || {};
    const granular =
      m.difficultyGranular != null
        ? Number(m.difficultyGranular)
        : q.difficulty != null && q.difficulty > 3
          ? q.difficulty
          : q.difficulty === 1
            ? 4
            : q.difficulty === 3
              ? 8
              : 7;

    const categorical =
      m.difficultyCategorical ||
      m.difficultyLabel ||
      (granular >= 8 ? 'Hard' : granular <= 4 ? 'Easy' : 'Medium');

    const phase =
      m.phase != null
        ? Number(m.phase)
        : granular >= 8
          ? 3
          : granular >= 6
            ? 2
            : 1;

    const eta =
      m.etaSeconds != null
        ? Number(m.etaSeconds)
        : q.expectedTimeS != null
          ? q.expectedTimeS
          : 180;

    const qType =
      m.questionType ||
      (q.type === 'integer' || q.type === 'nvq' ? 'NVQ' : 'MCQ');

    return {
      testPaperId: m.testPaperId || defaultPaperId,
      questionType: qType,
      topic: m.topic || q.topic || q.chapter || '',
      subTopic: m.subTopic || '',
      difficultyGranular: granular,
      difficultyCategorical: categorical,
      phase,
      etaSeconds: eta,
    };
  };

  // State
  const [rows, setRows] = useState<Record<string, QuestionRowState>>(() => {
    const initial: Record<string, QuestionRowState> = {};
    for (const q of initialQuestions) {
      initial[q.questionId] = mapToRowState(q);
    }
    return initial;
  });

  const [initialSnapshot, setInitialSnapshot] = useState<Record<string, QuestionRowState>>(() => {
    const initial: Record<string, QuestionRowState> = {};
    for (const q of initialQuestions) {
      initial[q.questionId] = mapToRowState(q);
    }
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [parsedUploadRows, setParsedUploadRows] = useState<ParsedMetadataRow[]>([]);
  const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; field: string; message: string }>>([]);
  const [uploadWarnings, setUploadWarnings] = useState<Array<{ row: number; field: string; message: string }>>([]);
  const [uploadedFileDetails, setUploadedFileDetails] = useState<{
    name: string;
    size: number;
    isExcel: boolean;
    sheetName?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute dirty questions
  const dirtyQuestionIds = useMemo(() => {
    const set = new Set<string>();
    for (const q of initialQuestions) {
      const current = rows[q.questionId];
      const initial = initialSnapshot[q.questionId];
      if (!current || !initial) continue;

      if (
        current.questionType !== initial.questionType ||
        current.topic !== initial.topic ||
        current.subTopic !== initial.subTopic ||
        current.difficultyGranular !== initial.difficultyGranular ||
        current.difficultyCategorical !== initial.difficultyCategorical ||
        current.phase !== initial.phase ||
        current.etaSeconds !== initial.etaSeconds
      ) {
        set.add(q.questionId);
      }
    }
    return set;
  }, [rows, initialSnapshot, initialQuestions]);

  const hasUnsavedChanges = dirtyQuestionIds.size > 0;

  // Filter questions for display
  const filteredQuestions = useMemo(() => {
    return initialQuestions.filter((q) => {
      const r = rows[q.questionId];
      if (!r) return true;

      if (filterType !== 'all' && r.questionType.toLowerCase() !== filterType.toLowerCase()) {
        return false;
      }

      if (filterPhase !== 'all' && String(r.phase) !== filterPhase) {
        return false;
      }

      if (filterDifficulty !== 'all' && r.difficultyCategorical.toLowerCase() !== filterDifficulty.toLowerCase()) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchQno = `q${q.position}`.includes(query) || String(q.position).includes(query);
        const matchPaperId = r.testPaperId.toLowerCase().includes(query);
        const matchTopic = r.topic.toLowerCase().includes(query);
        const matchSubTopic = r.subTopic.toLowerCase().includes(query);
        const matchType = r.questionType.toLowerCase().includes(query);

        if (!matchQno && !matchPaperId && !matchTopic && !matchSubTopic && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [initialQuestions, rows, filterType, filterPhase, filterDifficulty, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    let fullyProfiled = 0;
    let totalEta = 0;
    let totalGranular = 0;

    for (const q of initialQuestions) {
      const r = rows[q.questionId];
      if (!r) continue;

      totalEta += r.etaSeconds || 0;
      totalGranular += r.difficultyGranular || 0;

      if (r.topic && r.subTopic && r.difficultyGranular && r.phase && r.etaSeconds) {
        fullyProfiled++;
      }
    }

    const avgDifficulty = initialQuestions.length > 0 ? (totalGranular / initialQuestions.length).toFixed(1) : '0';

    return {
      total: initialQuestions.length,
      fullyProfiled,
      totalEta,
      avgDifficulty,
    };
  }, [initialQuestions, rows]);

  // Handle single cell edit
  const updateRowField = <K extends keyof QuestionRowState>(
    questionId: string,
    field: K,
    value: QuestionRowState[K],
  ) => {
    setRows((prev) => {
      const current = prev[questionId];
      if (!current) return prev;
      return {
        ...prev,
        [questionId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Reset unsaved edits
  const handleReset = () => {
    setRows({ ...initialSnapshot });
    toast.info('Discarded all unsaved changes.');
  };

  // Save changes to API
  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setSaving(true);
    try {
      const payloadQuestions = Array.from(dirtyQuestionIds).map((qid) => {
        const r = rows[qid];
        return {
          questionId: qid,
          topic: r.topic || null,
          chapter: r.topic || null,
          difficulty: r.difficultyGranular,
          expectedTimeS: r.etaSeconds,
          metadata: {
            testPaperId: r.testPaperId,
            questionType: r.questionType,
            topic: r.topic || null,
            subTopic: r.subTopic || null,
            difficultyGranular: r.difficultyGranular,
            difficultyCategorical: r.difficultyCategorical,
            phase: r.phase,
            etaSeconds: r.etaSeconds,
            difficultyLabel: r.difficultyCategorical,
            expectedTime: String(r.etaSeconds),
          },
        };
      });

      const res = await fetch(`/api/papers/${paperId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: payloadQuestions }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save question metadata');

      setInitialSnapshot({ ...rows });

      if (onQuestionsUpdated) {
        const updated = initialQuestions.map((q) => {
          const r = rows[q.questionId];
          if (!r) return q;
          return {
            ...q,
            topic: r.topic,
            chapter: r.topic,
            difficulty: r.difficultyGranular,
            expectedTimeS: r.etaSeconds,
            metadata: {
              ...(q.metadata || {}),
              testPaperId: r.testPaperId,
              questionType: r.questionType,
              topic: r.topic,
              subTopic: r.subTopic,
              difficultyGranular: r.difficultyGranular,
              difficultyCategorical: r.difficultyCategorical,
              phase: r.phase,
              etaSeconds: r.etaSeconds,
              difficultyLabel: r.difficultyCategorical,
              expectedTime: String(r.etaSeconds),
            },
          };
        });
        onQuestionsUpdated(updated);
      }

      toast.success(`Saved metadata for ${dirtyQuestionIds.size} question(s)!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Download Pre-filled or Sample CSV
  const handleDownloadTemplate = () => {
    const questionsToExport = initialQuestions.map((q) => {
      const r = rows[q.questionId];
      return {
        position: q.position,
        subject: q.subject,
        type: r ? r.questionType : q.type,
        chapter: r ? r.topic : q.chapter,
        topic: r ? r.topic : q.topic,
        difficulty: r ? r.difficultyGranular : q.difficulty,
        expectedTimeS: r ? r.etaSeconds : q.expectedTimeS,
        metadata: r
          ? {
              testPaperId: r.testPaperId,
              questionType: r.questionType,
              topic: r.topic,
              subTopic: r.subTopic,
              difficultyGranular: r.difficultyGranular,
              difficultyCategorical: r.difficultyCategorical,
              phase: r.phase,
              etaSeconds: r.etaSeconds,
            }
          : q.metadata,
      };
    });

    const csvContent = generateSampleMetadataCsv(questionsToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${paperCode || 'Paper'}_metadata.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded question metadata CSV template.');
  };

  // Download Pre-filled or Sample Excel (.xlsx)
  const handleDownloadExcel = () => {
    const questionsToExport = initialQuestions.map((q) => {
      const r = rows[q.questionId];
      return {
        position: q.position,
        subject: q.subject,
        type: r ? r.questionType : q.type,
        chapter: r ? r.topic : q.chapter,
        topic: r ? r.topic : q.topic,
        difficulty: r ? r.difficultyGranular : q.difficulty,
        expectedTimeS: r ? r.etaSeconds : q.expectedTimeS,
        metadata: r
          ? {
              testPaperId: r.testPaperId,
              questionType: r.questionType,
              topic: r.topic,
              subTopic: r.subTopic,
              difficultyGranular: r.difficultyGranular,
              difficultyCategorical: r.difficultyCategorical,
              phase: r.phase,
              etaSeconds: r.etaSeconds,
            }
          : q.metadata,
      };
    });

    const excelBytes = generateMetadataExcel(questionsToExport);
    const blob = new Blob([excelBytes as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${paperCode || 'Paper'}_metadata.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded question metadata Excel (.xlsx) spreadsheet.');
  };

  // Process text or excel file upload
  const handleProcessCsv = (content: string) => {
    const result = parseMetadataCsv(content);
    setParsedUploadRows(result.validRows);
    setUploadErrors(result.errors);
    setUploadWarnings(result.warnings);
  };

  const processSelectedFile = (file: File) => {
    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const buffer = evt.target?.result as ArrayBuffer;
        if (buffer) {
          const result = parseMetadataExcel(buffer);
          setUploadedFileDetails({
            name: file.name,
            size: file.size,
            isExcel: true,
            sheetName: result.sheetName,
          });
          setParsedUploadRows(result.validRows);
          setUploadErrors(result.errors);
          setUploadWarnings(result.warnings);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          setUploadText(text);
          const result = parseMetadataCsv(text);
          setUploadedFileDetails({
            name: file.name,
            size: file.size,
            isExcel: false,
          });
          setParsedUploadRows(result.validRows);
          setUploadErrors(result.errors);
          setUploadWarnings(result.warnings);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const openUploadModal = () => {
    setUploadModalOpen(true);
    setUploadErrors([]);
    setUploadWarnings([]);
    setParsedUploadRows([]);
    setUploadText('');
    setUploadedFileDetails(null);
    setShowPasteArea(false);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Apply parsed CSV / Excel rows to table state
  const handleApplyUpload = () => {
    if (parsedUploadRows.length === 0) return;

    let appliedCount = 0;
    const nextRows = { ...rows };

    const questionByPosition = new Map<number, EditableQuestion>();
    for (const q of initialQuestions) {
      questionByPosition.set(q.position, q);
    }

    for (const row of parsedUploadRows) {
      const matchedQ = questionByPosition.get(row.qno);
      if (!matchedQ) continue;

      const qid = matchedQ.questionId;
      const current = nextRows[qid];
      if (!current) continue;

      nextRows[qid] = {
        testPaperId: row.testPaperId || current.testPaperId,
        questionType: row.questionType || current.questionType,
        topic: row.topic !== undefined && row.topic !== null ? row.topic : current.topic,
        subTopic: row.subTopic !== undefined && row.subTopic !== null ? row.subTopic : current.subTopic,
        difficultyGranular:
          row.difficultyGranular != null ? Number(row.difficultyGranular) : current.difficultyGranular,
        difficultyCategorical: row.difficultyCategorical || current.difficultyCategorical,
        phase: row.phase != null ? Number(row.phase) : current.phase,
        etaSeconds: row.etaSeconds != null ? Number(row.etaSeconds) : current.etaSeconds,
      };
      appliedCount++;
    }

    setRows(nextRows);
    setUploadModalOpen(false);
    toast.success(`Applied metadata for ${appliedCount} question(s)! Click "Save Metadata" to commit.`);
  };

  // Open Preview Modal
  const openPreview = (questionPosition: number) => {
    const idx = initialQuestions.findIndex((q) => q.position === questionPosition);
    if (idx !== -1) {
      setPreviewIndex(idx);
      setPreviewOpen(true);
    }
  };

  const currentPreviewQ = initialQuestions[previewIndex];
  const currentPreviewRow = currentPreviewQ ? rows[currentPreviewQ.questionId] : null;

  return (
    <div className="space-y-4">
      {/* HTML Datalist for Topic Suggestions */}
      <datalist id="common-topics-list">
        {COMMON_TOPICS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {/* Top Banner & Action Controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/teacher/papers"
              className="mr-1 inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="mr-1 size-3.5" />
              Papers
            </Link>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {paperTitle ?? 'Paper'} Question Metadata &amp; Profiling
            </h2>
            {paperCode && <Badge tone="brand">{paperCode}</Badge>}
            {hasUnsavedChanges && (
              <Badge tone="amber" className="animate-pulse">
                {dirtyQuestionIds.size} unsaved change{dirtyQuestionIds.size === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Configure Topics, Sub-Topics, Granular Difficulty, Categorical Difficulty, Phase, and ETA for every question in this paper.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link to Split View */}
          <Link
            href={`/teacher/papers/${paperId}/verify`}
            className={buttonClass('secondary', 'sm')}
            title="Open Split View to verify text and images"
          >
            <Columns2 className="mr-1.5 size-3.5 text-slate-600 dark:text-slate-400" />
            Verify Studio
          </Link>

          {/* Download Excel (.xlsx) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadExcel}
            title="Download Excel spreadsheet (.xlsx) matching SampleReport.xlsx specification"
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
          >
            <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400" />
            Download Excel (.xlsx)
          </Button>

          {/* Download CSV */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadTemplate}
            title="Download CSV spreadsheet matching SampleReport.xlsx specification"
          >
            <Download className="mr-1.5 size-3.5 text-slate-600 dark:text-slate-400" />
            Download CSV
          </Button>

          {/* Bulk Upload Excel / CSV */}
          <Button
            variant="secondary"
            size="sm"
            onClick={openUploadModal}
            title="Upload completed Excel (.xlsx, .xls) or CSV spreadsheet"
          >
            <Upload className="mr-1.5 size-3.5 text-slate-600 dark:text-slate-400" />
            Upload Excel / CSV
          </Button>

          {/* Reset Changes Button */}
          {hasUnsavedChanges && (
            <Button variant="ghost" size="sm" onClick={handleReset} title="Discard unsaved edits">
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset
            </Button>
          )}

          {/* Save Button */}
          <Button
            variant="primary"
            size="sm"
            disabled={!hasUnsavedChanges || saving}
            onClick={handleSave}
            className="font-bold shadow-xs"
          >
            {saving ? (
              <>
                <Spinner className="mr-1.5 size-3.5" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-1.5 size-3.5" />
                Save Metadata {hasUnsavedChanges ? `(${dirtyQuestionIds.size})` : ''}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile
          label="Total Questions"
          value={stats.total}
          icon={<Layers className="size-4" />}
          tone="slate"
        />
        <StatTile
          label="Fully Profiled"
          value={`${stats.fullyProfiled} / ${stats.total}`}
          icon={<Sparkles className="size-4" />}
          tone={stats.fullyProfiled === stats.total ? 'emerald' : 'amber'}
        />
        <StatTile
          label="Avg Difficulty"
          value={`${stats.avgDifficulty} / 10`}
          icon={<Gauge className="size-4" />}
          tone="brand"
        />
        <StatTile
          label="Total Duration"
          value={`${Math.round(stats.totalEta / 60)} mins`}
          icon={<Clock className="size-4" />}
          tone="slate"
        />
        <StatTile
          label="Unsaved Edits"
          value={dirtyQuestionIds.size}
          icon={<AlertCircle className="size-4" />}
          tone={dirtyQuestionIds.size > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Q#, Topic, Sub-Topic, Paper ID..."
                  className="h-8.5 pl-8 text-xs"
                />
              </div>

              <div className="w-32">
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="h-8.5 text-xs py-1"
                >
                  <option value="all">All Types</option>
                  <option value="mcq">MCQ</option>
                  <option value="nvq">NVQ</option>
                </Select>
              </div>

              <div className="w-32">
                <Select
                  value={filterPhase}
                  onChange={(e) => setFilterPhase(e.target.value)}
                  className="h-8.5 text-xs py-1"
                >
                  <option value="all">All Phases</option>
                  <option value="1">Phase 1</option>
                  <option value="2">Phase 2</option>
                  <option value="3">Phase 3</option>
                </Select>
              </div>

              <div className="w-32">
                <Select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="h-8.5 text-xs py-1"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </div>

              {(searchQuery || filterType !== 'all' || filterPhase !== 'all' || filterDifficulty !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterPhase('all');
                    setFilterDifficulty('all');
                  }}
                  className="h-8.5 text-xs"
                >
                  <X className="mr-1 size-3" />
                  Clear
                </Button>
              )}
            </div>

            <div className="text-right text-xs text-slate-500">
              Showing <strong>{filteredQuestions.length}</strong> of {initialQuestions.length} questions
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 text-slate-700 shadow-2xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] shadow-r dark:bg-slate-800">
                  Q#
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[90px]">
                  Type
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[160px]">
                  Topic
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[180px]">
                  Sub-Topic
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[110px]">
                  Diff (Granular)
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">
                  Diff (Categorical)
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[90px]">
                  Phase
                </th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[105px]">
                  ETA (Seconds)
                </th>
                <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wider text-[11px] min-w-[45px]">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No questions matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => {
                  const r = rows[q.questionId];
                  if (!r) return null;
                  const isDirty = dirtyQuestionIds.has(q.questionId);

                  return (
                    <tr
                      key={q.questionId}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        isDirty ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Q# Sticky */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-bold text-slate-900 shadow-r dark:bg-slate-900 dark:text-slate-100">
                        <button
                          type="button"
                          onClick={() => openPreview(q.position)}
                          className="group inline-flex items-center gap-1 font-mono hover:text-brand-600 dark:hover:text-brand-400"
                          title="Click to preview question body & options"
                        >
                          <span>Q{q.position}</span>
                          <Eye className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* Question Type */}
                      <td className="px-3 py-2">
                        <select
                          value={r.questionType}
                          onChange={(e) => updateRowField(q.questionId, 'questionType', e.target.value)}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:border-brand-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="MCQ">MCQ</option>
                          <option value="NVQ">NVQ</option>
                        </select>
                      </td>

                      {/* Topic */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          list="common-topics-list"
                          value={r.topic}
                          onChange={(e) => updateRowField(q.questionId, 'topic', e.target.value)}
                          placeholder="e.g. 3D Geometry"
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-brand-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </td>

                      {/* Sub-Topic */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={r.subTopic}
                          onChange={(e) => updateRowField(q.questionId, 'subTopic', e.target.value)}
                          placeholder="e.g. Distance & Lines"
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-brand-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </td>

                      {/* Difficulty (Granular) (1-10) */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={r.difficultyGranular}
                            onChange={(e) => {
                              const val = Math.min(10, Math.max(1, Number(e.target.value) || 1));
                              updateRowField(q.questionId, 'difficultyGranular', val);
                              // Auto-update categorical difficulty if not manually tweaked
                              if (val >= 8) updateRowField(q.questionId, 'difficultyCategorical', 'Hard');
                              else if (val <= 4) updateRowField(q.questionId, 'difficultyCategorical', 'Easy');
                              else updateRowField(q.questionId, 'difficultyCategorical', 'Medium');
                            }}
                            className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-center font-bold text-xs text-slate-900 focus:border-brand-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <span className="text-[10px] text-slate-400">/10</span>
                        </div>
                      </td>

                      {/* Difficulty (Categorical) */}
                      <td className="px-3 py-2">
                        <select
                          value={r.difficultyCategorical}
                          onChange={(e) => updateRowField(q.questionId, 'difficultyCategorical', e.target.value)}
                          className={`w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-hidden ${
                            r.difficultyCategorical === 'Hard'
                              ? 'border-red-200 bg-red-50/50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                              : r.difficultyCategorical === 'Easy'
                                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </td>

                      {/* Phase (1, 2, 3) */}
                      <td className="px-3 py-2">
                        <select
                          value={r.phase}
                          onChange={(e) => updateRowField(q.questionId, 'phase', Number(e.target.value))}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:border-brand-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value={1}>Phase 1</option>
                          <option value={2}>Phase 2</option>
                          <option value={3}>Phase 3</option>
                        </select>
                      </td>

                      {/* ETA Seconds */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={15}
                            min={15}
                            max={600}
                            value={r.etaSeconds}
                            onChange={(e) => updateRowField(q.questionId, 'etaSeconds', Number(e.target.value) || 60)}
                            className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-center font-mono text-xs text-slate-900 focus:border-brand-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <span className="text-[10px] text-slate-400">s</span>
                        </div>
                      </td>

                      {/* View Action */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => openPreview(q.position)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Preview question and metadata"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload CSV / Excel Modal */}
      <Dialog
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Question Profiling Spreadsheet"
        size="2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Upload question metadata using an <strong>Excel (.xlsx, .xls)</strong> or <strong>CSV (.csv)</strong> spreadsheet.
            Matches columns: <strong>Question_Type</strong>, <strong>Topic</strong>,{' '}
            <strong>Sub_Topic</strong>, <strong>Difficulty_Granular</strong>, <strong>Difficulty_Categorical</strong>,{' '}
            <strong>Phase</strong>, and <strong>ETA_Seconds</strong>.
          </p>

          {/* Quick Template Download Actions */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Download templates:</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadExcel}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
              title="Download pre-filled Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400" />
              Excel Template (.xlsx)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadTemplate}
              title="Download pre-filled CSV spreadsheet (.csv)"
            >
              <Download className="mr-1.5 size-3.5 text-slate-600 dark:text-slate-400" />
              CSV Template (.csv)
            </Button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-950/20'
                : uploadedFileDetails
                  ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10'
                  : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-850'
            }`}
          >
            {uploadedFileDetails ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  {uploadedFileDetails.isExcel ? (
                    <FileSpreadsheet className="size-6" />
                  ) : (
                    <FileText className="size-6" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {uploadedFileDetails.name}
                    </span>
                    <Badge tone={uploadedFileDetails.isExcel ? 'green' : 'slate'}>
                      {uploadedFileDetails.isExcel ? 'Excel' : 'CSV'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(uploadedFileDetails.size / 1024).toFixed(1)} KB
                    {uploadedFileDetails.sheetName && ` • Sheet: "${uploadedFileDetails.sheetName}"`}
                    {parsedUploadRows.length > 0 && ` • ${parsedUploadRows.length} questions identified`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-1 text-xs"
                >
                  Choose a different file
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <UploadCloud className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Drag and drop your spreadsheet here, or <span className="text-brand-600 dark:text-brand-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Supports Microsoft Excel (<code>.xlsx</code>, <code>.xls</code>) and CSV (<code>.csv</code>)
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="green">.xlsx</Badge>
                  <Badge tone="slate">.xls</Badge>
                  <Badge tone="brand">.csv</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible raw CSV paste option */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5">
            <button
              type="button"
              onClick={() => setShowPasteArea((prev) => !prev)}
              className="flex w-full items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <span>Or paste raw CSV text directly</span>
              {showPasteArea ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
            {showPasteArea && (
              <div className="mt-2.5 space-y-1">
                <textarea
                  value={uploadText}
                  onChange={(e) => {
                    setUploadText(e.target.value);
                    handleProcessCsv(e.target.value);
                    if (e.target.value) {
                      setUploadedFileDetails({
                        name: 'Pasted CSV',
                        size: new Blob([e.target.value]).size,
                        isExcel: false,
                      });
                    }
                  }}
                  rows={4}
                  placeholder={`Question_Type,Topic,Sub_Topic,Difficulty_Granular,Difficulty_Categorical,Phase,ETA_Seconds\nMCQ,3D Geometry,Distance & Lines,7,Medium,2,180`}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs text-slate-900 focus:border-brand-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Validation Errors & Warnings */}
          {uploadErrors.length > 0 && (
            <Alert tone="red" title={`Found ${uploadErrors.length} format error(s)`}>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {uploadErrors.slice(0, 5).map((e, idx) => (
                  <li key={idx}>
                    Row {e.row}: {e.field} - {e.message}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {uploadWarnings.length > 0 && (
            <Alert tone="amber" title={`${uploadWarnings.length} warning(s)`}>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {uploadWarnings.slice(0, 3).map((w, idx) => (
                  <li key={idx}>
                    Row {w.row}: {w.message}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Parsed Rows Preview */}
          {parsedUploadRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="size-4" />
                  Successfully parsed {parsedUploadRows.length} question profiling row(s)
                </span>
                <span className="text-slate-500 text-[11px]">Ready to apply</span>
              </div>
              <div className="max-h-48 overflow-auto rounded border border-slate-200 dark:border-slate-700 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-2 py-1">Q#</th>
                      <th className="px-2 py-1">Type</th>
                      <th className="px-2 py-1">Topic</th>
                      <th className="px-2 py-1">Sub-Topic</th>
                      <th className="px-2 py-1">Granular</th>
                      <th className="px-2 py-1">Categorical</th>
                      <th className="px-2 py-1">Phase</th>
                      <th className="px-2 py-1">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedUploadRows.slice(0, 10).map((r) => (
                      <tr key={r.qno} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-2 py-1 font-bold">Q{r.qno}</td>
                        <td className="px-2 py-1">{r.questionType || '—'}</td>
                        <td className="px-2 py-1 font-medium">{r.topic || '—'}</td>
                        <td className="px-2 py-1 text-slate-500">{r.subTopic || '—'}</td>
                        <td className="px-2 py-1 text-center font-bold">{r.difficultyGranular ?? '—'}</td>
                        <td className="px-2 py-1">{r.difficultyCategorical || '—'}</td>
                        <td className="px-2 py-1">{r.phase ? `Phase ${r.phase}` : '—'}</td>
                        <td className="px-2 py-1 font-mono">{r.etaSeconds}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedUploadRows.length > 10 && (
                <p className="text-[11px] text-slate-400">
                  Showing first 10 of {parsedUploadRows.length} rows...
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={parsedUploadRows.length === 0 || uploadErrors.length > 0}
              onClick={handleApplyUpload}
            >
              Apply {parsedUploadRows.length} Questions to Table
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Question Preview Studio Modal */}
      <Dialog
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={
          currentPreviewQ
            ? `Q${currentPreviewQ.position}: Question Preview & Profiling`
            : 'Question Preview'
        }
        size="xl"
      >
        {currentPreviewQ && currentPreviewRow && (
          <div className="space-y-4">
            {/* Meta Tags Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="slate">
                {currentPreviewRow.questionType}
              </Badge>
              <Badge
                tone={
                  currentPreviewRow.difficultyCategorical === 'Hard'
                    ? 'red'
                    : currentPreviewRow.difficultyCategorical === 'Easy'
                      ? 'green'
                      : 'amber'
                }
              >
                {currentPreviewRow.difficultyCategorical} ({currentPreviewRow.difficultyGranular}/10)
              </Badge>
              <Badge tone="purple">Phase {currentPreviewRow.phase}</Badge>
              <Badge tone="slate">ETA {currentPreviewRow.etaSeconds}s</Badge>
            </div>

            {/* Topic & Sub-Topic Header */}
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {currentPreviewRow.topic || 'No topic'}
                {currentPreviewRow.subTopic && ` › ${currentPreviewRow.subTopic}`}
              </span>
            </div>

            {/* Question Body */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900">
              <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Question Text
              </h4>
              <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                <QuestionBody body={currentPreviewQ.body} renderImage={renderImg} />
              </div>

              {/* Options */}
              {Array.isArray(currentPreviewQ.options) && currentPreviewQ.options.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Options</h5>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {currentPreviewQ.options.map((opt: any) => {
                      const isCorrect =
                        currentPreviewQ.answer &&
                        (currentPreviewQ.answer.key === opt.key || currentPreviewQ.answer.value === opt.key);
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-start gap-2 rounded border px-2.5 py-1.5 text-xs ${
                            isCorrect
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold">{opt.key}.</span>
                          <span className="flex-1"><QuestionBody body={opt.body} renderImage={renderImg} /></span>
                          {isCorrect && <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Solution */}
              {currentPreviewQ.solution && (
                <div className="mt-3 rounded border border-emerald-100 bg-emerald-50/40 p-2 text-xs text-slate-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-slate-300">
                  <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">Worked Solution:</strong>
                  <QuestionBody body={currentPreviewQ.solution} renderImage={renderImg} />
                </div>
              )}
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                disabled={previewIndex === 0}
                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="mr-1 size-3.5" />
                Previous Question
              </Button>
              <span className="text-xs font-semibold text-slate-500">
                {previewIndex + 1} of {initialQuestions.length}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={previewIndex >= initialQuestions.length - 1}
                onClick={() => setPreviewIndex((i) => Math.min(initialQuestions.length - 1, i + 1))}
              >
                Next Question
                <ChevronRight className="ml-1 size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
