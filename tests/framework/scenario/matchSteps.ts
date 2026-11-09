import type {
  BindingCatalogEntry,
  LockedStep,
  Scenario,
  ScenarioLock,
  ScenarioStep,
  StepParams,
} from './types.ts';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'on',
  'to',
  'of',
  'and',
  'with',
  'from',
  'until',
  'is',
  'are',
  'as',
  'in',
  'for',
  'be',
]);

/** Lowest word-overlap score that still counts as "this is probably that action". */
const MIN_FUZZY_SCORE = 0.55;

export interface StepSuggestion {
  binding: string;
  phrase: string;
  score: number;
}

export interface UnmatchedStep {
  id: string;
  text: string;
  /** Set when two actions match about equally well. */
  ambiguous: boolean;
  suggestions: StepSuggestion[];
}

/**
 * Turns a catalog phrase into a case-insensitive pattern.
 * `{name}` captures the rest of a value (a token, an amount, a network).
 * Returns null when the phrase has no placeholders.
 */
export function matchTemplate(
  template: string,
  text: string,
): StepParams | null {
  if (!template.includes('{')) {
    return null;
  }
  const names: string[] = [];
  const pattern = template
    .split(/\{([a-zA-Z]+)\}/)
    .map((part, index) => {
      if (index % 2 === 1) {
        names.push(part);
        return '(.+?)';
      }
      return part
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+');
    })
    .join('\\s*');
  const match = new RegExp(`^${pattern}$`, 'i').exec(text.trim());
  if (!match) {
    return null;
  }
  const params: StepParams = {};
  names.forEach((name, index) => {
    params[name] = match[index + 1].trim();
  });
  return params;
}

