/**
 * Smart E2E hard-rule trigger plugins (mode-owned).
 *
 * Extract-tag matchers and selected_tags continue merge live here — not in the
 * analyzer core.
 */

import {
  evaluateExtractTagsFromChangedSpecs,
  evaluateExtractTagsFromImportGraph,
} from './hard-rule-extract';

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
  return merged;
}

/**
 * ALL is a full short-circuit guard — never continue to AI for that outcome.
 */
export function allowContinue(result: Record<string, unknown>): boolean {
  const tags = result.selected_tags;
  if (!Array.isArray(tags)) {
    return true;
  }
  return !tags.includes('ALL');
}
