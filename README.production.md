# SRSMA JEE Online Test CBT Platform — Production Operations & User Guide

A comprehensive, production-grade guide for administrators, faculty, and students using the **SRSMA JEE Online Test Computer-Based Test (CBT)** platform.

This platform replicates the exact National Testing Agency (NTA) JEE Online Test testing environment, powered by a modern, zero-cost production stack:
- **Hosting & Serverless Compute**: [Vercel](https://vercel.com) (Next.js 15 App Router)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL with Supavisor Transaction Pooler)
- **Exam Timer Daemon**: [cron-job.org](https://cron-job.org) (2-minute HTTP sweep keep-alive)
- **Total Operational Cost**: **$0.00 / month (100% Free Forever Tier)**

---

## Table of Contents

1. [Platform URLs & Navigation](#1-platform-urls--navigation)
2. [Authentication & Roles](#2-authentication--roles)
3. [Faculty & Administrator Guide](#3-faculty--administrator-guide)
   - [3.1 Student Roster & Batch Management](#31-student-roster--batch-management)
   - [3.2 Question Paper Digitization & Crop Studio](#32-question-paper-digitization--crop-studio)
   - [3.3 Direct Question & Solution Upload](#33-direct-question--solution-upload)
   - [3.4 Question Bank & Taxonomy](#34-question-bank--taxonomy)
   - [3.5 Test Creation & Exam Builder](#35-test-creation--exam-builder)
   - [3.6 Live Monitoring & Results Release](#36-live-monitoring--results-release)
   - [3.7 Test Analytics & CSV Scorecard Export](#37-test-analytics--csv-scorecard-export)
   - [3.8 Cohort Analytics & Weak Topic Detection](#38-cohort-analytics--weak-topic-detection)
4. [Student Test-Taking Guide](#4-student-test-taking-guide)
   - [4.1 Sign-in & Dashboard](#41-sign-in--dashboard)
   - [4.2 Instructions & Declaration](#42-instructions--declaration)
   - [4.3 NTA-Style CBT Test Runner](#43-nta-style-cbt-test-runner)
   - [4.4 Disconnect Resilience & Offline Mirroring](#44-disconnect-resilience--offline-mirroring)
   - [4.5 Submission & Attempt Summary](#45-submission--attempt-summary)
   - [4.6 Scorecard, Solutions & Overtime Analysis](#46-scorecard-solutions--overtime-analysis)
   - [4.7 Personal Analytics & Chapter Mastery](#47-personal-analytics--chapter-mastery)
5. [Security & Anti-Cheating Architecture](#5-security--anti-cheating-architecture)
6. [Operational Commands & CLI Scripts](#6-operational-commands--cli-scripts)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Troubleshooting & Common Questions](#8-troubleshooting--common-questions)

---

## 1. Platform URLs & Navigation

| Route | Purpose | Access Level |
|---|---|---|
| `/` or `/login` | Student Sign-In Portal (Mobile Phone Auth) | Public |
| `/student` | Student Dashboard (Active & Upcoming Exams) | Enrolled Students |
| `/student/tests/[id]` | Pre-Exam Instructions & Declaration Screen | Enrolled Students |
| `/student/attempts/[id]` | Full-Screen CBT Test Runner with Synchronized Countdown | Enrolled Students |
| `/student/attempts/[id]/result` | Instant Scorecard, Step-by-Step KaTeX Solutions & Review | Enrolled Students |
| `/student/analytics` | Personal Score Progression & Chapter Mastery Analytics | Enrolled Students |
| **`/SRSMA`** | **Restricted Faculty & Administrator Login Portal** | **Staff Only** |
| `/teacher` | Faculty Overview Dashboard & Operational Stats | Faculty / Admin |
| `/teacher/students` | Student Directory, CSV Bulk Import & Batch Assignment | Faculty / Admin |
| `/teacher/papers` | Source PDF Upload & Question Extraction Workspace | Faculty / Admin |
| `/teacher/questions` | Central Question Bank, KaTeX Editor & Diagram Cropper | Faculty / Admin |
| `/teacher/questions/upload` | Direct JSON Ingestion for Questions & Solutions | Faculty / Admin |
| `/teacher/tests` | Exam Management & Test List | Faculty / Admin |
| `/teacher/tests/new` | Create New Exam (Durations, Windows, Policies) | Faculty / Admin |
| `/teacher/tests/[id]` | Test Builder (Add from Bank, Reorder, Custom Marking) | Faculty / Admin |
| `/teacher/tests/[id]/analytics`| Test Leaderboard, Score Distribution & CSV Export | Faculty / Admin |
| `/teacher/analytics` | Cohort-Wide Analytics & Class Weak Chapters | Faculty / Admin |
| `/api/cron/sweep-expired` | Auto-submission sweep for expired student exams | Cron Daemon Key |

---

## 2. Authentication & Roles

### 2.1 Faculty & Staff Authentication
- **Access URL**: Always navigate to the dedicated staff route: **`/SRSMA`** (do not use `/login`).
- **Credentials**: Standard username and password (e.g. `Teacher` / `SRSMA@108`).
- **Session**: Secure, HTTP-only, encrypted session cookie (`srsma_session`).
- **Provisioning**: Faculty accounts can be created or updated at any time using `npm run seed:admin`.

### 2.2 Student Authentication
- **Access URL**: **`/login`** (or visiting the root URL `/`).
- **Method**: Phone Number Authentication with country code selection:
  - Default: 🇮🇳 **India (+91)** (enter 10-digit WhatsApp number, e.g., `9876543210`).
  - Supports 18+ international country codes (+1 US/Canada, +44 UK, +971 UAE, +65 Singapore, +61 Australia, +966 Saudi Arabia, etc.) or custom prefix.
- **Session Duration**: **90-day persistent cookie**. Once a student logs in on their phone, tablet, or laptop, they stay logged in without needing to enter credentials every time they take a test.
- **Access Control**: Faculty can instantly disable login or deactivate any student profile from `/teacher/students`.

---

## 3. Faculty & Administrator Guide

### 3.1 Student Roster & Batch Management

Navigate to **Students** (`/teacher/students`):

#### 1. Viewing & Filtering Students
- Top metrics display **Total Students**, **Active Students**, **Total Tests Taken**, and **Cohort Average Score**.
- Use the **Search bar** to search by Student Name, Phone Number, Username, or Email.
- Filter by **Batch** (e.g., *JEE 2026 Batch A*, *Droppers 2025*) or **Status** (*Active*, *Inactive*).

#### 2. Adding an Individual Student
1. Click **+ Add Student**.
2. Provide:
   - **Full Name** (e.g., `Aarav Sharma`)
   - **Phone Number** (e.g., `+919876543210` or `9876543210`)
   - **Username** (e.g., `aarav.sharma`)
   - **Email** (e.g., `aarav@gmail.com`)
   - **Batch** (e.g., `JEE 2026 Morning`)
   - **Initial Password** (optional; defaults to `112345`)
3. Click **Create Student**.

#### 3. Bulk Importing Students via CSV
To import hundreds of students simultaneously:
1. Click **Import CSV**.
2. Paste CSV formatted text into the box or upload your spreadsheet export.
3. The system parses, validates, and checks for collisions before inserting.

**Accepted CSV Format:**
```csv
full_name,username,email,phone,batch,password
Aarav Sharma,aarav.s,aarav.sharma@example.com,+919876543210,JEE 2026 Batch A,112345
Diya Patel,diya.p,diya.patel@example.com,+919876543211,JEE 2026 Batch A,112345
Rohan Verma,rohan.v,rohan.verma@example.com,+919876543212,JEE 2026 Batch B,112345
Sneha Reddy,sneha.r,sneha.reddy@example.com,+919876543213,Droppers 2025,112345
```
*(Notes: Header names are flexible and case-insensitive. `password` defaults to `112345` if omitted).*

#### 4. Batch Operations
- **Bulk Batch Assignment**: Select multiple students using checkboxes, click **Assign Batch**, choose or type a batch name, and save.
- **Account Controls**: Toggle **Active / Inactive** or **Disable Login** for students who have graduated or need temporary suspension.
- **Edit Student**: Click the edit pencil icon on any student row to update their phone number, email, batch, or reset their password.

---

### 3.2 Question Paper Digitization & Crop Studio

Transform printed or PDF JEE Online Test question papers into verified, digital KaTeX CBT questions:

```
[Upload PDF] ──> [Run Extraction Prompt via LLM] ──> [Ingest JSON] ──> [Crop Diagrams on Canvas] ──> [Verify Question]
```

#### Step 1: Upload Source PDF
1. Go to **Papers** (`/teacher/papers`).
2. Click **Upload Paper**.
3. Enter the Paper Title (e.g. `JEE Online Test 2025 Jan 24 Shift 1`), Paper Code, Year, and select the PDF file.
4. The platform stores and indexes the PDF file.

#### Step 2: Extract Structured Questions with LLM
1. Go to **Extraction Prompt** (`/teacher/extraction-prompt`).
2. Click **Copy Prompt**. The platform copies an engineered, few-shot prompt designed specifically for JEE Online Test (formatting formulas into KaTeX LaTeX and placing `[[IMG:q<num>_fig1]]` placeholders for diagrams).
3. Open [Google Gemini](https://gemini.google.com) or Claude in your browser.
4. Attach your PDF question paper, paste the copied prompt, and generate the structured JSON output.

#### Step 3: Ingest JSON
1. Navigate to the paper's **Ingest** tab (`/teacher/papers/[id]/ingest`).
2. Paste the JSON response from Gemini/Claude into the box.
3. The built-in **Zod Validator & Auto-Repair** checks:
   - Valid JSON syntax (auto-fixing unescaped backslashes and trailing commas).
   - Valid options for MCQs (keys A, B, C, D) and numerical answers.
   - Subject categorization (Physics, Chemistry, Mathematics).
4. Click **Ingest Questions**. The questions are staged into the database as **Drafts**.

#### Step 4: Crop Diagrams & Figures (Split-Screen Studio)
1. Open any staged question in the **Question Editor** (`/teacher/questions/[id]`).
2. The split-screen interface loads:
   - **Left Pane**: Interactive PDF canvas of the source paper.
   - **Right Pane**: Question metadata, KaTeX live preview, answer key, and options.
3. For any question containing a diagram or circuit:
   - Scroll to the question on the PDF canvas.
   - Click and drag a selection rectangle around the diagram.
   - Click **Save Crop to [[IMG:...]]**.
   - The cropped figure is automatically saved as an optimized WebP image and rendered directly inside the question preview.
4. Review the answer key, numerical tolerance (for integer questions), and subject/chapter tags.
5. Click **Verify Question** (marked with a green checkmark).

---

### 3.3 Direct Question & Solution Upload

If you have JSON prepared from past test banks or question sets, navigate to **Upload Questions** (`/teacher/questions/upload`):

#### Modes Available:
1. **Questions Mode**: Ingest new questions directly without linking to an uploaded PDF.
2. **Solutions Mode**: Upload step-by-step solutions for existing questions. The platform automatically matches questions by question number or source code and attaches worked explanations.
3. **Both Mode**: Ingest questions and complete step-by-step solutions simultaneously.

*Features include instant syntax error highlighting, question count detection, and sample JSON templates.*

---

### 3.4 Question Bank & Taxonomy

Navigate to **Question Bank** (`/teacher/questions`):
- Filter questions by **Subject** (Physics, Chemistry, Mathematics), **Chapter**, **Difficulty** (Level 1–5), **Type** (MCQ vs Integer), and **Status** (Verified vs Draft).
- Search question text for specific keywords or formulas.
- Preview LaTeX formatting in real-time.
- Duplicate, edit, or archive questions.

---

### 3.5 Test Creation & Exam Builder

#### Step 1: Create Test Parameters (`/teacher/tests/new`)
1. **Title & Description**: e.g., `JEE Online Test Full Mock Test #01 (PCM)`.
2. **Duration**: Set exam duration in minutes (e.g., `180` for 3 hours).
3. **Max Retakes**: Typically `1` for formal mocks, or multiple for practice sets.
4. **Active Schedule Window**:
   - **Opening Window**: When students can first start the test.
   - **Closing Window**: Hard cutoff after which new attempts cannot begin.
5. **Results & Solutions Policy**:
   - **Immediate**: Students see their detailed score, rank, and step-by-step solutions immediately upon clicking Submit.
   - **On Release**: Students see their submission confirmation, but questions, answer keys, and solutions are locked until the faculty clicks **Release Results** (ideal for competitive cohort exams).
6. **Anti-Cheating & Shuffle Options**:
   - **Shuffle Question Order**: Every student receives a different randomized sequence of questions.
   - **Shuffle Options**: MCQ option choices (A, B, C, D) are permuted uniquely per candidate.
7. Click **Continue to Question Builder →**.

#### Step 2: Assign & Arrange Questions (`/teacher/tests/[id]`)
1. Switch between section tabs: **Physics**, **Chemistry**, **Mathematics**.
2. Click the **Add from Bank** tab:
   - Filter by chapter, difficulty, or source paper.
   - Click **Add to Test** for selected questions.
3. In the **Assigned Questions** tab:
   - Use the **Up / Down arrows** to reorder questions to match standard paper sequence.
   - Customize scoring per question if desired (standard preset: `+4` Correct, `-1` Wrong, `0` Unattempted).
4. **Publish Gate**:
   - The platform verifies that **100% of questions in the test are marked "Verified"**.
   - If any question is still in "Draft" status, the Publish button warns the faculty and highlights the unverified questions.
5. Click **Publish Test**. The test is now live and visible on the student dashboard!

#### Step 3: Clone Test
- Click **Clone Test** at any time to duplicate the entire test structure, scoring schemes, and question assignments for a parallel batch (e.g. *Shift 2*).

---

### 3.6 Live Monitoring & Results Release

Navigate to **Tests** (`/teacher/tests`):
- View status badges: **Draft**, **Published**, **Closed**.
- Track total student attempts in real time.
- **Manual Results Release**: If the test was configured with the *On Release* policy, once all students have completed their exams, click **Release Results**. All students instantly gain access to their scorecards and worked solutions.

---

### 3.7 Test Analytics & CSV Scorecard Export

Open any published test and click **Analytics** (`/teacher/tests/[id]/analytics`):

1. **Cohort Summary Metrics**: Total Attempts, Average Marks, Highest Score, Lowest Score, Median Time Taken.
2. **Score Distribution Histogram**: Interactive bar chart displaying student score distribution across performance brackets (<0, 0–50, 50–100, 100–150, 150–200, 200–250, 250–300).
3. **Ranked Student Leaderboard**:
   - Rank, Student Name, Username, Batch.
   - Subject-wise scores (Physics / Chemistry / Mathematics).
   - Total Marks, Percentile, and Time Taken.
   - Click **View Result** on any student row to inspect their exact submission, chosen options, and question-by-question timing.
4. **Question Item Discrimination & Calibration**:
   - Displays every question with its assigned difficulty vs actual student accuracy (% correct).
   - Identifies "High Error Rate" questions that faculty should review in class.
5. **Export CSV Button**:
   - Click **Export CSV** in the top right to download a comprehensive spreadsheet containing all candidate scores, percentiles, and section breakdowns, ready to share with institute leadership or parents.

---

### 3.8 Cohort Analytics & Weak Topic Detection

Navigate to **Cohort Analytics** (`/teacher/analytics`):
- **Cross-Test Trends**: Tracks student score progression across multiple mock tests throughout the academic year.
- **Batch Comparison**: Compare average scores between different class sections or branches.
- **Class-Wide Weak Chapters Table**:
  - Aggregates all student responses across all tests.
  - Highlights chapters with the lowest accuracy percentages (e.g., *Rotational Dynamics: 28% Accuracy*, *Ionic Equilibrium: 31% Accuracy*).
  - Helps faculty prioritize upcoming revision lectures.

---

## 4. Student Test-Taking Guide

### 4.1 Sign-in & Dashboard
1. Visit the platform URL (`https://your-domain.vercel.app`).
2. Enter your 10-digit mobile phone number (e.g. `9876543210`) and click **Sign in as Student**.
3. The **Student Dashboard** (`/student`) displays:
   - **Active Tests**: Exams available to take right now.
   - **Upcoming Tests**: Scheduled future tests with opening times and syllabus details.
   - **Completed Tests**: Past exams with scores, percentiles, and solution review links.

---

### 4.2 Instructions & Declaration
1. Click **Take Test** on any active exam.
2. The **Instructions Screen** (`/student/tests/[id]`) opens:
   - Exam duration (e.g. 180 minutes).
   - Total questions (e.g. 75 questions: 25 Physics, 25 Chemistry, 25 Mathematics).
   - Marking scheme (+4 for correct, -1 for incorrect, 0 for unattempted).
   - Visual guide to the 5-color NTA question palette.
3. Read the student declaration checkbox:
   > *"I have read and understood all instructions. I agree not to use unauthorized materials during the examination."*
4. Check the box and click **I am ready to begin**.

---

### 4.3 NTA-Style CBT Test Runner

The Test Runner (`/student/attempts/[id]`) replicates the official JEE Online Test interface:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SRSMA JEE Online Test Test Platform  Time Left: [ 02:45:12 ] [Submit]│
├─────────────────────────────────────────────────────────────────────────────┤
│ [ Physics (25) ]  [ Chemistry (25) ]  [ Mathematics (25) ]                  │
├──────────────────────────────────────────────────┬──────────────────────────┤
│ Question No. 14                        [+4, -1]  │ QUESTION PALETTE (PCM)   │
│                                                  │                          │
│ A particle of mass m moves under a central force │  1   2  [3]  4   5   6   │
│ F(r) = -k/r^2. The total energy of the orbit is: │  7   8   9  10  11  12   │
│                                                  │ 13  14  15  16  17  18   │
│ (A) E > 0                                        │ 19  20  21  22  23  24   │
│ (B) E < 0                                        │ 25                       │
│ (C) E = 0                                        │                          │
│ (D) E can be positive or negative                │ 🟩 Answered (18)         │
│                                                  │ 🟥 Not Answered (4)      │
├──────────────────────────────────────────────────┤ 🟪 Marked for Review (2) │
│ [Save & Next]   [Mark for Review & Next]  [Clear]│ ⬜ Not Visited (51)      │
└──────────────────────────────────────────────────┴──────────────────────────┘
```

#### Palette Status Indicators:
- 🟩 **Green**: **Answered** — You have selected an answer.
- 🟥 **Red**: **Not Answered** — You have viewed the question but not selected an answer.
- 🟪 **Purple**: **Marked for Review** — You marked the question to review later; no answer saved.
- 🟪🟢 **Purple with Green Circle**: **Answered & Marked for Review** — An answer is recorded AND flagged for review. *(Under standard NTA rules, this answer IS evaluated for marks upon final submission).*
- ⬜ **Grey**: **Not Visited** — You have not navigated to this question yet.

#### Question Types:
- **Multiple Choice Questions (MCQ)**: Click an option radio button (A, B, C, D).
- **Numerical / Integer Questions**: Type the numeric answer (supports integers and decimals; input sanitizer prevents invalid characters).

#### Navigation Controls:
- **Save & Next**: Saves your response and moves to the next question.
- **Mark for Review & Next**: Marks the question for review and advances to the next question.
- **Clear Response**: Clears your selected option or numeric input for the current question.
- **Palette Grid**: Click any number in the palette to jump directly to that question.
- **Subject Tabs**: Click **Physics**, **Chemistry**, or **Mathematics** in the header to switch sections at any time.

---

### 4.4 Disconnect Resilience & Offline Mirroring

The SRSMA platform features robust offline resilience built for unpredictable network conditions:
- **Autosave**: Every answer selection, option change, or numerical entry is sent to the server in the background.
- **Local IndexedDB Mirroring**: Every interaction is simultaneously mirrored into the student's browser storage (`IndexedDB`).
- **Connection Loss**: If WiFi, cellular data, or server connection drops:
  - The student can continue answering, changing options, and navigating questions uninterrupted.
  - The local timer continues accurately.
  - When connection is restored, pending changes are automatically synchronized to the server.
- **Accidental Refresh / Close**: If the browser tab is accidentally closed or refreshed, reopening the test immediately restores the exact state, answered questions, and remaining time.

---

### 4.5 Submission & Attempt Summary
1. Click the **Submit Test** button in the top navigation bar.
2. The **Exam Summary Modal** appears, showing your attempt breakdown by section:
   - Answered
   - Not Answered
   - Marked for Review
   - Answered & Marked for Review
   - Not Visited
3. Click **Confirm & Submit**.
4. The server closes the attempt, records completion timestamps, and runs the grading engine.

---

### 4.6 Scorecard, Solutions & Overtime Analysis

Immediately upon submission (or after faculty release for *On Release* exams), navigate to the **Result & Solutions Review** screen (`/student/attempts/[id]/result`):

#### 1. Scorecard Summary
- **Total Score** (e.g., `214 / 300`)
- **Percentile** and **Cohort Rank**
- **Subject Breakdown**: Score, accuracy percentage, and attempted vs unattempted counts for Physics, Chemistry, and Mathematics.

#### 2. Detailed Solutions Review
- Inspect all questions with their complete step-by-step solutions formatted in KaTeX math.
- **Side-by-Side Comparison**:
  - Displays your recorded answer vs the correct answer.
  - Marked with clear status badges: **Correct (+4)**, **Incorrect (-1)**, **Unattempted (0)**.
- **Overtime Flag (⏱ Overtime)**:
  - If a student spent >1.5× the recommended time on a question (e.g. 5 minutes on a 2-minute question), an **Overtime Badge** is flagged to highlight pacing bottlenecks.
- **Filter Tabs**: Quickly filter the review by:
  - `All Questions`
  - `Correct`
  - `Incorrect (Mistakes)`
  - `Unattempted`
  - `Overtime`

---

### 4.7 Personal Analytics & Chapter Mastery

Navigate to **Analytics** (`/student/analytics`):
- **Score Progression Curve**: Graph showing score improvement across successive mock exams.
- **Subject Accuracy Breakdown**: Percentage accuracy in Physics vs Chemistry vs Mathematics.
- **Chapter Mastery Grid**: Identifies strong chapters (high accuracy), moderate chapters, and weak chapters that need targeted practice.

---

## 5. Security & Anti-Cheating Architecture

1. **Answer-Key Leak Prevention (Zero-Leak Choke Point)**:
   - Question payloads served to students during an active test pass strictly through `toStudentQuestion()` in `src/lib/dto.ts`.
   - Fields such as `answer`, `solution`, `difficulty`, and `extraction_notes` are **never sent over the network** to the student browser.
   - Verified by automated unit tests in `src/lib/dto.leak.test.ts`.
2. **Server-Side Authoritative Grading**:
   - The student client never computes marks.
   - When submitting, answers are scored on the server inside a single atomic database transaction (`POST /api/attempts/:id/submit`).
3. **Question & Option Randomization**:
   - Question order and MCQ option keys (A, B, C, D) are shuffled uniquely for every attempt, preventing adjacent students from copying answers.
4. **Authoritative Countdown & Auto-Submit Sweep**:
   - The countdown timer is anchored to the server-recorded `startedAt` timestamp. Changing system clock time on the client has no effect.
   - The background sweep daemon (`/api/cron/sweep-expired`) automatically closes and scores tests whose time has expired.

---

## 6. Operational Commands & CLI Scripts

All administrative operations are executed from the project root using standard npm scripts:

| Command | Description |
|---|---|
| `npm run migrate` | Applies all pending PostgreSQL database migrations from `drizzle/` |
| `npm run seed:admin` | Creates or updates the primary faculty admin account in the database |
| `npm run regrade` | Re-grades any attempts that were closed without a recorded score |
| `npm run test` | Runs the complete Vitest test suite (grading engine, leak prevention, schemas) |
| `npm run typecheck` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run verify` | Runs typecheck, token validation, and unit tests in sequence |
| `npm run build` | Compiles the production Next.js application bundle |
| `npm run start` | Runs the compiled Next.js application locally |

### Provisioning Faculty Admin via Command Line
To create or update the staff login credentials in your Supabase database:

```powershell
$env:DATABASE_URL="postgresql://postgres.dpxjyeofofgizlfvwvkv:SRSMA%40108%21%21@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
$env:ADMIN_USERNAME="Teacher"
$env:ADMIN_PASSWORD="SRSMA@108"
$env:ADMIN_FULLNAME="SRSMA Faculty"
$env:ADMIN_EMAIL="exams.srsma@gmail.com"
npm run seed:admin
```

---

## 7. Environment Variables Reference

Configure these environment variables in your Vercel Project Settings (**Settings → Environment Variables**):

| Variable | Example / Format | Required | Purpose |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.xxx:pass@aws-0-...pooler.supabase.com:6543/postgres?sslmode=require` | **Yes** | Supabase Supavisor Transaction Pooler connection string |
| `DATABASE_POOL_MAX` | `10` | Optional | Maximum PostgreSQL connection pool limit per serverless function (default: 10) |
| `SESSION_SECRET` | `kO87M9iPWSqCTtHasbSjHQ1Sfbru4TFFbw35n4tKxQA` | **Yes** | 32+ byte cryptographic secret for signing 90-day user session cookies |
| `COOKIE_SECURE` | `true` | **Yes** | Enforces HTTPS-only cookie transmission in production |
| `CRON_SECRET` | `cee0fa379c396c15290ea1a528c9cc92` | **Yes** | Security bearer token for triggering `/api/cron/sweep-expired` |
| `DISABLE_SWEEP_TIMER` | `true` | **Yes** | Disables in-process Node.js `setInterval` timers for Vercel serverless compatibility |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | **Yes** | Canonical base URL of the deployed application |

---

## 8. Troubleshooting & Common Questions

### Q1: Why can't faculty log in at `/login`?
**A**: `/login` is exclusively for students via phone numbers. Faculty and administrators must use the dedicated, restricted staff portal at **`/SRSMA`**.

### Q2: How does the free Supabase database stay active without pausing?
**A**: Supabase free projects pause after 7 days of inactivity. Setting up a free 2-minute cron job on [cron-job.org](https://cron-job.org) targeting `https://your-domain.vercel.app/api/cron/sweep-expired?key=YOUR_CRON_SECRET` pings your database every 2 minutes 24/7, ensuring it **never goes to sleep**.

### Q3: What if a student accidentally refreshes or loses internet during a test?
**A**: Responses are saved both to server memory and local browser `IndexedDB`. If the student refreshes or regains internet, they can re-open the test with all answered questions, marked states, and remaining time fully intact.

### Q4: How do I change an answer key after a test has already been taken?
**A**: 
1. Edit the question in the **Question Editor** (`/teacher/questions/[id]`) and update the answer.
2. Run `npm run regrade` via PowerShell. The grading engine recalculates scores and percentiles for all submitted attempts.

### Q5: Can students see the answers by inspecting network requests?
**A**: No. The platform uses a strict Data Transfer Object (DTO) projection layer (`toStudentQuestion`) that omits answer keys and explanations from all student network payloads until after submission and release.

---

## 9. Serverless Architecture & Vercel Free-Tier Optimization

### 9.1 The Vercel Hobby Plan 12-Function Constraint
Vercel enforces a strict platform limit on the **Hobby Plan (Free Tier)**:
```
No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.
```
In default Next.js App Router applications, each independent `route.ts` file under `src/app/api/` is compiled into a standalone Serverless Function (`.func` bundle). Because this platform features 39 modular API endpoints (auth, tests, questions, attempts, analytics, cron, media, papers), a default setup generated 39 separate Lambda functions, instantly failing Vercel's deployment validator and prompting for a paid Pro upgrade ($20/seat/month).

### 9.2 The Unified Router Architecture (`/api`, `/student`, `/teacher`)
To ensure the platform remains **100% free forever ($0.00/month)** without compromising modularity, all API routes and application pages are dispatched through high-performance catch-all routers and static pre-rendering:
- **API Router (1 Function)**: [`src/app/api/[[...slug]]/route.ts`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/Study_App/src/app/api/[[...slug]]/route.ts) dispatches all 39 API routes.
- **Student Portal (1 Function)**: [`src/app/student/[[...slug]]/page.tsx`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/Study_App/src/app/student/[[...slug]]/page.tsx) dispatches tests, CBT runner, scorecard, and analytics.
- **Faculty Portal (1 Function)**: [`src/app/teacher/[[...slug]]/page.tsx`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/Study_App/src/app/teacher/[[...slug]]/page.tsx) dispatches overview, test builder, question bank, papers, verify studio, and analytics.
- **Public & Auth Pages (0 Functions - Static CDN)**: `/`, `/boardChallenge`, `/login`, and `/SRSMA` are statically pre-rendered (`○ (Static)`).

**Impact on Function Count**:
- Default App Router: **39 API functions + 23 dynamic pages = 62 functions** (severely blocked on Hobby tier).
- Consolidated Architecture: **1 API function + 1 Student function + 1 Faculty function = 3 functions total** (75% below the 12-function cap, leaving 9 functions of headroom).

### 9.3 Performance & Zero Latency Regression
Consolidating handlers into unified routers not only avoids paid plans, but **significantly improves real-world performance**:
1. **Shared Warm Container**: In a multi-function setup, a student logging in, starting a test, and submitting answers hits three separate cold Lambdas. With the unified router, the Lambda environment (database connection pool, auth tokens, compiled Zod schemas) stays warm across the entire user journey.
2. **Reduced Cold Starts**: Cold start latency drops from occurring across dozens of disparate routes to a single shared execution context.
3. **Identical URL & API Contracts**: All URLs (`/teacher/tests/[id]`, `/student/attempts/[id]/result`, `/api/auth/login`, etc.) remain 100% identical. No frontend, mobile, or external cron modifications are required.
4. **Resilient Dual Storage**: Uploaded question papers (PDFs) and diagrams are stored with sha256 deduplication in Supabase PostgreSQL (`stored_files` table), completely eliminating read-only filesystem errors (`ENOENT: mkdir /var/task/data`) on serverless runtimes.
