import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { papers, questions, testQuestions, tests } from '@/db/schema';
import { TestBuilderClient } from '../tests/[id]/TestBuilderClient';

export async function TeacherTestBuilderView({
  testId,
  initialTab,
}: {
  testId: string;
  initialTab?: 'questions' | 'picker' | 'settings';
}) {
  const db = await getDb();

  const [test] = await db.select().from(tests).where(eq(tests.id, testId));
  if (!test) notFound();

  // Load all registered papers for the picker filter
  const allPapers = await db
    .select({
      id: papers.id,
      title: papers.title,
      code: papers.code,
      examYear: papers.examYear,
    })
    .from(papers)
    .orderBy(desc(papers.createdAt));

  // Load all assigned questions for this test
  const assigned = await db
    .select({
      testId: testQuestions.testId,
      questionId: testQuestions.questionId,
      position: testQuestions.position,
      marksCorrect: testQuestions.marksCorrect,
      marksWrong: testQuestions.marksWrong,
      marksUnattempted: testQuestions.marksUnattempted,
      subject: questions.subject,
      type: questions.type,
      status: questions.status,
      body: questions.body,
      options: questions.options,
      humanCode: questions.humanCode,
      paperId: questions.paperId,
      paperTitle: papers.title,
      paperCode: papers.code,
      sourceQno: questions.sourceQno,
      sourcePage: questions.sourcePage,
      difficulty: questions.difficulty,
      expectedTimeS: questions.expectedTimeS,
      chapter: questions.chapter,
      topic: questions.topic,
      metadata: questions.metadata,
      answer: questions.answer,
      solution: questions.solution,
      updatedAt: questions.updatedAt,
    })
    .from(testQuestions)
    .innerJoin(questions, eq(questions.id, testQuestions.questionId))
    .leftJoin(papers, eq(questions.paperId, papers.id))
    .where(eq(testQuestions.testId, testId))
    .orderBy(testQuestions.position);

  // Load all available questions in bank for the picker
  const allBankQuestions = await db
    .select({
      id: questions.id,
      humanCode: questions.humanCode,
      paperId: questions.paperId,
      paperTitle: papers.title,
      paperCode: papers.code,
      sourceQno: questions.sourceQno,
      sourcePage: questions.sourcePage,
      subject: questions.subject,
      type: questions.type,
      status: questions.status,
      body: questions.body,
      options: questions.options,
      difficulty: questions.difficulty,
      expectedTimeS: questions.expectedTimeS,
      chapter: questions.chapter,
      topic: questions.topic,
      metadata: questions.metadata,
      answer: questions.answer,
      solution: questions.solution,
    })
    .from(questions)
    .leftJoin(papers, eq(questions.paperId, papers.id))
    .orderBy(desc(questions.createdAt));

  return (
    <TestBuilderClient
      initialTest={test}
      initialAssignedQuestions={assigned as any}
      allBankQuestions={allBankQuestions as any}
      papers={allPapers}
      initialTab={initialTab}
    />
  );
}
