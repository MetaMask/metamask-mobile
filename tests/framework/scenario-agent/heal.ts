import { parseScenario } from './scenario.ts';
import {
  cacheCorrections,
  cachePathOf,
  summarizeActions,
  type Classification,
  type OutcomeCategory,
  type ScenarioOutcome,
} from './outcome.ts';
import type { StepCache } from './types.ts';

/*
 * Heal PRs for scenarios whose only problem is a stale cache (category
 * "heal" in classifyOutcome): the cache changes, the rules they must pass,
 * dedupe markers, the PR body and the Slack notice.
 */

export interface FileChange {
  path: string;
  before: string | null;
  after: string;
}

/**
 * The heal for one outcome: the re-resolved entries written onto the cache
 * committed on the branch. Every other entry, and the Markdown, stay as they
 * are.
 */
export function buildHealChanges(
  outcome: ScenarioOutcome,
  readFile: (repoPath: string) => string | null,
): { changes: FileChange[]; notes: string[] } {
  const path = cachePathOf(outcome.scenarioPath);
  const before = readFile(path);
  let base: StepCache = {};
  try {
    base = before === null ? {} : (JSON.parse(before) as StepCache);
  } catch {
    return {
      changes: [],
      notes: [`${path} is not valid JSON on the base branch`],
    };
  }
  const notes: string[] = [];
  const next: StepCache = { ...base };
  for (const row of cacheCorrections(outcome)) {
    if (row.before && !(row.text in base)) {
      notes.push(
        `step ${row.number ?? '?'}: no cached entry on the base branch`,
      );
      continue;
    }
    next[row.text] = outcome.healedCache?.[row.text] ?? row.after;
  }
  const after = `${JSON.stringify(next, null, 2)}\n`;
  return {
    changes: after === before ? [] : [{ path, before, after }],
    notes,
  };
}

const ACTION_TYPES = new Set([
  'tap',
  'type',
  'swipe',
  'dismissKeyboard',
  'expect',
]);
const ALLOWED_PATH =
  /^tests\/performance\/(?:[\w.-]+\/)*[\w.-]+\.scenario\.cache\.json$/;

/**
 * Rule violations for a heal; empty when every change is allowed. A heal
 * only ever writes `*.scenario.cache.json`, keyed by the do/expect steps of
 * its scenario, with known action types.
 */
export function healRuleViolations(
  changes: FileChange[],
  readFile: (repoPath: string) => string | null,
): string[] {
  return changes.flatMap(({ path, after }) => {
    if (!ALLOWED_PATH.test(path) || path.includes('..')) {
      return [`${path}: only *.scenario.cache.json may change`];
    }
    let cache: unknown;
    try {
      cache = JSON.parse(after);
    } catch {
      return [`${path}: not valid JSON`];
    }
    if (typeof cache !== 'object' || cache === null || Array.isArray(cache)) {
      return [`${path}: must map step text to actions`];
    }
    const markdown = readFile(path.replace(/\.cache\.json$/, '.md'));
    if (markdown === null) return [`${path}: its scenario is missing`];
    const learnable = new Set(
      parseScenario(markdown)
        .steps.filter((s) => s.kind === 'do' || s.kind === 'expect')
        .map((s) => s.text),
    );
    return Object.entries(cache as Record<string, unknown>).flatMap(
      ([text, actions]) => [
        ...(learnable.has(text)
          ? []
          : [`${path}: "${text}" is not a do/expect step of the scenario`]),
        ...(Array.isArray(actions) &&
        actions.every((a) =>
          ACTION_TYPES.has((a as { type?: string } | null)?.type ?? ''),
        )
          ? []
          : [`${path}: "${text}" has an unknown action`]),
      ],
    );
  });
}

export const HEAL_MARKER = 'perf-scenario-heal';

/** Dedupe key for one healed scenario step. */
export const healKey = (outcome: ScenarioOutcome, step: number | null) =>
  `${outcome.scenarioPath}#${step ?? 0}`;

/** Every step a heal PR for this outcome proposes (one marker each). */
export function healKeys(
  outcome: ScenarioOutcome,
  classification: Classification,
): string[] {
  const steps = new Set<number | null>([classification.step]);
  for (const row of cacheCorrections(outcome)) steps.add(row.number);
  return [...steps].map((step) => healKey(outcome, step));
}

export interface ExistingHealPr {
  url?: string;
  body?: string;
  /** Head commit of the open heal PR. */
  headSha?: string;
}

const HEAL_KEY_PATTERN = new RegExp(`<!-- ${HEAL_MARKER}: (.+?) -->`, 'g');

/** Open heal PRs keyed by the scenario step they already propose. */
export function indexHealPrs(
  prs: ExistingHealPr[],
): Map<string, ExistingHealPr> {
  const indexed = new Map<string, ExistingHealPr>();
  for (const pr of prs) {
    for (const match of (pr.body ?? '').matchAll(HEAL_KEY_PATTERN)) {
      if (!indexed.has(match[1])) indexed.set(match[1], pr);
    }
  }
  return indexed;
}

