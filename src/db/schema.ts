/**
 * Typed Drizzle mirror of drizzle/0000_init.sql.
 *
 * The SQL file is the source of truth — this exists so queries are typed. If you
 * change one, change the other. Nothing here creates tables.
 */
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['teacher', 'student']);
export const subjectEnum = pgEnum('subject_enum', ['physics', 'chemistry', 'maths', 'biology']);
export const qtypeEnum = pgEnum('qtype_enum', ['mcq', 'integer']);
export const qstatusEnum = pgEnum('qstatus_enum', ['draft', 'verified', 'archived']);
export const attemptStatus = pgEnum('attempt_status', [
  'in_progress',
  'submitted',
  'auto_submitted',
  'abandoned',
]);
export const answerState = pgEnum('answer_state', [
  'not_seen',
  'seen_unanswered',
  'answered',
  'answered_flagged',
  'flagged_unanswered',
]);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRole('role').notNull().default('student'),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  batch: text('batch'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  username: text('username').notNull().unique(),
  // FBR-05: enforced in the DB by the partial unique index `profiles_phone_idx`
  // (drizzle/0004_add_phone.sql — `WHERE phone IS NOT NULL`, so multiple NULLs
  // are allowed). `.unique()` here is documentation only — this file creates
  // no tables — but it was previously absent, which is exactly why nobody
  // noticed the DB already had a real constraint. That constraint only
  // catches an *exact* duplicate string, though: "+919876543210",
  // "919876543210" and "9876543210" are three different strings for the same
  // real number and can all exist as separate rows. Every write path MUST
  // normalize through normalizePhone() before it reaches this column, or the
  // index gives false confidence.
  phone: text('phone').unique(),
  passwordHash: text('password_hash'),
  canLogin: boolean('can_login').notNull().default(true),
  // FBR-03: true for self-service accounts auto-provisioned by phone login
  // (e.g. the JEE Online Test funnel) until a teacher converts them
  // to a real enrolled student. Provisional accounts can only see/attempt
  // tests.audience = 'public' and never receive answer keys or solutions.
  isProvisional: boolean('is_provisional').notNull().default(false),
  city: text('city'),
  board: text('board'),
  whatsappConsent: boolean('whatsapp_consent').notNull().default(false),
  classLevel: text('class_level'),
  gender: text('gender'),
  school: text('school'),
  whatsappContactClicked: boolean('whatsapp_contact_clicked').notNull().default(false),
  whatsappEnrollClicked: boolean('whatsapp_enroll_clicked').notNull().default(false),
  phoneVerified: boolean('phone_verified').notNull().default(false),
});

export const papers = pgTable('papers', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  code: text('code').notNull().unique(),
  examYear: integer('exam_year'),
  pdfPages: integer('pdf_pages'),
  registeredBy: uuid('registered_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  filePath: text('file_path').notNull(),
  originalFilename: text('original_filename').notNull(),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
  sha256: text('sha256').notNull().unique(),
  extractionMeta: jsonb('extraction_meta').$type<ExtractionMeta | null>(),
});

export type ExtractionMeta = {
  promptVersion?: string;
  model?: string;
  extractedAt?: string;
  detectedTitle?: string | null;
  totalQuestionsFound?: number;
};

export type QuestionOption = { key: string; body: string };

/** Exact key (MCQ), exact value, or a tolerance range (integer). LLD §4.4. */
export type QuestionAnswer =
  | { key: string }
  | { value: number }
  | { min: number; max: number };

export type QuestionMetadata = {
  primarySkill?: string | null;
  secondarySkill?: string | null;
  cognitiveLevel?: string | null;
  conceptTested?: string | null;
  prerequisiteConcept?: string | null;
  questionStructure?: string | null;
  visualDependency?: string | null;
  calculationIntensity?: string | null;
  expectedTime?: string | null; // e.g. "45,60" for 45-60 seconds
  diagnosticWeight?: number | null;
  difficultyLabel?: string | null; // e.g. "Easy", "Medium", "Difficult"
  [key: string]: unknown;
};

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    humanCode: text('human_code').unique(),
    paperId: uuid('paper_id').references(() => papers.id, { onDelete: 'set null' }),
    sourceQno: integer('source_qno'),
    sourcePage: integer('source_page'),

    subject: subjectEnum('subject').notNull(),
    type: qtypeEnum('type').notNull(),
    status: qstatusEnum('status').notNull().default('draft'),

    body: text('body').notNull(),
    options: jsonb('options').$type<QuestionOption[]>().notNull().default([]),
    answer: jsonb('answer').$type<QuestionAnswer | null>(),
    solution: text('solution'),

    difficulty: smallint('difficulty'),
    expectedTimeS: integer('expected_time_s'),
    topic: text('topic'),
    chapter: text('chapter'),

    metadata: jsonb('metadata').$type<QuestionMetadata | null>(),
    extractionNotes: jsonb('extraction_notes').$type<{ uncertain?: string[] } | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => profiles.id),
    lastEditedBy: uuid('last_edited_by').references(() => profiles.id),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => profiles.id),
    solutionVerifiedAt: timestamp('solution_verified_at', { withTimezone: true }),
    solutionVerifiedBy: uuid('solution_verified_by').references(() => profiles.id),
  },
  (t) => [
    index('questions_subject_status_idx').on(t.subject, t.status),
    index('questions_chapter_topic_idx').on(t.chapter, t.topic),
    index('questions_difficulty_idx').on(t.difficulty),
    index('questions_paper_idx').on(t.paperId, t.sourceQno),
    index('questions_paper_sol_verif_idx').on(t.paperId, t.solutionVerifiedAt),
  ],
);

export type CropRect = { x: number; y: number; w: number; h: number };

