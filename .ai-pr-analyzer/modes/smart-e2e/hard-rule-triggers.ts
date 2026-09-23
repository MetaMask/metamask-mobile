/**
 * Smart E2E hard-rule trigger plugins (mode-owned).
 *
 * Extract-tag matchers and selected_tags continue merge live here — not in the
 * analyzer core.
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import {
  evaluateExtractTagsFromChangedSpecs,
  evaluateExtractTagsFromImportGraph,
} from './hard-rule-extract';
import { classifyDomains, augmentTags, CatalogEntry } from './jev-client';

type TriggerCtx = {
  rule: {
    name: string;
    description: string;
    trigger: { type: string; [key: string]: unknown };
  };
  changedFiles: string[];
  context: {
    baseDir: string;
    baseBranch: string;
    prNumber?: number;
    githubRepo?: string;
  };
  catalog: Record<string, Array<{ id: string; description: string }>>;
  utils: { normalizeChangedPath: (path: string) => string };
};

export const triggers = {
  extractTagsFromChangedSpecs: (ctx: TriggerCtx) => {
    const match = evaluateExtractTagsFromChangedSpecs(
      ctx.rule,
      ctx.changedFiles,
      ctx.context,
      ctx.catalog,
      ctx.utils.normalizeChangedPath,
    );
    if (!match) {
      return null;
    }
    return {
      detail: match.detail,
      patch: { selected_tags: match.selectedTags },
    };
  },
  extractTagsFromImportGraph: (ctx: TriggerCtx) => {
    const match = evaluateExtractTagsFromImportGraph(
      ctx.rule,
      ctx.changedFiles,
      ctx.context,
      ctx.catalog,
      ctx.utils.normalizeChangedPath,
    );
    if (!match) {
      return null;
    }
    return {
      detail: match.detail,
      patch: { selected_tags: match.selectedTags },
    };
  },
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function unionTags(seed: string[], ai: string[]): string[] {
  if (seed.includes('ALL')) {
    return ['ALL'];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...seed, ...ai]) {
    if (tag === 'ALL') {
      return ['ALL'];
    }
    if (seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/**
 * Keep hard-rule selected_tags as a floor; AI may add more. ALL stays ALL.
 */
export function mergeContinueResult(
  seed: Record<string, unknown>,
  aiResult: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...seed, ...aiResult };
  if ('selected_tags' in seed || 'selected_tags' in aiResult) {
    merged.selected_tags = unionTags(
      asStringArray(seed.selected_tags),
      asStringArray(aiResult.selected_tags),
    );
  }
  if (
    typeof seed.confidence === 'number' &&
    typeof aiResult.confidence === 'number'
  ) {
    merged.confidence = Math.max(seed.confidence, aiResult.confidence);
  }
  return merged;
}

/**
 * Always continue so AI can still pick performance tags. mergeContinueResult
 * keeps E2E selected_tags as ALL when that was the hard-rule floor.
 */
export function allowContinue(_result: Record<string, unknown>): boolean {
  return true;
}

type PreRenderHookContext = {
  allFiles: string[];
  vars?: Record<string, string>;
  hardRuleSeed?: Record<string, unknown>;
  context: {
    baseDir: string;
    baseBranch: string;
    prNumber?: number;
    githubRepo?: string;
  };
};

function getDiffStat(baseDir: string, baseBranch: string): string {
  try {
    const result = spawnSync(
      'git',
      ['-C', baseDir, 'diff', '--stat', baseBranch],
      {
        encoding: 'utf-8',
        timeout: 10_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    return (result.stdout ?? '').slice(0, 3000);
  } catch {
    return '';
  }
}

/**
 * Pre-render hook: runs Jev before the AI task prompt is rendered.
 *
 * 1. Domain pre-classifier — classifies which MetaMask product areas the PR
 *    touches and injects hints into {{jev_tag_hints}} in the task prompt.
 * 2. Continue-path augmentation — when a hard rule already pre-selected tags
 *    with continue:true, Jev identifies additional catalog tags to add as a
 *    seed floor before the AI runs.
 *
 * No-ops silently if TYPESAFE_API_KEY is unset or Jev errors.
 */
export async function preRenderHook(ctx: PreRenderHookContext): Promise<void> {
  if (!process.env.TYPESAFE_API_KEY) return;

  const diffSnippet = getDiffStat(ctx.context.baseDir, ctx.context.baseBranch);

  // 1. Domain pre-classifier — always runs
  const hints = await classifyDomains(ctx.allFiles, diffSnippet).catch(
    () => '',
  );
  ctx.vars = { ...ctx.vars, jev_tag_hints: hints };

  // 2. Continue-path tag augmentation — only when seed tags exist (not ALL)
  const seed = ctx.hardRuleSeed;
  if (
    seed &&
    Array.isArray(seed.selected_tags) &&
    !seed.selected_tags.includes('ALL')
  ) {
    // Load catalog from the mode directory relative to this file
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const catalog: Record<string, CatalogEntry[]> = require(
      join(__dirname, 'catalog.json'),
    );
    const allEntries: CatalogEntry[] = [
      ...(catalog.e2e ?? []),
      ...(catalog.performance ?? []),
    ];

    const extra = await augmentTags(
      ctx.allFiles,
      diffSnippet,
      seed.selected_tags as string[],
      allEntries,
    ).catch(() => []);

    if (extra.length > 0) {
      seed.selected_tags = unionTags(seed.selected_tags as string[], extra);
      console.log(`🤖 Jev augmented seed tags: +${extra.join(', ')}`);
    }
  }
}
