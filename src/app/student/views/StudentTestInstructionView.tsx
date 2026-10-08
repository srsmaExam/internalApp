import { notFound } from 'next/navigation';
import { and, asc, eq, sql } from 'drizzle-orm';
import { requireStudent } from '@/lib/auth';
import { getDb } from '@/db/client';
import { attempts, profiles, questions, testQuestions, tests } from '@/db/schema';
import { StudentChrome } from '../StudentChrome';
import { TestInstructionClient, type MarkingRule } from '../tests/[id]/TestInstructionClient';

export async function StudentTestInstructionView({ testId }: { testId: string }) {
  const session = await requireStudent();
  const db = await getDb();


  const [test] = await db
    .select({
      id: tests.id,
      title: tests.title,
      description: tests.description,
      durationS: tests.durationS,
      opensAt: tests.opensAt,
      closesAt: tests.closesAt,
      maxAttempts: tests.maxAttempts,
      isPublished: tests.isPublished,
      questionCount: sql<number>`cast(count(${testQuestions.questionId}) as int)`,
    })
    .from(tests)
    .leftJoin(testQuestions, eq(testQuestions.testId, tests.id))
    .where(eq(tests.id, testId))
    .groupBy(tests.id);

  if (!test || !test.isPublished) {
    notFound();
  }

  const assigned = await db
    .select({
      type: questions.type,
      subject: questions.subject,
      marksCorrect: testQuestions.marksCorrect,
      marksWrong: testQuestions.marksWrong,
      marksUnattempted: testQuestions.marksUnattempted,
    })
    .from(testQuestions)
    .innerJoin(questions, eq(questions.id, testQuestions.questionId))
    .where(eq(testQuestions.testId, testId))
    .orderBy(asc(testQuestions.position));

  const ruleMap = new Map<string, MarkingRule>();
  for (const row of assigned) {
    const correct = Number(row.marksCorrect);
    const wrong = Number(row.marksWrong);
    const unattempted = Number(row.marksUnattempted);
    const key = `${correct}|${wrong}|${unattempted}`;

    const existing = ruleMap.get(key);
    if (existing) {
      existing.questionCount += 1;
      if (!existing.types.includes(row.type)) existing.types.push(row.type);
    } else {
      ruleMap.set(key, { types: [row.type], correct, wrong, unattempted, questionCount: 1 });
    }
  }

  const subjectMap = new Map<string, number>();
  for (const row of assigned) {
    subjectMap.set(row.subject, (subjectMap.get(row.subject) ?? 0) + 1);
  }

  const subjectOrder: Record<string, number> = {
    maths: 1,
    physics: 2,
    chemistry: 3,
    biology: 4,
  };
  const subjectCounts = [...subjectMap.entries()]
    .sort(([a], [b]) => (subjectOrder[a] ?? 99) - (subjectOrder[b] ?? 99))
    .map(([subject, count]) => ({ subject, count }));

  const [{ attemptsUsed }] = await db
    .select({ attemptsUsed: sql<number>`cast(count(*) as int)` })
    .from(attempts)
    .where(and(eq(attempts.testId, testId), eq(attempts.studentId, session.userId)));

  return (
    <StudentChrome session={session}>
      <TestInstructionClient
        test={test}
        markingRules={[...ruleMap.values()]}
        subjectCounts={subjectCounts}
        attemptsUsed={attemptsUsed}
        studentName={session.fullName}
      />
    </StudentChrome>
  );
}
