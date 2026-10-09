# SRSMA — JEE Online Test Computer-Based Test (CBT) Platform

A full-featured, institutional-grade JEE Online Test Computer-Based Test (CBT) platform engineered for **SRSMA**. Built to replicate the exact National Testing Agency (NTA) exam environment, question delivery, timing algorithms, and score calibration.

Runs in two flexible modes:
- **Production (Cloud)**: Deployed on **Vercel** + **Supabase (PostgreSQL)** + **cron-job.org** with **$0.00 / month operating cost**.
- **Local (Offline Prototype)**: Runs 100% locally on disk with embedded PostgreSQL (PGlite) under `data/` with zero cloud dependencies.

---

## 📚 Documentation Quick Links

| Document | Purpose |
|---|---|
| 📖 **[Detailed Production Operations & User Guide](README.production.md)** | **Exhaustive manual on how to use every feature in production (Students, Faculty, Ingestion, Tests, Analytics)** |
| 🚀 **[Production Setup & Deployment Guide](PRODUCTION-SETUP-GUIDE.md)** | Step-by-step instructions for Supabase pooler setup, Vercel deployment, and free 2-min cron configuration |
| 💻 **[Local Build Quick Reference](README.local.md)** | Quick reference for offline local development with embedded PGlite |
| 🏛 **[System Low-Level Design (LLD)](JEE-Test-Platform-LLD.md)** | Architectural specifications, schema definitions, and security invariants |

---

## Key Portals & Credentials

### 1. Faculty & Staff Portal
- **URL**: `https://your-domain.vercel.app/SRSMA` *(Restricted route)*
- **Authentication**: Username and Password.
- **Production Admin**:
  - Username: `Teacher`
  - Provisioned via: `npm run seed:admin`
- **Features**: Student roster management, bulk CSV import, PDF digitization studio, question diagram cropper, test builder, live monitoring, test leaderboards, and cohort weak chapter analytics.

### 2. Student Portal
- **URL**: `https://your-domain.vercel.app/login` (or `/`)
- **Authentication**: Mobile Phone Number with Country Code (default: 🇮🇳 India `+91`, supports 18+ international codes).
- **Session**: 90-day persistent session cookie (no repeated daily logins).
- **Features**: NTA-style CBT test runner with synchronized timer, 75-question palette (5 color states), disconnect-resilient local mirroring (IndexedDB), instant scorecard, KaTeX step-by-step solutions, and personal performance curves.

---

## Quick Start (Production vs Local)

### Option A: Running Production Build Locally with Supabase
```powershell
# 1. Install dependencies
npm install

# 2. Run migrations against Supabase
$env:DATABASE_URL="postgresql://postgres.xxx:pass@aws-0-...pooler.supabase.com:6543/postgres?sslmode=require"
npm run migrate

# 3. Provision Master Faculty Admin
$env:ADMIN_USERNAME="Teacher"
$env:ADMIN_PASSWORD="SRSMA@108"
$env:ADMIN_FULLNAME="SRSMA"
$env:ADMIN_EMAIL="exams.srsma@gmail.com"
npm run seed:admin

# 4. Start local production-like dev server
npm run dev
```

