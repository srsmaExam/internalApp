# Cloudflare Pages + Supabase Deployment Guide
### Vidya Test Prep / Shri Ram Smart Minds Academy (SRSMA)

This guide provides end-to-end instructions for deploying this Next.js 15 application to **Cloudflare Pages / Workers** backed by **Supabase PostgreSQL**.

---

## 1. Summary of Changes Made to the Codebase

1. **Cloudflare OpenNext Adapter Configured**:
   - Installed `@opennextjs/cloudflare` and `wrangler`.
   - Created [`open-next.config.ts`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/open-next.config.ts) for Cloudflare edge bundle transformations.
   - Created [`wrangler.jsonc`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/wrangler.jsonc) configured with `nodejs_compat`, asset binding, and modern compatibility date.
2. **Next.js & Build Optimization**:
   - Fixed CSS syntax error in [`src/app/globals.css`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/src/app/globals.css).
   - Added `outputFileTracingIncludes` and `initOpenNextCloudflareForDev()` in [`next.config.mjs`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/next.config.mjs) to trace Next.js metadata routes during esbuild bundling.
3. **Database Layer (Supabase + Cloudflare Hyperdrive)**:
   - Updated [`src/db/client.ts`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/src/db/client.ts) to detect **Cloudflare Hyperdrive** bindings (`HYPERDRIVE` or `DATABASE`), falling back to `DATABASE_URL`.
   - Added an error event listener to the connection pool (`pool.on('error')`) to safely handle idle socket disconnects when edge isolates sleep without crashing.
   - Guarded background interval timers so they don't run in ephemeral serverless edge isolates.
4. **Environment & Script Additions**:
   - Added npm scripts to [`package.json`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/package.json): `build:cloudflare`, `preview:cloudflare`, `deploy:cloudflare`.
   - Made Vercel analytics in [`src/app/layout.tsx`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/src/app/layout.tsx) conditional so it won't trigger 404 network errors on Cloudflare.
   - Updated [`.gitignore`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/.gitignore) to exclude `.open-next`, `.wrangler`, and `.dev.vars`.
   - Updated [`.env.production.example`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/.env.production.example) with Supabase pooler connection details.

---

## 2. Supabase Setup (PostgreSQL Database)

