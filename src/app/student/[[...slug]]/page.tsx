import { notFound, redirect } from 'next/navigation';
import { StudentDashboardView } from '../views/StudentDashboardView';
import { StudentTestInstructionView } from '../views/StudentTestInstructionView';
import { StudentTestRunnerView } from '../views/StudentTestRunnerView';
import { StudentAttemptResultView } from '../views/StudentAttemptResultView';
import { StudentAboutView } from '../views/StudentAboutView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length === 0) return { title: 'My Tests | SRSMA' };
  if (slug[0] === 'about') return { title: 'About SRSMA | Shri Ram Smart Minds Academy' };
  if (slug[0] === 'tests') return { title: 'Test Instructions | SRSMA' };
  if (slug[0] === 'attempts' && slug[2] === 'result') return { title: 'Scorecard & Solutions | SRSMA' };
  if (slug[0] === 'attempts') return { title: 'Test Runner | SRSMA' };
  return { title: 'Student Portal | SRSMA' };
}

export default async function StudentPageDispatcher({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  // 1. /student -> Dashboard
  if (!slug || slug.length === 0) {
    return <StudentDashboardView />;
  }

  // 2. /student/analytics -> Redirect to dashboard
  if (slug.length === 1 && slug[0] === 'analytics') {
    redirect('/student');
  }

  // 3. /student/tests/[id]
  if (slug.length === 2 && slug[0] === 'tests') {
    return <StudentTestInstructionView testId={slug[1]} />;
  }

  // 4. /student/attempts/[id]
  if (slug.length === 2 && slug[0] === 'attempts') {
    return <StudentTestRunnerView attemptId={slug[1]} />;
  }

  // 5. /student/attempts/[id]/result
  if (slug.length === 3 && slug[0] === 'attempts' && slug[2] === 'result') {
    return <StudentAttemptResultView attemptId={slug[1]} />;
  }

  // 6. /student/about
  if (slug.length === 1 && slug[0] === 'about') {
    return <StudentAboutView />;
  }

  notFound();
}
