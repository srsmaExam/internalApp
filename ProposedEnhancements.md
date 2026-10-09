# Proposed Enhancements & Strategic Roadmap — SRSMA JEE CBT Platform

**Companion Document to:** [`bugReports.md`](bugReports.md)  
**Date:** September 2026  
**Architectural References:**
- 📖 [Production Operations & User Guide](README.production.md)
- 🚀 [Production Setup & Deployment Guide](PRODUCTION-SETUP-GUIDE.md)
- 💻 [System Low-Level Design (LLD)](JEE-Test-Platform-LLD.md)
- 📄 [General Platform Readme](README.md)

---

## 1. Executive Vision & Objectives

Following the production deployment and consolidation of the **SRSMA JEE Online Test CBT Platform** onto Vercel and Supabase ([PRODUCTION-SETUP-GUIDE.md](PRODUCTION-SETUP-GUIDE.md)), the core engine successfully achieves $0.00/month operating cost with 100% test coverage for leak prevention and atomic grading.

This document proposes **state-of-the-art architectural, aesthetic, user flow, and design system enhancements**. The goal is to elevate the platform from a functional CBT tool to an **institutional-grade, visually stunning, and frictionless educational experience** that rivals commercial testing software (such as Allen, Resonance, and the official NTA Portal).

```mermaid
graph LR
    subgraph Layer 1: Visual & Design
        A1[Modern Typography & Hierarchy]
        A2[Sleek Dark Theme & Glassmorphism]
        A3[WCAG AAA Accessible NTA Palette]
    end

    subgraph Layer 2: Seamless User Flows
        B1[Zero-Latency Session Handshake]
        B2[Pre-Exam KaTeX Diagnostic]
        B3[Sectional Review Before Submit]
        B4[Interactive Solution Explorer]
    end

    subgraph Layer 3: Faculty Cockpit
        C1[Direct Supabase Storage Upload]
        C2[PDF Crop Studio v2]
        C3[Test Simulator & Live Proctoring]
    end

    subgraph Layer 4: Cloud Architecture
        D1[Distributed Locking & Rate Limits]
        D2[Typed API Client Layer]
        D3[Native Bytea Storage Optimization]
    end

    Layer 1: Visual & Design --> Platform[SRSMA JEE Platform]
    Layer 2: Seamless User Flows --> Platform
    Layer 3: Faculty Cockpit --> Platform
    Layer 4: Cloud Architecture --> Platform
```

---

## 2. Highest-Leverage Upgrades (Top 5 Priorities)

