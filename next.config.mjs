/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only pg needs to stay external to the bundler in serverless environments.
  // PGlite is dynamically imported only in local dev/tests, and KaTeX is client-side.
  serverExternalPackages: ['pg'],

  // Lint runs on build again. It had been off with no config file present,
  // which is how ~60 unused imports and two stale-closure effect bugs shipped
  // (react-hooks/exhaustive-deps flags both). See eslint.config.mjs.
  eslint: { dirs: ['src'] },

  // Source PDFs and question images are streamed through authenticated route
  // handlers, never served statically. Nothing large is imported at build time.
  outputFileTracingExcludes: {
    '*': [
      '**/.git/**',
      './.git/**',
      '**/.git/**/*',
      '**/data/**',
      './data/**',
      '**/LocalPaper/**',
      '**/scripts/**',
      '**/node_modules/@electric-sql/**',
      '**/node_modules/pdf-lib/**',
      '**/*.docx',
      '**/*.pdf',
      '**/*.xlsx',
      '**/*.md',
    ],
  },
  outputFileTracingIncludes: {
    '/*': ['./node_modules/next/dist/lib/metadata/**'],
  },
  experimental: {
    largePageDataBytes: 512 * 1024,
  },
};

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

export default nextConfig;