### Step 2.1: Create a Free Project on Supabase
1. Go to [https://supabase.com](https://supabase.com) and log in / sign up.
2. Click **New Project**.
3. Choose an organization, enter a project name (e.g., `srsma-exam-db`), and set a **strong database password** (save this password safely).
4. Select the region closest to your students (e.g., **South Asia - Mumbai (ap-south-1)** or **Singapore (ap-southeast-1)**).
5. Click **Create new project** and wait ~2 minutes for provisioning.

### Step 2.2: Retrieve Connection String
In your Supabase project dashboard:
1. Navigate to **Project Settings** (gear icon) > **Database**.
2. Scroll to the **Connection string** section.
3. Select the **URI** tab, then toggle **Transaction Pooler** (Port **6543**):
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
   > [!IMPORTANT]
   > **Always use Port 6543 (Transaction Pooler / Supavisor)** for Cloudflare / Serverless. The direct connection on Port 5432 has limited connections on the free tier, whereas the Transaction Pooler easily handles hundreds of concurrent student sessions!
   > 
   > If your password contains special characters (like `@`, `!`, `#`), URL-encode them (e.g. `@` -> `%40`).

### Step 2.3: Run Database Migrations
Run the migrations from your local development machine against Supabase:

In Windows PowerShell:
```powershell
$env:DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
npm run migrate
```
This will automatically execute all migration SQL scripts in [`drizzle/`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/drizzle) and create all tables in your Supabase database.

### Step 2.4: Seed Admin / Teacher Account
Create the initial administrator account in your Supabase database:
```powershell
npm run seed:admin
```
*(Prints default teacher credentials to your console).*

### Step 2.5: (Optional) Sync Local Question Papers
If you have local exam papers to upload to Supabase:
```powershell
npm run sync:local-paper
```

---

## 3. Cloudflare Deployment

Cloudflare provides two ways to deploy: **Git Integration (Continuous Deployment)** or **Wrangler CLI**.

---

### Option A: Cloudflare Dashboard Git Integration (Recommended)

1. Push your repository to GitHub (or GitLab).
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. Navigate to **Compute (Workers & Pages)** > **Create** > **Pages** (or **Workers**).
4. Select **Connect to Git** and choose your repository.
5. In **Build Settings**:
   - **Framework Preset**: None (or Next.js)
   - **Build command**:
     ```bash
     npm run build:cloudflare
     ```
   - **Build output directory**:
     ```
     .open-next/assets
     ```
6. In **Environment Variables**, add:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` | Supabase Pooler URL |
   | `SESSION_SECRET` | *(Generate a 32+ character random string)* | HMAC-SHA256 session token encryption |
   | `COOKIE_SECURE` | `true` | Enforces HTTPS-only cookies |
   | `CRON_SECRET` | *(Random secret token)* | Protects the auto-submit endpoint |
   | `NEXT_PUBLIC_APP_URL` | `https://your-subdomain.pages.dev` | Public URL of your deployed app |
   | `WHATSAPP_PHONE_NUMBER_ID` | *(Optional - your Meta phone number ID)* | WhatsApp OTP |
   | `WHATSAPP_ACCESS_TOKEN` | *(Optional - your Meta token)* | WhatsApp OTP |
   | `WHATSAPP_TEMPLATE_NAME` | *(Optional - e.g. student_login_otp)* | WhatsApp template |
   | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-D36DLF1HJX` | Google Analytics |
7. Under **Settings** > **Functions / Runtime**:
   - Ensure **Compatibility date** is `2025-01-01` or later.
   - Compatibility flag: `nodejs_compat`
8. Click **Save and Deploy**.

---

### Option B: Wrangler CLI Deployment

You can deploy directly from your local terminal:

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```
2. **Build the Cloudflare Worker package**:
   ```bash
   npm run build:cloudflare
   ```
3. **Configure Secrets in Cloudflare**:
   ```bash
   npx wrangler secret put DATABASE_URL
   # Enter your Supabase connection string when prompted

   npx wrangler secret put SESSION_SECRET
   # Enter your 32+ character random secret
   
   npx wrangler secret put CRON_SECRET
   # Enter your random cron secret
   ```
4. **Deploy**:
   ```bash
   npm run deploy:cloudflare
   ```
   Wrangler will output your live URL (e.g. `https://srsma-test-prep.<your-subdomain>.workers.dev`).

---

## 4. Supercharging Performance: Cloudflare Hyperdrive (Optional & 100% Free)

**Cloudflare Hyperdrive** is a free global connection pooler built into Cloudflare. It maintains open connections to your Supabase PostgreSQL database across Cloudflare’s global edge network and caches queries:

1. **Create Hyperdrive pool**:
   ```bash
   npx wrangler hyperdrive create srsma-supabase-pool --connection-string="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```
2. Copy the resulting `id` (e.g. `c0ffee...`).
3. Open [`wrangler.jsonc`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/wrangler.jsonc) and uncomment the Hyperdrive block:
   ```jsonc
   "hyperdrive": [
     {
       "binding": "HYPERDRIVE",
       "id": "c0ffee..."
     }
   ]
   ```
4. Redeploy with `npm run deploy:cloudflare`.
5. Your application in [`src/db/client.ts`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/src/db/client.ts) will automatically detect the Hyperdrive binding and route all queries through edge pooling!

---

## 5. Background Exam Timer (Auto-Submit Sweeper)

When a student’s exam time expires, the platform auto-submits any remaining in-progress attempts via `/api/cron/sweep-expired`.

### Method A: Cloudflare Cron Triggers
In [`wrangler.jsonc`](file:///c:/Users/panga/OneDrive/Desktop/Seva/SRSMA/TestApp/wrangler.jsonc), add:
```jsonc
  "triggers": {
    "crons": ["*/5 * * * *"]
  }
```

### Method B: External Free Cron (cron-job.org)
1. Go to [https://cron-job.org](https://cron-job.org) (100% free).
2. Create a new cron job:
   - **URL**: `https://<YOUR-CLOUDFLARE-URL>/api/cron/sweep-expired`
   - **Schedule**: Every 5 minutes (or every 10 minutes)
   - **Headers**:
     - `Authorization`: `Bearer <YOUR_CRON_SECRET>`

---

## 6. Verification Checklist

- [ ] Supabase project active and region set to Mumbai / Singapore.
- [ ] Ran `npm run migrate` to apply all database tables.
- [ ] Ran `npm run seed:admin` to initialize the teacher login.
- [ ] Ran `npm run build:cloudflare` locally to confirm 0 compilation errors.
- [ ] Deployed to Cloudflare Pages / Workers.
- [ ] Environment variables (`DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECURE`) configured.
- [ ] Logged into `/login` as teacher and verified the dashboard.
- [ ] Started and submitted a student test to confirm answer saving and score calculation.
