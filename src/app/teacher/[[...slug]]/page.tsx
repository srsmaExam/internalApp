import { notFound } from 'next/navigation';
import { TeacherOverviewView } from '../views/TeacherOverviewView';
import { TeacherPapersView } from '../views/TeacherPapersView';
import { TeacherPaperIngestView } from '../views/TeacherPaperIngestView';
import { TeacherPaperVerifyView } from '../views/TeacherPaperVerifyView';
import { TeacherPaperMetadataView } from '../views/TeacherPaperMetadataView';
import { TeacherQuestionsView } from '../views/TeacherQuestionsView';
import { TeacherQuestionEditorView } from '../views/TeacherQuestionEditorView';
import { TeacherUploadQuestionsView } from '../views/TeacherUploadQuestionsView';
import { TeacherExtractionPromptView } from '../views/TeacherExtractionPromptView';
import { TeacherTestsView } from '../views/TeacherTestsView';
import { TeacherCreateTestView } from '../views/TeacherCreateTestView';
import { TeacherTestBuilderView } from '../views/TeacherTestBuilderView';
import { TeacherTestAnalyticsView } from '../views/TeacherTestAnalyticsView';
import { TeacherStudentsView } from '../views/TeacherStudentsView';
import { TeacherStudentDetailView } from '../views/TeacherStudentDetailView';
import { TeacherStudentAttemptView } from '../views/TeacherStudentAttemptView';
import { TeacherCohortAnalyticsView } from '../views/TeacherCohortAnalyticsView';
import { TeacherFeedbackView } from '../views/TeacherFeedbackView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length === 0) return { title: 'Overview | SRSMA Faculty' };
  if (slug[0] === 'papers') {
    if (slug.length === 3 && slug[2] === 'ingest') return { title: 'Ingest Questions & Solutions | SRSMA' };
    if (slug.length === 3 && slug[2] === 'verify') return { title: 'Verify Paper Questions | SRSMA' };
    if (slug.length === 3 && slug[2] === 'metadata') return { title: 'Paper Metadata & Profiling | SRSMA' };
    return { title: 'Papers | SRSMA' };
  }
  if (slug[0] === 'questions') {
    if (slug.length === 2 && slug[1] === 'upload') return { title: 'Upload Questions & Solutions | SRSMA' };
    if (slug.length === 2) return { title: 'Edit Question | SRSMA' };
    return { title: 'Question Bank | SRSMA' };
  }
  if (slug[0] === 'extraction-prompt') return { title: 'Extraction Prompts | SRSMA' };
  if (slug[0] === 'feedback') return { title: 'Student Feedback | SRSMA Faculty' };
  if (slug[0] === 'tests') {
    if (slug.length === 2 && slug[1] === 'new') return { title: 'Create New Test | SRSMA' };
    if (slug.length === 3 && slug[2] === 'analytics') return { title: 'Test Analytics | SRSMA' };
    if (slug.length === 2) return { title: 'Test Builder | SRSMA' };
    return { title: 'Tests | SRSMA' };
  }
  if (slug[0] === 'students') {
    if (slug.length >= 4 && slug[2] === 'attempts') return { title: 'Student Test Response | SRSMA' };
    if (slug.length >= 2) return { title: 'Student Profile & Analytics | SRSMA' };
    return { title: 'Students & Batches | SRSMA' };
  }
  if (slug[0] === 'attempts' && slug.length === 3 && slug[2] === 'result') {
    return { title: 'Student Test Response | SRSMA' };
  }
  if (slug[0] === 'analytics') return { title: 'Cohort Analytics | SRSMA' };
  return { title: 'Faculty Portal | SRSMA' };
}

export default async function TeacherPageDispatcher({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  // 1. /teacher -> Overview
  if (!slug || slug.length === 0) {
    return <TeacherOverviewView />;
  }

  // 2. /teacher/papers/*
  if (slug[0] === 'papers') {
    if (slug.length === 1) return <TeacherPapersView />;
    if (slug.length === 3 && slug[2] === 'ingest') return <TeacherPaperIngestView paperId={slug[1]} />;
    if (slug.length === 3 && slug[2] === 'verify') return <TeacherPaperVerifyView paperId={slug[1]} />;
    if (slug.length === 3 && slug[2] === 'metadata') return <TeacherPaperMetadataView paperId={slug[1]} />;
  }

  // 3. /teacher/questions/*
  if (slug[0] === 'questions') {
    if (slug.length === 1) return <TeacherQuestionsView />;
    if (slug.length === 2 && slug[1] === 'upload') return <TeacherUploadQuestionsView />;
    if (slug.length === 2) return <TeacherQuestionEditorView questionId={slug[1]} />;
  }

  // 4. /teacher/extraction-prompt
  if (slug.length === 1 && slug[0] === 'extraction-prompt') {
    return <TeacherExtractionPromptView />;
  }

  // 5. /teacher/feedback
  if (slug.length === 1 && slug[0] === 'feedback') {
    return <TeacherFeedbackView />;
  }

  // 6. /teacher/tests/*
  if (slug[0] === 'tests') {
    if (slug.length === 1) return <TeacherTestsView />;
    if (slug.length === 2 && slug[1] === 'new') return <TeacherCreateTestView />;
    if (slug.length === 3 && slug[2] === 'analytics') return <TeacherTestAnalyticsView testId={slug[1]} />;
    if (slug.length === 2) return <TeacherTestBuilderView testId={slug[1]} />;
  }

  // 7. /teacher/students/*
  if (slug[0] === 'students') {
    if (slug.length === 1) return <TeacherStudentsView />;
    if (slug.length === 2) return <TeacherStudentDetailView studentId={slug[1]} />;
    if (slug.length === 3 && slug[2] === 'responses') return <TeacherStudentDetailView studentId={slug[1]} initialTab="responses" />;
    if (slug.length === 4 && slug[2] === 'attempts') return <TeacherStudentAttemptView studentId={slug[1]} attemptId={slug[3]} />;
  }

  // 8. /teacher/attempts/:id/result
  if (slug[0] === 'attempts' && slug.length === 3 && slug[2] === 'result') {
    return <TeacherStudentAttemptView attemptId={slug[1]} />;
  }

  // 9. /teacher/analytics
  if (slug.length === 1 && slug[0] === 'analytics') {
    return <TeacherCohortAnalyticsView />;
  }

  notFound();
}
