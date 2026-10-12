# Build & CI Integrity Rule

## Context
Cloudflare Pages and CI environments execute `npm run build:cloudflare` (which runs `opennextjs-cloudflare build` -> `next build`). Next.js performs type checking and ESLint analysis during the production build step. Any ESLint rule configured as an **error** (or any TypeScript compile error) will immediately fail the production build.

## Permanent Instructions for Antigravity & Developers
1. **Zero ESLint Errors**:
   - Never introduce code that triggers ESLint errors (`no-useless-escape`, `react-hooks/rules-of-hooks`, `no-restricted-globals`, etc.).
   - Specifically for regex: do not escape characters inside regex character classes `[...]` that do not require escaping (e.g., use `/[/\\]/g` instead of `/[\/\\]/g`).
2. **Pre-Deployment / Pre-Commit Verification**:
   - Whenever modifying source code, verify build integrity by ensuring:
     ```bash
     npm run lint
     npm run typecheck
     ```
     pass with 0 errors.
   - When touching shared logic or critical paths, run `npm run test` or `npm run verify` (`npm run typecheck && npm run check-tokens && npm run test`).
3. **Build Validation**:
   - If there are doubts about Cloudflare/Next.js compatibility, validate locally with:
     ```bash
     npm run build
     ```
     before pushing changes.