export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantWords(text: string): string[] {
  return normalizePhrase(text)
    .split(' ')
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

/** Dice coefficient over meaningful words. 1 means the same words. */
export function phraseScore(left: string, right: string): number {
  const leftWords = significantWords(left);
  const rightWords = significantWords(right);
  if (leftWords.length === 0 || rightWords.length === 0) {
    return 0;
  }
  const remaining = new Map<string, number>();
  for (const word of leftWords) {
    remaining.set(word, (remaining.get(word) ?? 0) + 1);
  }
  let overlap = 0;
  for (const word of rightWords) {
    const count = remaining.get(word) ?? 0;
    if (count > 0) {
      overlap += 1;
      remaining.set(word, count - 1);
    }
  }
  if (overlap < 2) {
    return 0;
  }
  return (2 * overlap) / (leftWords.length + rightWords.length);
}

function compatible(step: ScenarioStep, entry: BindingCatalogEntry): boolean {
  return step.kind === 'expect'
    ? entry.action === 'assertVisible'
    : entry.action === 'tap' || entry.action === 'macro';
}

interface Ranked {
  entry: BindingCatalogEntry;
  phrase: string;
  score: number;
  overlap: number;
  /** One wording's words are all contained in the other. */
  covers: boolean;
}

function wordOverlap(left: string, right: string): number {
  const rightWords = significantWords(right);
  const remaining = new Map<string, number>();
  for (const word of significantWords(left)) {
    remaining.set(word, (remaining.get(word) ?? 0) + 1);
  }
  let overlap = 0;
  for (const word of rightWords) {
    const count = remaining.get(word) ?? 0;
    if (count > 0) {
      overlap += 1;
      remaining.set(word, count - 1);
    }
  }
  return overlap;
}

function covers(stepText: string, phrase: string): boolean {
  const stepWords = significantWords(stepText);
  const phraseWords = significantWords(phrase);
  if (stepWords.length === 0 || phraseWords.length === 0) {
    return false;
  }
  const phraseSet = new Set(phraseWords);
  const stepSet = new Set(stepWords);
  return (
    stepWords.every((word) => phraseSet.has(word)) ||
    phraseWords.every((word) => stepSet.has(word))
  );
}

function rank(step: ScenarioStep, catalog: BindingCatalogEntry[]): Ranked[] {
  const ranked: Ranked[] = [];
  for (const entry of catalog) {
    if (!compatible(step, entry)) {
      continue;
    }
    let best: Ranked | null = null;
    for (const phrase of entry.phrases) {
      if (phrase.includes('{')) {
        continue;
      }
      const candidate: Ranked = {
        entry,
        phrase,
        score: phraseScore(step.text, phrase),
        overlap: wordOverlap(step.text, phrase),
        covers: covers(step.text, phrase),
      };
      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }
    if (best && best.score > 0) {
      ranked.push(best);
    }
  }
  return ranked.sort((a, b) => b.overlap - a.overlap || b.score - a.score);
}

function toSuggestions(ranked: Ranked[]): StepSuggestion[] {
  return ranked.slice(0, 3).map((item) => ({
    binding: item.entry.binding,
    phrase: item.phrase,
    score: Number(item.score.toFixed(2)),
  }));
}

export type StepMatchResult =
  | { ok: true; locked: LockedStep }
  | ({ ok: false } & UnmatchedStep);

/**
 * Matches one step to a catalog entry.
 * Exact phrase, then a `{placeholder}` template, then a unique fuzzy match.
 */
export function matchStep(
  step: ScenarioStep,
  catalog: BindingCatalogEntry[],
): StepMatchResult {
  const candidates = catalog.filter((entry) => compatible(step, entry));

  for (const entry of candidates) {
    for (const phrase of entry.phrases) {
      if (phrase.includes('{')) {
        continue;
      }
      if (normalizePhrase(phrase) === normalizePhrase(step.text)) {
        return { ok: true, locked: lockedFrom(step, entry) };
      }
    }
  }

  const templateHits: { entry: BindingCatalogEntry; phrase: string }[] = [];
  for (const entry of candidates) {
    for (const phrase of entry.phrases) {
      if (matchTemplate(phrase, step.text)) {
        templateHits.push({ entry, phrase });
      }
    }
  }
  if (templateHits.length === 1) {
    return {
      ok: true,
      locked: lockedFrom(step, templateHits[0].entry, templateHits[0].phrase),
    };
  }
  if (templateHits.length > 1) {
    return {
      ok: false,
      id: step.id,
      text: step.text,
      ambiguous: true,
      suggestions: templateHits.map((hit) => ({
        binding: hit.entry.binding,
        phrase: hit.phrase,
        score: 1,
      })),
    };
  }

  const ranked = rank(step, catalog).filter(
    (item) => item.score >= MIN_FUZZY_SCORE,
  );
  // A wording that contains the step (or the other way around) beats a
  // merely similar one, so "Tap the swap button" binds to the Swap button
  // rather than to every phrase that mentions a button.
  const covered = ranked.filter((item) => item.covers);
  const pool = covered.length > 0 ? covered : ranked;
  const best = pool[0];
  const second = pool[1];
  const unique =
    best !== undefined &&
    (second === undefined ||
      best.overlap > second.overlap ||
      best.score - second.score >= 0.12);
  if (unique) {
    return { ok: true, locked: lockedFrom(step, best.entry) };
  }

  return {
    ok: false,
    id: step.id,
    text: step.text,
    ambiguous: best !== undefined && best.score >= MIN_FUZZY_SCORE,
    suggestions: toSuggestions(ranked),
  };
}

function lockedFrom(
  step: ScenarioStep,
  entry: BindingCatalogEntry,
  template?: string,
): LockedStep {
  return {
    text: step.text,
    action: entry.action,
    binding: entry.binding,
    source: entry.source,
    ...(template ? { paramTemplate: template } : {}),
    locators: entry.action === 'macro' ? [] : entry.locators,
  };
}

export class StepMatchError extends Error {
  readonly unmatched: UnmatchedStep[];

  constructor(unmatched: UnmatchedStep[]) {
    super(formatUnmatched(unmatched));
    this.name = 'StepMatchError';
    this.unmatched = unmatched;
  }
}

function formatUnmatched(unmatched: UnmatchedStep[]): string {
  const lines = [
    `Could not match ${unmatched.length} step(s) to a known action.`,
    'The action catalog is maintainer-owned (tests/framework/scenario/bindingCatalog.ts);',
    'scenario authors only edit the Markdown.',
    '',
  ];
  for (const step of unmatched) {
    lines.push(`Step ${step.id}: "${step.text}"`);
    if (step.suggestions.length === 0) {
      lines.push('  No known action is close. A maintainer needs to add one.');
      continue;
    }
    lines.push(
      step.ambiguous
        ? '  Several actions match about equally. Use the wording of the one you mean:'
        : '  Closest known actions:',
    );
    for (const suggestion of step.suggestions) {
      lines.push(
        `    ${suggestion.score.toFixed(2)}  ${suggestion.binding} — "${suggestion.phrase}"`,
      );
    }
  }
  return lines.join('\n');
}

/** Builds the lockfile for a scenario. Throws {@link StepMatchError} listing every unmatched step. */
export function buildLock(
  scenario: Scenario,
  catalog: BindingCatalogEntry[],
): ScenarioLock {
  const steps: Record<string, LockedStep> = {};
  const unmatched: UnmatchedStep[] = [];
  for (const step of scenario.steps) {
    const result = matchStep(step, catalog);
    if (result.ok) {
      steps[step.id] = result.locked;
    } else {
      unmatched.push(result);
    }
  }
  if (unmatched.length > 0) {
    throw new StepMatchError(unmatched);
  }
  return {
    scenario: scenario.id,
    generatedFrom:
      'yarn scenario:lock, from tests/framework/scenario/bindingCatalog.ts',
    steps,
  };
}