| # | Strategic Enhancement | Target Surface | Operational Impact | Effort |
|---|---|---|---|:---:|
| 1 | **Direct Supabase Storage Pre-Signed Upload** | Faculty PDF Ingestion | Completely eliminates Vercel's 4.5 MB payload barrier ([BUG-08](bugReports.md#bug-08)), enabling 20–50MB official JEE question paper uploads without proxy timeouts. | **M** |
| 2 | **CBT Section Review Modal with Quick-Jump** | Student Exam Runner | Replaces raw browser alerts with an NTA-compliant sectional summary modal, allowing students to filter unanswered questions before final submission. | **S** |
| 3 | **Lightweight `/api/auth/me` Endpoint** | Authentication Handshake | Drops login handshake latency by ~85% by removing the expensive multi-table analytics query on `/login` ([BUG-13](bugReports.md#bug-13)). | **S** |
| 4 | **Interactive Solution Explorer & Bookmarking** | Student Post-Exam Review | Empowers students to filter "Overtime Questions (⏱)", bookmark difficult problems for revision, and filter by mistake patterns. | **M** |
| 5 | **Design System & Aesthetics Polish (Inter + Outfit + Glassmorphism)** | Global Platform UI | Implements vibrant dark-mode depth, glassmorphic headers, micro-animations, and high-contrast accessible palette indicators. | **M** |

*Effort Scale: **S** (< 1 day) · **M** (2–4 days) · **L** (1–2 weeks)*

---

## 3. Design System, Aesthetics & Visual Polish

Modern educational software must feel dynamic, responsive, and visually exhilarating. A plain interface leads to student fatigue during 3-hour mock exams.

### 3.1 Curated Typography & Hierarchy
Currently, the application relies solely on standard Inter. We recommend adopting a two-tier typographic hierarchy:
- **Headings & Badges**: **Outfit** or **Plus Jakarta Sans** (via `next/font/google`). Gives titles, timers, and percentiles a crisp, geometric, premium feel.
- **Body & Controls**: **Inter** (already present) with optimized letter-spacing (`tracking-tight` on metrics, `tracking-normal` on question bodies).
- **Mathematical Formulas & Equations**: Native **KaTeX** font rendering fine-tuned with anti-aliasing (`subpixel-antialiased`) and custom CSS padding to prevent subscript/superscript clipping.

```css
/* src/app/globals.css font tokens */
:root {
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

.cbt-timer {
  font-family: var(--font-display);
  font-feature-settings: 'tnum' 1, 'ss01' 1; /* Monospaced tabular numbers to prevent timer jitter */
}
```

### 3.2 Deep Dark Navy Theme & Glassmorphism
The student portal and landing pages should provide an immersive dark aesthetic that minimizes eye strain during extended night study sessions:
1. **Background Foundation**: Deep rich navy (`#070d18` / `slate-950`) instead of flat pure black (`#000000`).
2. **Glassmorphism Header**:
   - `backdrop-blur-md bg-slate-900/75 border-b border-slate-800/80`
   - Gives the navigation bar and countdown timer a modern floating HUD appearance.
3. **Card Elevation & Depth**:
   - Multi-layer shadows: `shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]`
   - Subtle outer borders: `ring-1 ring-white/10` to clearly delineate questions and options.

### 3.3 Accessible NTA 5-State Question Palette
In accordance with [README.md:123-128](README.md#L123-L128), the platform uses 5 color states:
- 🟩 **Green**: Answered
- 🟥 **Red**: Not Answered (Visited)
- 🟪 **Purple**: Marked for Review
- 🟪🟢 **Purple with Green Dot**: Answered & Marked for Review (Evaluated)
- ⬜ **Grey**: Not Visited

#### High-Contrast & Colorblind Accessibility Upgrade:
To comply with WCAG 2.1 AAA accessibility standards:
1. **Dual Indicators**: Do not rely on color alone. Include micro-shape cues:
   - Green: Solid Circle with a white checkmark icon (✓).
   - Red: Rounded square with an exclamation point or dot.
   - Purple: Diamond flag icon.
2. **Active Focus Ring**: The question currently displayed in the viewport should have a pulsing double ring (`ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-900`) so candidates never lose their place in 75 questions.

### 3.4 Micro-Interactions & Haptic Motion
- **Option Selection**: Smooth 150ms scale-up (`scale-[1.01]`) with instant border illumination (`border-brand-500 bg-brand-500/10`) when an MCQ radio option is clicked.
- **Timer Pulse**: When the remaining exam time dips below 15 minutes, the timer subtly transitions to amber with a gentle pulse animation. Below 5 minutes, it transitions to crimson alert.
- **Scorecard Reveal**: On `/student/attempts/[id]/result`, animate the total marks counter from 0 to actual score over 800ms using a lightweight CSS counting transition.

---

## 4. Student Flow & CBT Experience Enhancements

### 4.1 Lightweight `/api/auth/me` Handshake
**Current Problem:** [BUG-13](bugReports.md#bug-13) reveals that `LoginForm.tsx` executes `/api/analytics/student/me` simply to verify if a user has an active session. This runs complex SQL aggregations on cold start.
**Enhancement:**
- Create `GET /api/auth/me`:
  ```ts
  // Fast, O(1) session check directly from JWT cookie
  export const GET = withApi(async () => {
    const session = await getSession();
    if (!session) return json({ authenticated: false });
    return json({
      authenticated: true,
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
    });
  });
  ```
- Instant redirection to `/student` in < 15ms.

### 4.2 Interactive Pre-Exam Diagnostic Screen
Before entering a high-stakes 3-hour test at `/student/tests/[id]`:
- **Network Latency Ping**: Display real-time ping to the server (`e.g. 24ms • Connection Excellent`).
- **KaTeX Verification Sample**: Render a sample integral equation ($\int_0^1 x^2 dx = \frac{1}{3}$) and ask the student to verify it displays cleanly without raw LaTeX source visible.
- **Screen Orientation Lock**: On mobile devices, suggest landscape mode for an optimal CBT layout.

### 4.3 Section Review Modal Before Submission
Currently, clicking "Submit Test" directly prompts for confirmation. In official NTA JEE Online Test exams, candidates are presented with a **comprehensive sectional breakdown modal**:

```
+-------------------------------------------------------------------------------+
|                             EXAM SUMMARY REVIEW                               |
+-------------+----------+--------------+-------------+------------------+------+
| Subject     | Answered | Not Answered | Marked Rev. | Ans. & Marked*   | Left |
+-------------+----------+--------------+-------------+------------------+------+
| Physics     |    22    |       3      |      2      |        1         |  2   |
| Chemistry   |    25    |       1      |      1      |        0         |  3   |
| Mathematics |    18    |       5      |      4      |        2         |  1   |
+-------------+----------+--------------+-------------+------------------+------+
| Total (75)  |    65    |       9      |      7      |        3         |  6   |
+-------------+----------+--------------+-------------+------------------+------+
* Note: Questions "Answered & Marked for Review" WILL be evaluated for marks.

[ Jump to Unanswered Questions ]               [ Cancel ]    [ Confirm Submit ]
```

- Clicking **"Jump to Unanswered Questions"** immediately closes the modal and focuses the first unattempted question in the candidate's active subject.

### 4.4 Post-Exam Solution Explorer & Personal Revision Queue
In `/student/attempts/[id]/result` ([README.production.md:32](README.production.md#L32)):
- **Filter by Mistake Type**:
  - `Overtime (⏱ > 1.5× Expected)`: Reveals questions where the candidate spent 5+ minutes and still got the question wrong (identifying time-traps).
  - `Unforced Errors`: Filter questions answered incorrectly where the candidate spent < 45 seconds (guessing or silly mistakes).
- **One-Click Bookmark for Revision**: Allow students to click a Bookmark (⭐) icon next to any difficult KaTeX problem to save it to their personal "Revision Notebook" under `/student/bookmarks`.

---

## 5. Faculty & Administrator Cockpit Enhancements

### 5.1 Direct Supabase Storage Upload for Large PDF Papers
**Current Problem:** [BUG-08](bugReports.md#bug-08) notes that Vercel enforces a 4.5 MB request limit, dropping official 25-page JEE papers (> 4.5 MB).
**Proposed Architecture:**
1. Client requests an upload token: `POST /api/papers/upload-url` with `{ filename: "JEE_2026_Shift1.pdf", size: 18450000 }`.
2. Server generates a signed Supabase Storage URL (`papers/raw/JEE_2026_Shift1.pdf`).
3. Browser uploads the binary PDF **directly to Supabase Storage** via HTTP PUT with a visual progress bar (`0% → 100%`).
4. Once completed, the browser posts the file key and SHA256 checksum to `/api/papers` to register the paper in PostgreSQL.
**Result:** Bypasses Vercel entirely. Supports up to 50 MB PDFs with zero memory spikes on serverless functions.

### 5.2 PDF Crop Studio v2 (Enhanced Crop Workspace)
In `/teacher/papers/[id]/verify`:
- **Canvas Zoom & Pan Controls**: Provide `50%`, `100%`, `150%`, `200%` zoom buttons and mouse-wheel zoom for intricate diagrams, circuits, and subatomic reaction schemes.
- **Auto-Detect Diagram Box**: Double-clicking an area on the PDF can use lightweight canvas edge-detection to snap the crop box around rectangular graphs or tables automatically.
- **Aspect Ratio Preview**: Show a live preview of how the cropped diagram will render inside the student's question box before saving.

### 5.3 Faculty "Test Simulator" (Mock Student Sandbox)
Currently, faculty must either create a fake student account or publish the test to preview it.
- Introduce a **"Test Simulator"** mode in `/teacher/tests/[id]`.
- Faculty can experience the exam in full-screen CBT mode with the timer running, test option shuffling, and verify answer keys.
- Simulator attempts are flagged with `is_simulation: true` so they never alter cohort rankings, percentiles, or student score distributions.

### 5.4 Student Roster CSV Export & Batch Promotion
In `/teacher/students` ([README.production.md:87-100](README.production.md#L87-L100)):
- **Export to CSV**: Download the active student roster (including Student Name, Phone, Username, Batch, Tests Taken, and Cohort Rank) for offline institutional reporting.
- **Bulk Batch Reassignment**: Select multiple students with checkboxes and click `Actions → Move to Batch (e.g. "JEE 2026 Droppers")`.

### 5.5 Real-Time Live Exam Proctoring Cockpit
For active weekend tests with 100+ candidates:
- An administrative live monitor screen (`/teacher/tests/[id]/live`) displaying:
  - **Active Candidates Count**: Number of students currently in progress.
  - **Questions Answered Rate**: Live ticker of questions submitted per minute.
  - **Disconnect Alerts**: Highlights any student whose client has not checked in via heartbeat in > 60 seconds (allowing teachers to assist with Wi-Fi issues).

---

## 6. Architecture, Scalability & Cloud Security

### 6.1 Serverless Concurrency & Distributed Lock Upgrade
**Current Problem:** [BUG-09](bugReports.md#bug-09) notes that `withDbLock` (`src/lib/db-lock.ts`) and `rateLimit` (`src/lib/rate-limit.ts`) are in-memory singletons that provide zero safety when Vercel spins up multiple Lambda containers.
**Enhancement Plan:**
1. **Database Advisory Locks for Critical Transactions**:
   Replace process-local locks with PostgreSQL native transaction advisory locks:
   ```ts
   // Safe across all serverless containers and poolers
   await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${testId}))`);
   ```
2. **Distributed Rate Limiting via Upstash Redis (100% Free Tier)**:
   - Upstash provides 10,000 free commands/day.
   - Using `@upstash/ratelimit`, IP rate limiting is shared globally across all edge regions and serverless Lambdas.

### 6.2 PostgreSQL `bytea` Migration for `stored_files`
**Current Problem:** [BUG-15](bugReports.md#bug-15) shows that media files are stored as base64 strings in PostgreSQL `text` columns, inflating disk storage by 33%.
**Enhancement:**
- Update schema from `text('data')` to `customType<Buffer>({ dataType() { return 'bytea'; } })`.
- Saves ~33% storage on Supabase PostgreSQL, staying well within the 500 MB free tier for thousands of questions.

### 6.3 Anti-Cheating: Tab-Switch & Focus Tracking
In CBT exams, maintaining integrity is paramount:
- Add a client-side listener in `TestRunnerClient.tsx`:
  ```ts
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logAttemptEvent(attemptId, 'tab_unfocused', { timestamp: Date.now() });
    }
  });
  ```
- Record blur events in `attempt_events`.
- In the teacher scorecard review, display:
  `⚠️ Candidate switched browser tabs 4 times during the examination.`

### 6.4 Typed API Client Layer (`src/lib/api-client.ts`)
Prevent client/server URL drift forever:
```ts
export const api = {
  auth: {
    me: () => get<AuthMeResponse>('/api/auth/me'),
    login: (body: LoginPayload) => post<LoginResponse>('/api/auth/login', body),
  },
  attempts: {
    getQuestions: (id: string) => get<QuestionRuntimeState[]>(`/api/attempts/${id}/questions`),
    submit: (id: string, payload: SubmitPayload) => post<SubmitResponse>(`/api/attempts/${id}/submit`, payload),
  },
  students: {
    list: (params: StudentFilterParams) => get<StudentListResponse>('/api/students', params),
  },
};
```

---

## 7. Phased Implementation Roadmap

```
PHASE 1: Core Integrity & Quick Wins (Immediate)
├── Fix P0/P1 bugs from bugReports.md (BUG-01, BUG-02, BUG-03, BUG-04, BUG-07)
├── Deploy lightweight GET /api/auth/me endpoint
└── Add Section Review Summary modal in CBT Test Runner

PHASE 2: Design & Aesthetic Elevation (Week 1)
├── Integrate Outfit + Inter typography hierarchy & monospaced timer
├── Polish deep dark theme (#070d18) & glassmorphism headers
├── Upgrade NTA 5-color palette with high-contrast icon badges (WCAG AAA)
└── Implement option selection micro-animations & timer alerts

PHASE 3: Media & Storage Modernization (Week 2)
├── Implement direct pre-signed PDF upload to Supabase Storage (bypassing 4.5MB)
├── Migrate stored_files from base64 text to native bytea in PostgreSQL
├── Purge orphaned diagram binaries during bulk question deletions
└── Upgrade PDF Crop Studio v2 with canvas zoom and pan controls

PHASE 4: Advanced Faculty Cockpit & Proctoring (Week 3)
├── Test Simulator / Mock Student Sandbox for teachers
├── Student Directory CSV export & bulk batch reassignment
├── Tab-switch & window blur tracking logged to attempt_events
└── Distributed rate limiting with Upstash Redis or Supabase RPC
```

---

## 8. Alignment with Existing Documentation

This enhancement proposal strictly maintains all commitments defined in:
1. **Zero Operating Cost ($0.00/mo)**: All proposed upgrades leverage free-tier primitives (Vercel Serverless, Supabase Storage free 1GB bucket, Upstash Redis free tier, cron-job.org).
2. **Backward Compatibility**: Local development with embedded PGlite (`npm run dev`) remains 100% functional with local disk fallbacks ([README.local.md](README.local.md)).
3. **NTA Compliance**: Marking schemes (+4, -1, 0), time sweep daemons, and randomized question/option shuffling remain completely intact ([JEE-Test-Platform-LLD.md](JEE-Test-Platform-LLD.md)).
