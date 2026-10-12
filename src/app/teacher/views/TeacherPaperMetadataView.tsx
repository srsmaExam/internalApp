import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { papers, questions } from '@/db/schema';
import { requireTeacher } from '@/lib/auth';
import { PaperMetadataTable, type EditableQuestion } from '../papers/PaperMetadataTable';

export async function TeacherPaperMetadataView({ paperId }: { paperId: string }) {
  await requireTeacher();
  const db = await getDb();

  const [paper] = await db.select().from(papers).where(eq(papers.id, paperId));
  if (!paper) notFound();

  const rawQuestions = await db
    .select({
      id: questions.id,
      sourceQno: questions.sourceQno,
      subject: questions.subject,
      type: questions.type,
      body: questions.body,
      options: questions.options,
      answer: questions.answer,
      solution: questions.solution,
      humanCode: questions.humanCode,
      difficulty: questions.difficulty,
      expectedTimeS: questions.expectedTimeS,
      chapter: questions.chapter,
      topic: questions.topic,
      metadata: questions.metadata,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .where(eq(questions.paperId, paperId))
    .orderBy(asc(questions.sourceQno), asc(questions.createdAt));

  const initialQuestions: EditableQuestion[] = rawQuestions.map((q, idx) => ({
    paperId,
    questionId: q.id,
    position: q.sourceQno ?? idx + 1,
    subject: q.subject,
    type: q.type,
    body: q.body,
    options: q.options,
    answer: q.answer,
    solution: q.solution,
    humanCode: q.humanCode,
    difficulty: q.difficulty,
    expectedTimeS: q.expectedTimeS,
    chapter: q.chapter,
    topic: q.topic,
    metadata: q.metadata,
  }));

  return (
    <div className="space-y-6">
      <PaperMetadataTable
        paperId={paper.id}
        paperTitle={paper.title}
        paperCode={paper.code}
        initialQuestions={initialQuestions}
      />
    </div>
  );
}