/** One healed scenario to announce in #mm-qa-legends-ai-alerts. */
export interface SlackHealNotice {
  scenario: string;
  /** The run passed and only the cache was stale. */
  drift: boolean;
  step: number | null;
  reason: string;
  runUrl: string;
  heJobUrls: string[];
  /** Set when an open heal PR already covers this step. */
  prUrl: string;
  commitSha: string;
  commitUrl: string;
}

/**
 * Fills in the PR and commit for notices whose PR this run is about to open.
 * Notices that still have no PR (the open step failed) are dropped.
 */
export function completeSlackNotices(
  notices: SlackHealNotice[],
  opened?: { prUrl: string; commitSha: string; repositoryUrl: string },
): SlackHealNotice[] {
  return notices.flatMap((notice) => {
    if (notice.prUrl && notice.commitSha) return [notice];
    if (!opened?.prUrl || !opened.commitSha) return [];
    return [
      {
        ...notice,
        prUrl: opened.prUrl,
        commitSha: opened.commitSha,
        commitUrl: opened.repositoryUrl
          ? `${opened.repositoryUrl.replace(/\/$/, '')}/commit/${opened.commitSha}`
          : '',
      },
    ];
  });
}

/** Slack text for heals. Empty when there is nothing to announce. */
export function renderHealSlackMessage(notices: SlackHealNotice[]): string {
  return notices
    .map((notice) =>
      [
        `${notice.drift ? 'Cache drift in performance scenario (run passed, cache was stale)' : 'Repairable performance scenario'}: ${notice.scenario}`,
        `${notice.drift ? 'First re-resolved step' : 'Failed step'}: ${notice.step ?? 'n/a'}`,
        `Reason: ${notice.reason}`,
        `Run: ${notice.runUrl || 'n/a'}`,
        notice.heJobUrls.length
          ? `HyperExecute: ${notice.heJobUrls.join(', ')}`
          : '',
        `Heal PR: ${notice.prUrl}`,
        `Commit: ${notice.commitSha}${notice.commitUrl ? ` (${notice.commitUrl})` : ''}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

const cell = (value: string) =>
  value.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 300);

export interface HealedScenario {
  outcome: ScenarioOutcome;
  classification: Classification;
  changes: FileChange[];
  notes: string[];
}

export function renderHealPr(
  healed: HealedScenario[],
  links: { runUrl: string; heJobUrls: string[]; baseRef: string },
): { title: string; body: string } {
  const names = healed.map((h) =>
    h.outcome.scenarioPath.split('/').pop()?.replace('.scenario.md', ''),
  );
  const lines = [
    `Automated heal of agent-driven performance scenarios after [this run](${links.runUrl}).`,
    '',
    `Base: \`${links.baseRef}\`. Only \`*.scenario.cache.json\` files change; step wording, pins, timers and thresholds are untouched (enforced in code).`,
    '',
  ];
  for (const { outcome, classification, changes, notes } of healed) {
    const drift = outcome.status === 'PASS';
    lines.push(
      `### ${outcome.title}`,
      '',
      `- Scenario: \`${outcome.scenarioPath}\``,
      `- Run status: ${outcome.status}${drift ? ` (valid measurement; the run passed${outcome.attempt ? ` on retry ${outcome.attempt}` : ''}, so the committed cache is stale)` : ''}`,
      `- ${drift ? 'First re-resolved step' : 'Failed step'}: ${classification.step ?? 'n/a'}`,
      `- Reason: ${classification.reason}`,
      '',
      '| Step | Old action | New action |',
      '| --- | --- | --- |',
      ...cacheCorrections(outcome).map(
        (s) =>
          `| ${s.number ?? '?'}. ${cell(s.text)} | ${cell(summarizeActions(s.before))} | ${cell(summarizeActions(s.after))} |`,
      ),
      ...notes.map((n) => `- Not applied: ${n}`),
      `- Files: ${changes.map((c) => `\`${c.path}\``).join(', ')}`,
      ...healKeys(outcome, classification).map(
        (key) => `<!-- ${HEAL_MARKER}: ${key} -->`,
      ),
      '',
    );
  }
  lines.push(
    `HyperExecute: ${links.heJobUrls.length ? links.heJobUrls.join(', ') : 'see the run'}`,
    '',
    'Review the new actions against the screen before merging. This PR is never merged automatically.',
  );
  return {
    title: `test(perf): heal scenario cache for ${names.join(', ')}`,
    body: lines.join('\n'),
  };
}

const ACTION_BY_CATEGORY: Record<OutcomeCategory, string> = {
  passed: 'none',
  heal: 'heal PR',
  report: 'report only',
};

export function renderSummary(
  rows: {
    outcome: ScenarioOutcome;
    classification: Classification;
    note?: string;
  }[],
  extra: string[] = [],
): string {
  const lines = [
    '## Agent-driven scenario results',
    '',
    '| Scenario | Status | Action | Step | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      ({ outcome, classification, note }) =>
        `| ${cell(outcome.title)} | ${outcome.status} | ${cell(note ?? ACTION_BY_CATEGORY[classification.category])} | ${classification.step ?? ''} | ${cell(classification.reason)} |`,
    ),
  ];
  if (rows.length === 0)
    lines.push('', '_No scenario outcomes were found in the artifacts._');
  if (extra.length) lines.push('', ...extra);
  return `${lines.join('\n')}\n`;
}