### Option B: Running Offline Local Prototype (Embedded PGlite)
```bash
# 1. Install dependencies
npm install

# 2. Seed demo accounts, sample papers, and mock attempts
npm run seed

# 3. Start local development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**. Faculty logs in at `/SRSMA` (`Teacher` / `112345`), Student logs in at `/login`.

---

## How to Use as a Teacher / Administrator

### 1. Manage Students & Batches (`/teacher/students`)
- **View Roster**: Search by student name, WhatsApp number, username, or email. Filter by batch.
- **Add Individual Student**: Enter student name, 10-digit WhatsApp number, email, and assign to a cohort batch.
- **Bulk Upload via CSV**: Upload multiple students at once. Automatically maps CSV columns (`name`, `phone`/`mobile`, `email`, `batch`).
- **Batch Management**: Filter students by batch, view active/inactive status, and check individual test attempt statistics.

### 2. Digitize Question Papers (`/teacher/papers` & `/teacher/questions/upload`)
- **Upload PDF**: Upload official JEE Online Test question paper PDFs under `/teacher/papers`.
- **Extraction Prompts**: Copy the standardized prompt from `/teacher/extraction-prompt`, run it in Gemini/Claude with the PDF attached, and copy the JSON.
- **Ingest & Validate**: Paste JSON into the Ingest tab. Built-in Zod schema validation checks syntax and auto-repairs formatting issues before staging as drafts.
- **Crop Studio**: Open questions in `/teacher/questions/[id]` with split-screen PDF canvas. Drag a box over any circuit, diagram, or graph on the PDF to instantly crop and attach it to `[[IMG:...]]` placeholders as an optimized WebP.
- **Verify Questions**: Confirm answer keys, KaTeX LaTeX previews, and taxonomy tags, then click **Verify Question** (required before publishing).
- **Direct Question Bank Upload**: Upload standalone questions, answer keys, and worked step-by-step solutions directly under `/teacher/questions/upload`.

### 3. Build & Publish Exams (`/teacher/tests`)
- **Create Test**: Set Title, Duration (e.g. 180 min), active schedule window, max attempts, and anti-cheating shuffle options (shuffle questions, shuffle options A/B/C/D).
- **Results Policy**: Choose **Immediate** (instant scorecard & solutions upon submit) or **On Release** (solutions hidden until teacher releases results).
- **Test Builder**: Switch between Physics, Chemistry, and Mathematics. Add verified questions from the question bank, reorder questions, and override scoring schemes.
- **Publish Gate**: Enforces 100% question verification before going live.
- **Clone Test**: Duplicate existing tests with one click for alternate shifts.

### 4. Monitor & Analyze Results (`/teacher/tests/[id]/analytics` & `/teacher/analytics`)
- **Real-Time Leaderboard**: Live rankings, total scores, percentiles, and completion times.
- **Score Distribution**: Visual histogram showing candidate distribution across score brackets.
- **Question Item Calibration**: Identify tricky questions where student error rate is unusually high.
- **One-Click CSV Export**: Download a complete spreadsheet of student scores and section breakdowns.
- **Cohort Analytics**: Track cross-test score curves and detect class-wide weak chapters to plan revision lectures.

---

## How to Use as a Student

### 1. Sign In & Access Dashboard
- Visit `/login` (or `/`), select your country code (🇮🇳 `+91`), enter your registered WhatsApp number, and click **Sign in as Student**.
- The dashboard (`/student`) displays all active and upcoming tests.

### 2. Take a CBT Exam (`/student/tests/[id]` → `/student/attempts/[id]`)
- **Instructions**: Review the exam duration, marking scheme (+4 / -1 / 0), and 5-color palette legend. Check the declaration box and begin.
- **NTA-Style Test Runner**:
  - Synchronized countdown clock at the top.
  - Section tabs to jump between **Physics**, **Chemistry**, and **Mathematics**.
  - 75-cell quick-navigation palette:
    - 🟩 **Green**: Answered
    - 🟥 **Red**: Not Answered (Visited)
    - 🟪 **Purple**: Marked for Review
    - 🟪🟢 **Purple with Dot**: Answered & Marked for Review *(Evaluated for marks)*
    - ⬜ **Grey**: Not Visited
  - Answering: Radio options for MCQs; validated numeric field for numerical questions.
  - Actions: **Save & Next**, **Mark for Review & Next**, **Clear Response**.
  - **Offline Disconnect Resilience**: In-memory state is continuously mirrored to `IndexedDB`. If the internet drops or the page is refreshed, you can continue answering uninterrupted.
  - **Submit**: Click **Submit Test** to review section-wise summary counts before confirming submission.

### 3. Review Scorecard & Solutions (`/student/attempts/[id]/result`)
- Immediate breakdown of Total Marks, Cohort Percentile, and Subject Scores.
- Step-by-step KaTeX worked solutions for every question.
- Side-by-side answer comparison (Your Selection vs Correct Answer).
- **Overtime Flag (⏱)**: Flags questions where time spent exceeded >1.5× expected time.
- Filter by *Correct*, *Incorrect*, *Unattempted*, and *Overtime*.

### 4. Track Performance Analytics (`/student/analytics`)
- Visual score progression curve across all completed mock exams.
- Subject-wise accuracy percentages and chapter mastery breakdown.

---

## Administrative Scripts & CLI Operations

| Command | Description |
|---|---|
| `npm run migrate` | Runs pending PostgreSQL migrations against Supabase |
| `npm run seed:admin` | Provisions or updates the master faculty admin account |
| `npm run regrade` | Re-grades any attempts that were closed without a recorded score |
| `npm run test` | Runs the Vitest test suite (grading engine, leak prevention, schemas) |
| `npm run typecheck` | Runs TypeScript compiler checks (`tsc --noEmit`) |
| `npm run verify` | Complete pre-deployment check (`typecheck` + `tokens` + `test`) |
| `npm run build` | Compiles the production Next.js application bundle |
| `npm run seed` | *(Local dev only)* Seeds demo accounts and mock papers into PGlite |
| `npm run backup` | *(Local dev only)* Dumps database and media files under `data/backups/` |
| `npm run reset` | *(Local dev only)* Wipes local PGlite data and re-seeds |

---

## Security & Answer-Key Leak Prevention

1. **Zero-Leak DTO Projection**:
   - Question payloads served to students during an active test pass strictly through `toStudentQuestion()` in `src/lib/dto.ts`.
   - Fields such as `answer`, `solution`, `difficulty`, and `extraction_notes` are strictly omitted from student API payloads.
   - Enforced by automated leak tests in `src/lib/dto.leak.test.ts`.
2. **Server-Side Atomic Grading**:
   - Grading happens exclusively on the server inside a single database transaction (`POST /api/attempts/:id/submit`).
3. **Randomized Shuffling**:
   - Both question sequence and MCQ options (A/B/C/D) are shuffled per candidate attempt.
4. **Auto-Submit Sweep Daemon**:
   - Background 2-minute cron (`/api/cron/sweep-expired`) ensures tests are automatically closed and scored when time expires, even if the student's device is disconnected.

---

## License & Organization

Developed for **SRSMA (Sri Rama Seva Mandali Academy)**.  
All rights reserved. For detailed operations, see **[README.production.md](README.production.md)**.
