import fs from 'node:fs';
import path from 'node:path';
import { PROMPTS_DIR } from './paths';
import {
  extract_both_v1_txt,
  extract_solutions_v1_txt,
  extract_v1_txt,
  extract_v2_txt,
  truncation_recovery_txt,
} from './prompts-data';

export type PromptKind = 'questions' | 'solutions' | 'both';

export type PromptVersion = {
  version: string;
  filename: string;
  text: string;
  kind: PromptKind;
};

const STATIC_PROMPTS: Record<PromptKind, PromptVersion[]> = {
  questions: [
    {
      version: 'extract-v2',
      filename: 'extract-v2.txt',
      text: extract_v2_txt,
      kind: 'questions',
    },
    {
      version: 'extract-v1',
      filename: 'extract-v1.txt',
      text: extract_v1_txt,
      kind: 'questions',
    },
  ],
  solutions: [
    {
      version: 'extract-solutions-v1',
      filename: 'extract-solutions-v1.txt',
      text: extract_solutions_v1_txt,
      kind: 'solutions',
    },
  ],
  both: [
    {
      version: 'extract-both-v1',
      filename: 'extract-both-v1.txt',
      text: extract_both_v1_txt,
      kind: 'both',
    },
  ],
};

function readFromDiskIfAvailable(kind: PromptKind): PromptVersion[] | null {
  const isServerless = Boolean(
    process.env.VERCEL === '1' ||
    process.env.CF_PAGES === '1' ||
    process.env.CLOUDFLARE === '1' ||
    process.env.NODE_ENV === 'production' ||
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  );

  if (isServerless) {
    return null;
  }

  try {
    if (typeof fs?.readdirSync !== 'function') return null;

    let pattern: RegExp;
    if (kind === 'solutions') {
      pattern = /^extract-solutions-v(\d+)\.txt$/;
    } else if (kind === 'both') {
      pattern = /^extract-both-v(\d+)\.txt$/;
    } else {
      pattern = /^extract(?:-questions)?-v(\d+)\.txt$/;
    }

    const files = fs
      .readdirSync(PROMPTS_DIR)
      .filter((f) => pattern.test(f))
      .sort((a, b) => {
        const vA = Number(a.match(pattern)?.[1] ?? 0);
        const vB = Number(b.match(pattern)?.[1] ?? 0);
        return vB - vA;
      });

    if (files.length === 0) return null;

    return files.map((filename) => ({
      version: filename.replace(/\.txt$/, ''),
      filename,
      text: fs.readFileSync(path.join(PROMPTS_DIR, filename), 'utf8'),
      kind,
    }));
  } catch {
    return null;
  }
}

/**
 * Lists prompts filtered by kind, newest version first.
 * - 'questions': extract-v*.txt or extract-questions-v*.txt
 * - 'solutions': extract-solutions-v*.txt
 * - 'both': extract-both-v*.txt
 */
export function listExtractionPrompts(kind: PromptKind = 'questions'): PromptVersion[] {
  const fromDisk = readFromDiskIfAvailable(kind);
  if (fromDisk && fromDisk.length > 0) {
    return fromDisk;
  }
  return STATIC_PROMPTS[kind] ?? STATIC_PROMPTS.questions;
}

export function getAllExtractionPrompts(): Record<PromptKind, PromptVersion[]> {
  return {
    questions: listExtractionPrompts('questions'),
    solutions: listExtractionPrompts('solutions'),
    both: listExtractionPrompts('both'),
  };
}

export function getExtractionPrompt(kindOrVersion?: PromptKind | string, version?: string): PromptVersion {
  const isKind = kindOrVersion === 'questions' || kindOrVersion === 'solutions' || kindOrVersion === 'both';
  const targetKind: PromptKind = isKind ? (kindOrVersion as PromptKind) : 'questions';
  const targetVersion = isKind ? version : kindOrVersion;

  const all = listExtractionPrompts(targetKind);
  if (all.length === 0) {
    throw new Error(`No extraction prompts found in prompts/ for kind '${targetKind}'`);
  }
  const found = targetVersion ? all.find((p) => p.version === targetVersion) : all[0];
  return found ?? all[0];
}

export function getTruncationRecoveryPrompt(): string {
  const isServerless = Boolean(
    process.env.VERCEL === '1' ||
    process.env.CF_PAGES === '1' ||
    process.env.CLOUDFLARE === '1' ||
    process.env.NODE_ENV === 'production' ||
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  );

  if (!isServerless) {
    try {
      if (typeof fs?.readFileSync === 'function') {
        const filePath = path.join(PROMPTS_DIR, 'truncation-recovery.txt');
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf8');
        }
      }
    } catch {
      // Fallback
    }
  }

  return truncation_recovery_txt;
}
