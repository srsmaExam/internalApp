# SRSMA — JEE & NEET Computer-Based Test (CBT) Platform
### Institutional-Grade Examination, Digitization, and Analytics System

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.44.7-green?logo=postgresql)](https://orm.drizzle.team/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-OpenNext_Edge-orange?logo=cloudflare)](https://opennext.js.org/cloudflare)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Vitest-204_Passed-success?logo=vitest)](https://vitest.dev/)

---

## 📖 Table of Contents
1. [Platform Overview & Architecture](#1-platform-overview--architecture)
2. [Portals & Access Endpoints](#2-portals--access-endpoints)
3. [Low-Level Design (LLD) & Technical Invariants](#3-low-level-design-lld--technical-invariants)
   - [Unified API Architecture](#31-unified-api-architecture)
   - [Dual Database Layer (PGlite & Supabase)](#32-dual-database-layer-pglite--supabase)
   - [Database Schema & Data Models](#33-database-schema--data-models)
   - [Authentication & Session Engine](#34-authentication--session-engine)
   - [Provisional Accounts & Anti-Exfiltration Security](#35-provisional-accounts--anti-exfiltration-security)
   - [CBT Test Runner & Exam Lifecycle](#36-cbt-test-runner--exam-lifecycle)
   - [Scoring, Grading & Sectional Shuffle](#37-scoring-grading--sectional-shuffle)
   - [Asset & Diagram Storage Engine](#38-asset--diagram-storage-engine)
4. [Faculty & Administration Guide](#4-faculty--administration-guide)
   - [Roster & Batch Management](#41-roster--batch-management)
   - [Paper Digitization & AI Ingestion](#42-paper-digitization--ai-ingestion)
   - [Question Crop Studio & LaTeX Preview](#43-question-crop-studio--latex-preview)
   - [Exam Builder & Publishing Control](#44-exam-builder--publishing-control)
   - [Analytics & Diagnostic Reports](#45-analytics--diagnostic-reports)
   - [Student Feedback Management](#46-student-feedback-management)
5. [Student Experience Manual](#5-student-experience-manual)
   - [Direct Phone Authentication](#51-direct-phone-authentication)
   - [Taking a CBT Exam (NTA Interface)](#52-taking-a-cbt-exam-nta-interface)
   - [Disconnect Resilience (IndexedDB)](#53-disconnect-resilience-indexeddb)
   - [Scorecards & Worked Solutions](#54-scorecards--worked-solutions)
6. [Production Deployment & Infrastructure](#6-production-deployment--infrastructure)
   - [Cloudflare Pages + Supabase (Recommended)](#61-cloudflare-pages--supabase-recommended)
   - [Cloudflare Hyperdrive Configuration](#62-cloudflare-hyperdrive-configuration)
   - [Vercel Deployment Alternative](#63-vercel-deployment-alternative)
   - [Environment Variables Reference](#64-environment-variables-reference)
   - [Automated Sweep Cron Setup](#65-automated-sweep-cron-setup)
7. [Local Development & Testing](#7-local-development--testing)
   - [Running with Offline Embedded PGlite](#71-running-with-offline-embedded-pglite)
   - [Running Locally against Remote Supabase](#72-running-locally-against-remote-supabase)
   - [Verification Matrix (Typecheck, Tokens, Tests)](#73-verification-matrix-typecheck-tokens-tests)
8. [Platform Hardening & Bug Fix History](#8-platform-hardening--bug-fix-history)
9. [CLI Commands & Script Matrix](#9-cli-commands--script-matrix)

---

## 1. Platform Overview & Architecture

**SRSMA CBT Platform** is an institutional-grade Computer-Based Testing and paper digitization platform engineered for Shri Ram Smart Minds Academy. It faithfully reproduces the National Testing Agency (NTA) exam environment, question delivery, timing algorithms, and score calibration used in national competitive exams (JEE Main, JEE Advanced, NEET).

### Core Technological Highlights
- **Framework**: Next.js 15 App Router running React 19.
- **Styling**: Tailwind CSS v4 design system with light/dark theme support and zero CSS runtime overhead.
- **Type Safety**: End-to-end TypeScript with runtime Zod schema parsing.
- **Dual Runtime Modes**:
  1. **Production (Cloud)**: Cloudflare Pages / Workers or Vercel backed by Supabase PostgreSQL (Port 6543 pooler / Hyperdrive) with zero idle compute cost.
  2. **Offline Prototype**: Runs 100% locally on disk using embedded PostgreSQL (`@electric-sql/pglite`) under `data/` with zero cloud dependencies.
- **Formula & Math Engine**: KaTeX LaTeX typesetting for inline and block mathematical formulas.
- **Client Offline Synchronization**: IndexedDB mirrored local answer state resilient to network drops.

---

## 2. Portals & Access Endpoints

| Portal | Route | Primary Audience | Authentication Method | Primary Responsibilities |
|---|---|---|---|---|
| **Faculty Portal** | `/SRSMA` | Teachers & Admins | Username + Password | Roster import, paper digitization, question cropping, exam publishing, cohort analytics |
| **Student Login** | `/login` (or `/`) | Students & Aspirants | Mobile / Phone Number (+ Country Code) | Frictionless sign-in, self-service profile completion, diagnostic mock exams |
| **Diagnostic Test Funnel** | `/boardChallenge` | Prospective Students | Phone Number | Public diagnostic challenge with instant syllabus readiness evaluation |
| **Student Dashboard** | `/student` | Authenticated Students | Session Cookie (90 days) | Test roster, active exam launch, historical scorecards, worked solutions |
| **Faculty Workspace** | `/teacher/*` | Verified Faculty | Session Cookie (Role: Teacher) | Test builder, live leaderboards, question calibration, student feedback |

---

## 3. Low-Level Design (LLD) & Technical Invariants

### 3.1. Unified API Architecture
To maintain maximum deployment flexibility across serverless and edge environments (such as Vercel Hobby limits of 12 functions, and Cloudflare Pages asset workers), the entire backend API is consolidated into a **single unified route handler**:
- **Entrypoint**: `src/app/api/[[...slug]]/route.ts`
- **Unified Router**: `src/server/api/router.ts`
- **Pattern Matcher**: Fast path segment parsing without heavy routing frameworks.
- **Static Verification**: `src/lib/api-routes.test.ts` statically scans every `fetch()` in the client codebase and guarantees a matching backend route and HTTP verb exists.

### 3.2. Dual Database Layer (PGlite & Supabase)
The database client (`src/db/client.ts`) transparently detects the execution environment:
1. **Remote Cloud (PostgreSQL)**: Activated whenever `DATABASE_URL` or Cloudflare Hyperdrive binding (`HYPERDRIVE` / `DATABASE`) is present. Uses `pg.Pool` with connection error recovery.
2. **Local Embedded (PGlite)**: Activated when `DATABASE_URL` is unset. Boots an in-process WebAssembly-compiled PostgreSQL instance stored in `data/pglite/`.

### 3.3. Database Schema & Data Models
Defined with Drizzle ORM in `src/db/schema.ts`:

```
+--------------------------------------------------------------------------+
|                               PROFILES                                   |
| id (uuid PK), role (enum: teacher|student), fullName, username, email,   |
| phone, batch, classLevel, isProvisional (boolean), isActive, canLogin    |
+-------------------------------------+------------------------------------+
                                      |
       +------------------------------+-------------------------------+
       |                                                              |
+------v-----------------------------+   +----------------------------v----+
|               TESTS                |   |          STORED_FILES           |
| id, title, examType, durationS,    |   | key (PK), data (bytea),         |
| isPublished, resultsPolicy,        |   | contentType, byteSize, sha256   |
| releasedAt, shuffleQuestions       |   +---------------------------------+
+-----------------+------------------+
                  |
         +--------v---------+-----------------------------------------+
         |                  |                                         |
+--------v--------+   +-----v-------------------------------------+   |
|  TEST_QUESTIONS |   |                  ATTEMPTS                 |   |
| testId,         |   | id, testId, studentId, status, startedAt, |   |
| questionId,     |   | submittedAt, rawScore, maxMarks,          |   |
| section, order  |   | percentile, timeSpentS, lastHeartbeatAt   |   |
+--------+--------+   +-------------------+-----------------------+   |
         |                                |                           |
+--------v------------------------+  +----v--------------------+      |
|            QUESTIONS            |  |     ATTEMPT_ANSWERS     |      |
| id, paperId, qtype, questionText|  | attemptId, questionId,  |      |
| options (JSON), correctAnswer,  |  | answerState, response,  |      |
| solutionHtml, marksCorrect,     |  | marksAwarded, timeSpent |      |
| status (draft|verified|archived)|  +-------------------------+      |
+---------------------------------+                                   |
                                                                      |
+---------------------------------------------------------------------v----+
|                           STUDENT_FEEDBACK                               |
| id, studentId, attemptId, testRating, reportRating, comment, createdAt  |
+--------------------------------------------------------------------------+
```

### 3.4. Authentication & Session Engine
- **Session Tokens**: Cryptographically signed HMAC-SHA256 JWTs using `jose` (`src/lib/session.ts`).
- **Persistence**: HttpOnly, SameSite=Lax cookie with 90-day expiration (`SESSION_COOKIE = 'srsma_auth'`).
- **Student Flow**: Frictionless phone sign-in via `/api/auth/login`. Students enter their phone number; new profiles are created with `isProvisional: true` unless already enrolled by faculty.
- **Faculty Flow**: Strict username and password check verified against PBKDF2/SHA-512 hashes.

### 3.5. Provisional Accounts & Anti-Exfiltration Security
To prevent unauthorized users from exfiltrating premium question banks, tests, and answer keys:
- Self-service accounts auto-provisioned via phone login are flagged with `isProvisional: true`.
- Provisional students can **only** access diagnostic and public mock exams (`tests.audience = 'public'`).
- Enrolled cohort mock tests (`tests.audience = 'batch'`) reject provisional accounts with HTTP 403 Forbidden.
- Answer keys and worked solutions for official tests are completely withheld until faculty verifies enrollment.

### 3.6. CBT Test Runner & Exam Lifecycle
1. **Creation**: Student launches test at `/student/tests/[id]` -> `/api/tests/[id]/start`.
2. **State Machine**:
   - `in_progress`: Countdown running; answers saved continuously.
   - `submitted`: Student clicked submit; responses frozen and graded immediately.
   - `auto_submitted`: Timer elapsed or sweep background job finalized the attempt.
   - `abandoned`: Student closed browser without resuming within allowed grace window.
3. **Heartbeat & Telemetry**: Test runner periodically sends beacons updating `attempts.last_heartbeat_at`.

### 3.7. Scoring, Grading & Sectional Shuffle
- **Standard JEE Marking Scheme**:
  - MCQ: `+4` for correct option, `-1` for incorrect option, `0` for unattempted.
  - Numerical: `+4` for value matching within tolerance (floating point ±0.01), `0` for incorrect, `0` for unattempted.
- **Sectional Ordering**: When shuffle questions is enabled, questions are shuffled within sections while maintaining strict subject sequence: **Mathematics → Physics → Chemistry → Biology**.
- **Hyperdrive SQL Cache Bypass**: Real-time attempt queries for in-progress tests explicitly bypass edge read caches to prevent stale response rollbacks.

### 3.8. Asset & Diagram Storage Engine
Question diagrams, circuits, and uploaded PDF papers are handled via dual persistence (`src/lib/storage.ts`):
1. **Local Filesystem**: Written to `data/` for rapid development and offline use.
2. **Database Byte Storage (`stored_files`)**: Encoded into PostgreSQL `bytea` columns with SHA-256 integrity checksums, allowing cloud deployments (Vercel / Cloudflare) to serve diagrams without an external S3/R2 bucket.

---

## 4. Faculty & Administration Guide

Access the faculty portal by navigating to **`/SRSMA`** and signing in with your administrator credentials.

### 4.1. Roster & Batch Management (`/teacher/students`)
- **Student Directory**: Search and filter students by Name, Mobile Number, Username, or Batch.
- **Individual Addition**: Register a student with name, phone number, and assign them to a cohort batch (e.g. `JEE-2027-Morning`, `Class 11`).
- **Bulk Import (CSV)**: Paste CSV text or upload spreadsheet files with columns:
  ```csv
  Full Name, Phone, Batch
  Aditya Sharma, 9876543210, JEE-2026-A
  Pooja Reddy, 9123456780, NEET-2026-B
  ```
- **Provisional Conversion**: Review prospective students who took the diagnostic test and convert them into enrolled batch members with one click.

### 4.2. Paper Digitization & AI Ingestion (`/teacher/papers`)
1. **Upload Official PDF**: Upload question paper PDFs under `/teacher/papers`.
2. **Extraction Prompts**: Navigate to `/teacher/extraction-prompt`, select the extraction mode, copy the optimized prompt, and run it in Gemini Pro / Claude with the PDF attached.
3. **Ingest JSON**: Paste the resulting JSON into the Ingestion Studio. Built-in JSON repair fixes common LLM syntax irregularities and loads questions as drafts.

### 4.3. Question Crop Studio & LaTeX Preview (`/teacher/questions/[id]`)
- **Split-Screen Studio**: Left side displays the original PDF page; right side displays the question editor.
- **Diagram Cropping**: Click and drag a selection rectangle over any diagram or equation in the PDF. The tool extracts, crops, compresses to WebP, and inserts the `[[IMG:...]]` token into the question text.
- **KaTeX LaTeX Live Preview**: Real-time rendering of mathematical symbols, fractions, matrices, and chemical formulas.
- **Verification Gate**: Questions must have a designated answer key, solutions, and subject taxonomy tag before being approved. Only **Verified** questions can be added to published tests.

### 4.4. Exam Builder & Publishing Control (`/teacher/tests`)
- **Setup Parameters**: Set Exam Title, Duration (e.g., 180 min), Passing Marks, and Target Audience (Public vs. Cohort Batches).
- **Anti-Cheating Controls**: Enable question shuffling and option shuffling (A/B/C/D randomized per candidate).
- **Results Release Policy**:
  - *Immediate*: Scorecards, percentiles, and worked solutions displayed as soon as the student submits.
  - *On Release*: Solutions remain sealed until faculty formally releases test results.
- **Clone Test**: Duplicate any completed test structure to run alternate batches or morning/evening shifts.

### 4.5. Analytics & Diagnostic Reports (`/teacher/analytics`)
- **Cohort Overview**: Class-wide average scores, completion rates, and subject accuracy charts.
- **Weak Chapter Diagnostics**: Identifies specific chapters (e.g. *Rotational Dynamics*, *Equilibrium*) where cohort accuracy falls below threshold.
- **Individual Test Analytics (`/teacher/tests/[id]/analytics`)**:
  - Live Leaderboard with ranks and percentiles.
  - Score distribution histogram.
  - Question calibration matrix highlighting questions with abnormally high error rates.
  - One-click CSV export of all student attempts and sectional scores.

### 4.6. Student Feedback Management (`/teacher/feedback`)
- Review student ratings (1 to 5 stars) on exam difficulty, UI smoothness, and solution clarity.
- Filter feedback by Test, Rating bracket, or source tab.

---

## 5. Student Experience Manual

### 5.1. Direct Phone Authentication
1. Students navigate to `/login` (or `/`).
2. Select country code (defaults to 🇮🇳 `+91`, supports 18+ international country codes).
3. Enter 10-digit mobile number and click **Sign in as Student**.
4. **First-Time Students**: Prompted for Full Name and Class (8 to 13) in a quick profile modal.
5. **Returning Students**: Immediately authenticated into their student dashboard without redundant OTPs or daily password prompts.

### 5.2. Taking a CBT Exam (NTA Interface)
- **Instructions Screen**: Clear explanation of exam duration, marking rules, and keyboard shortcuts.
- **Section Tabs**: Quick switching between **Mathematics**, **Physics**, and **Chemistry**.
- **75-Question Navigation Palette**:
  - 🟩 **Green**: Answered
  - 🟥 **Red**: Not Answered (Visited)
  - 🟪 **Purple**: Marked for Review (Unanswered)
  - 🟪🟢 **Purple with Dot**: Answered & Marked for Review *(Evaluated for score)*
  - ⬜ **Grey**: Not Visited
- **Action Buttons**: `Save & Next`, `Mark for Review & Next`, `Clear Response`.
- **Numerical Type Inputs**: Input field with decimal point validation and minus sign support.

### 5.3. Disconnect Resilience (IndexedDB)
Every answer selection, review toggle, and section transition is mirrored locally to browser `IndexedDB`. If the student loses internet connection or accidentally closes their browser tab:
- Time elapsed continues accurately.
- Reopening the exam restores all answered responses instantly.
- Answers sync seamlessly with the backend upon network reconnection.

### 5.4. Scorecards & Worked Solutions (`/student/attempts/[id]/result`)
- **Overall Score**: Total marks scored vs maximum possible marks.
- **Percentile Calculation**: Dynamic percentile calibrated against all cohort attempts.
- **Overtime Question Analysis (⏱)**: Flags questions where time spent exceeded >1.5× the average target pace.
- **Worked Step-by-Step Solutions**: Formatted LaTeX equations and diagrams explaining correct answers and problem-solving methodologies.

---

## 6. Production Deployment & Infrastructure

### 6.1. Cloudflare Pages + Supabase (Recommended)

This platform is configured for zero-cold-start edge execution on Cloudflare using OpenNext.

#### Step 1: Database Setup on Supabase
1. Create a free project at [supabase.com](https://supabase.com).
2. Choose a region close to your students (e.g. `ap-south-1` Mumbai).
3. Under **Project Settings** > **Database** > **Connection string**, select **URI** and toggle **Transaction Pooler (Port 6543)**:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
   *(Note: URL-encode special characters in password: `@` -> `%40`, `!` -> `%21`).*
4. Run migrations from your terminal:
   ```powershell
   $env:DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-...pooler.supabase.com:6543/postgres?sslmode=require"
   npm run migrate
   ```
5. Seed the master faculty administrator account:
   ```powershell
   npm run seed:admin
   ```

#### Step 2: Cloudflare Deployment
1. Connect your Git repository in the [Cloudflare Dashboard](https://dash.cloudflare.com/) under **Workers & Pages**.
2. **Build Configuration**:
   - Framework preset: `None`
   - Build command: `npm run build:cloudflare`
   - Build output directory: `.open-next/assets`
3. Under **Settings** > **Functions / Runtime**:
   - Compatibility flag: `nodejs_compat`
   - Compatibility date: `2025-01-01` or later

### 6.2. Cloudflare Hyperdrive Configuration
Hyperdrive accelerates PostgreSQL database queries across Cloudflare's global edge network:
1. In Cloudflare Dashboard, go to **Storage & Databases** > **Hyperdrive** > **Create Config**.
2. Connect your Supabase transaction pooler details.
3. In `wrangler.jsonc`, add your Hyperdrive ID:
   ```jsonc
   "hyperdrive": [
     {
       "binding": "HYPERDRIVE",
       "id": "your-hyperdrive-id-here",
       "localConnectionString": "postgresql://postgres...:5432/postgres"
     }
   ]
   ```

### 6.3. Google Drive Storage (PDFs & Question Images)
To prevent exhausting Supabase's 500 MB database quota, binary files (source question paper PDFs and cropped diagram images) are stored in your **Google Drive (2 TB AI Pro Storage)** with zero credit card required:

1. **Google Cloud Console Setup (100% Free, No Credit Card)**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. `srsma-storage`).
   - In **APIs & Services** > **Library**, enable the **Google Drive API**.
   - In **APIs & Services** > **Credentials**, click **Create Credentials** > **Service Account**.
   - Create a service account (e.g. `srsma-bot`).
   - Click on the created service account > **Keys** > **Add Key** > **Create new key** (JSON). Download the key file.

2. **Google Drive Folder Sharing**:
   - Open your Google Drive and create a dedicated folder (e.g. `SRSMA_Papers`).
   - Share this folder with your service account email (`srsma-bot@your-project.iam.gserviceaccount.com`) as **Editor**.
   - Copy the folder ID from the URL (the string after `drive.google.com/drive/folders/...`).

3. **Configure Environment Variables (`.env`)**:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=srsma-bot@your-project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
   ```
   *(Or simply place the downloaded JSON file in the project root and specify `GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json`)*.

4. **Migrate Existing Files to Google Drive**:
   ```bash
   # Preview files to migrate
   npm run migrate:gdrive -- --dry-run

   # Upload files to Google Drive
   npm run migrate:gdrive

   # Upload to Google Drive and purge PostgreSQL stored_files to free Supabase DB space
   npm run migrate:gdrive -- --clean-db
   ```

### 6.4. Vercel Deployment Alternative
If deploying to Vercel:
1. Connect your repository to Vercel.
2. Build command: `npm run build`
3. Output directory: `.next`
4. Set environment variables in Vercel project settings.

### 6.4. Environment Variables Reference

| Variable Name | Environment | Required | Description |
|---|---|:---:|---|
| `DATABASE_URL` | Cloud / Prod | Yes | Supabase PostgreSQL Transaction Pooler connection string (Port 6543) |
| `DATABASE_POOL_MAX` | Cloud / Prod | No | Maximum connection pool size (defaults to 5 for serverless) |
| `SESSION_SECRET` | All | Yes | 32+ character random string for signing HMAC-SHA256 session tokens |
| `COOKIE_SECURE` | Production | Yes | Set `true` to enforce HTTPS-only cookies in production |
| `CRON_SECRET` | Production | Yes | Secret token protecting the background exam sweep endpoint |
| `DISABLE_SWEEP_TIMER` | Serverless | Yes | Set `true` on Vercel/Cloudflare to disable background setInterval timers |
| `NEXT_PUBLIC_APP_URL` | Production | No | Public domain URL of the deployed application (e.g. `https://study.srsma.in`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Production | No | Google Analytics 4 Measurement ID (e.g. `G-D36DLF1HJX`) |

### 6.5. Automated Sweep Cron Setup
Because serverless environments terminate background `setInterval` timers when idle, configure an external cron job (e.g. [cron-job.org](https://cron-job.org) or Cloudflare Triggers) to call:
- **URL**: `https://your-domain.com/api/cron/sweep-expired`
- **Method**: `POST`
- **Schedule**: Every 2 minutes
- **Headers**: `Authorization: Bearer <YOUR_CRON_SECRET>`

This automatically submits student attempts whose time limit has elapsed.

---

## 7. Local Development & Testing

### 7.1. Running with Offline Embedded PGlite
```bash
# 1. Install dependencies
npm install

# 2. Seed demo student & teacher accounts, questions, and tests
npm run seed

# 3. Start development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.
- Faculty Portal: `/SRSMA` (`Teacher` / `112345`)
- Student Portal: `/login` (Mobile: `9876543210`)

### 7.2. Running Locally against Remote Supabase
```powershell
$env:DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-...pooler.supabase.com:6543/postgres?sslmode=require"
npm run migrate
npm run dev
```

### 7.3. Verification Matrix (Typecheck, Tokens, Tests)
Before submitting code or deploying, run the full verification pipeline:
```bash
npm run verify
```
This executes:
1. `npm run typecheck` (`tsc --noEmit`): Validates TypeScript across all 150+ source files.
2. `npm run check-tokens`: Ensures all UI color and brand design tokens resolve cleanly.
3. `npm test` (`vitest run`): Executes the test suite (204 unit & integration tests).

---

## 8. Platform Hardening & Bug Fix History

A complete record of foundational stability and security improvements implemented in the platform:

| Code | Issue Category | Problem Description | Resolution & Architectural Fix |
|---|---|---|---|
| **FBR-01** | Ingestion | LLM-generated JSON formatting errors caused parser crashes | Built robust JSON repair engine and Zod validation schema with fallback repair |
| **FBR-02** | Integrity | Draft questions could be verified without complete solutions | Added strict validation requiring step-by-step solutions before verification |
| **FBR-03** | Security | Unenrolled users could view private cohort exam answer keys | Created provisional accounts boundary (`isProvisional: true`) isolating public leads from enrolled tests |
| **FBR-04** | Client | Mobile focus loss caused unintentional test lockout | Refactored window blur/focus handling to prevent false lockouts on mobile OS notifications |
| **FBR-05** | Auth | Inconsistent phone formatting allowed duplicate account creation | Implemented strict E.164 normalization (`normalizePhone`) with collision detection |
| **FBR-06** | Exam Engine | Serverless isolates did not reliably sweep expired exams | Implemented `/api/cron/sweep-expired` with token protection and idempotent regrading |
| **FBR-07** | CBT Runner | Sectional questions became disorganized when shuffled | Enforced subject-level section isolation: Maths → Physics → Chemistry → Biology |
| **FBR-08** | Edge Caching | Cloudflare Hyperdrive cached in-progress attempt answers | Added explicit `no-cache` SQL directives for `attempt_status = 'in_progress'` queries |
| **FBR-09** | Serverless | Exceeded Vercel Hobby serverless function quotas | Consolidated all API endpoints into a single unified dynamic router (`/api/[[...slug]]`) |
| **FBR-10** | Auth | Complex OTP login introduced third-party delivery points | Streamlined into direct phone login with automatic profile completion |

---

## 9. CLI Commands & Script Matrix

| Command | Script / Target | Description |
|---|---|---|
| `npm run dev` | `next dev` | Starts local Next.js development server |
| `npm run build` | `next build` | Compiles production Next.js application bundle |
| `npm run build:cloudflare` | `opennextjs-cloudflare build` | Builds Cloudflare edge bundle with OpenNext |
| `npm run deploy:cloudflare` | `opennextjs-cloudflare deploy` | Deploys directly to Cloudflare Pages via Wrangler |
| `npm run verify` | `typecheck && check-tokens && test` | Executes complete static verification suite |
| `npm run migrate` | `tsx scripts/migrate.ts` | Executes pending SQL migrations in `drizzle/` |
| `npm run seed` | `tsx scripts/seed.ts` | Seeds local PGlite with mock students, papers, and tests |
| `npm run seed:admin` | `tsx scripts/seed-admin.ts` | Seeds or updates the master faculty admin user |
| `npm run regrade` | `tsx scripts/regrade.ts` | Recalculates scores and percentiles for closed attempts |
| `npm run check:db` | `tsx scripts/check-counts.ts` | Diagnostic script printing current record counts in database |
| `npm run backup` | `tsx scripts/backup.ts` | Dumps database state to local backup file |
| `npm run restore` | `tsx scripts/restore.ts` | Restores database state from a backup file |
| `npm run optimize:db-images` | `tsx scripts/optimize-db-images.ts` | Compresses database question diagram images to WebP |
| `npm run attach:metadata` | `tsx scripts/attach-question-metadata.ts` | Backfills taxonomy metadata matching `SampleReport.xlsx` |