export const questionImages = pgTable(
  'question_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    placeholderId: text('placeholder_id').notNull(),
    storagePath: text('storage_path').notNull(),
    altText: text('alt_text'),
    widthPx: integer('width_px'),
    heightPx: integer('height_px'),
    sourcePage: integer('source_page'),
    cropRect: jsonb('crop_rect').$type<CropRect | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('question_images_q_placeholder').on(t.questionId, t.placeholderId)],
);

export const questionRevisions = pgTable(
  'question_revisions',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    editedBy: uuid('edited_by').references(() => profiles.id),
    editedAt: timestamp('edited_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.revision] })],
);

export const tests = pgTable('tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  durationS: integer('duration_s').notNull(),
  opensAt: timestamp('opens_at', { withTimezone: true }),
  closesAt: timestamp('closes_at', { withTimezone: true }),
  maxAttempts: integer('max_attempts').notNull().default(1),
  shuffleQuestions: boolean('shuffle_questions').notNull().default(false),
  shuffleOptions: boolean('shuffle_options').notNull().default(false),
  resultsPolicy: text('results_policy').$type<'immediate' | 'on_release'>().notNull().default('immediate'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  isPublished: boolean('is_published').notNull().default(false),
  // FBR-03: 'enrolled' (default) tests are invisible to provisional accounts;
  // 'public' tests (the JEE Online Test diagnostic) are the only
  // ones a self-service phone-login account may see or attempt.
  audience: text('audience').$type<'enrolled' | 'public'>().notNull().default('enrolled'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const testQuestions = pgTable(
  'test_questions',
  {
    testId: uuid('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    marksCorrect: numeric('marks_correct', { precision: 5, scale: 2 }).notNull().default('4'),
    marksWrong: numeric('marks_wrong', { precision: 5, scale: 2 }).notNull().default('-1'),
    marksUnattempted: numeric('marks_unattempted', { precision: 5, scale: 2 }).notNull().default('0'),
  },
  (t) => [
    primaryKey({ columns: [t.testId, t.questionId] }),
    unique('test_questions_position').on(t.testId, t.position),
  ],
);

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id')
      .notNull()
      .references(() => tests.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id),
    attemptNo: integer('attempt_no').notNull().default(1),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    status: attemptStatus('status').notNull().default('in_progress'),
    questionOrder: uuid('question_order').array().notNull(),
    optionOrders: jsonb('option_orders').$type<Record<string, string[]>>().notNull().default({}),
    totalMarks: numeric('total_marks', { precision: 7, scale: 2 }),
    maxMarks: numeric('max_marks', { precision: 7, scale: 2 }),
    totalTimeS: integer('total_time_s'),
    timeExtensionsCount: integer('time_extensions_count').notNull().default(0),
    solveOrder: uuid('solve_order').array(),
  },
  (t) => [unique('attempts_unique').on(t.testId, t.studentId, t.attemptNo)],
);

export type AnswerModificationItem = {
  from?: { key?: string; value?: number | string } | null;
  to?: { key?: string; value?: number | string } | null;
  elapsedMs: number;
  isAfter15s: boolean;
  timestamp: string;
};

export type AnswerModificationMeta = {
  count: number;
  modifiedAfter15s: boolean;
  after15sCount: number;
  history: AnswerModificationItem[];
};

export const attemptAnswers = pgTable(
  'attempt_answers',
  {
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id),
    response: jsonb('response').$type<{ key?: string; value?: number } | null>(),
    state: answerState('state').notNull().default('not_seen'),
    timeSpentMs: integer('time_spent_ms').notNull().default(0),
    visitCount: integer('visit_count').notNull().default(0),
    solveOrder: integer('solve_order'),
    firstActionTimeMs: integer('first_action_time_ms'),
    firstActionType: text('first_action_type'),
    visitTimesMs: jsonb('visit_times_ms').$type<number[]>().notNull().default([]),
    answerModifications: jsonb('answer_modifications').$type<AnswerModificationMeta | null>(),
    modifiedAfter15s: boolean('modified_after_15s').notNull().default(false),
    isCorrect: boolean('is_correct'),
    marksAwarded: numeric('marks_awarded', { precision: 5, scale: 2 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

export const attemptEvents = pgTable('attempt_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  attemptId: uuid('attempt_id')
    .notNull()
    .references(() => attempts.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  meta: jsonb('meta'),
});

export const storedFiles = pgTable('stored_files', {
  key: text('key').primaryKey(),
  data: text('data').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  sha256: text('sha256').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const studentLeadActions = pgTable(
  'student_lead_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('student_lead_actions_student_idx').on(t.studentId),
    index('student_lead_actions_attempt_idx').on(t.attemptId),
  ],
);

export const studentFeedback = pgTable(
  'student_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'set null' }),
    testId: uuid('test_id').references(() => tests.id, { onDelete: 'set null' }),
    testRating: smallint('test_rating'),
    reportRating: smallint('report_rating'),
    feedbackText: text('feedback_text'),
    sourceTab: text('source_tab'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('student_feedback_student_idx').on(t.studentId),
    index('student_feedback_attempt_idx').on(t.attemptId),
  ],
);

export const phoneOtps = pgTable(
  'phone_otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    otpHash: text('otp_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: smallint('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('phone_otps_phone_idx').on(t.phone)],
);

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type Paper = typeof papers.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuestionImage = typeof questionImages.$inferSelect;
export type StoredFile = typeof storedFiles.$inferSelect;
export type StudentLeadAction = typeof studentLeadActions.$inferSelect;
export type StudentFeedback = typeof studentFeedback.$inferSelect;
export type PhoneOtp = typeof phoneOtps.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;


