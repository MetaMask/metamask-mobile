import { parseScenario, type Scenario } from './scenario.ts';
import type {
  AgentAction,
  AgentRunResult,
  StepCache,
} from './ScenarioAgent.ts';

/**
 * What one scenario run left behind for CI: enough to judge the failure and,
 * when it is only a stale cache or wording, to build a heal PR without the
 * device. Written by scenarioTest.ts as `scenario-outcome-<name>.json`.
 */
export interface ScenarioOutcome {
  schema: 1;
  /** Repo-relative path of the `*.scenario.md`, with `/` separators. */
  scenarioPath: string;
  title: string;
  status: AgentRunResult['status'];
  failedStep: { number: number; text: string; error: string } | null;
  timers: {
    name: string;
    valid: boolean;
    reason?: string;
    /** The end step has a pinned `[check: ...]` (the original's own assert). */
    endPinned: boolean;
    untilStep: number;
  }[];
  /** QualityGatesValidator violations for the valid timers. */
  thresholdViolations: string[];
  changedSteps: {
    number: number;
    text: string;
    before: AgentAction[] | null;
    after: AgentAction[];
  }[];
  rewordings: { number: number; from: string; to: string }[];
  /** The cache the agent saved after the run; null when it saved none. */
  healedCache: StepCache | null;
  /** Playwright retry index of the attempt that wrote this file (0 = first). */
  attempt?: number;
  /**
   * The cache as it was before the FIRST attempt of this job. A retry replays
   * the cache the failed attempt healed, so without this the drift of the
   * first attempt would be lost.
   */
  cacheBaseline?: StepCache | null;
  /**
   * Cached steps whose resolution changed between the baseline and the saved
   * cache: what the agent had to re-resolve at runtime (cache drift).
   */
  cacheDrift?: CacheDriftEntry[];
  failureScreen?: string;
  modelCalls: number;
}

export interface CacheDriftEntry {
  number: number | null;
  text: string;
  before: AgentAction[];
  after: AgentAction[];
}

export const OUTCOME_FILE_PREFIX = 'scenario-outcome-';

/** Existing cache entries that now resolve differently. New entries are not drift. */
export function computeCacheDrift(
  scenario: Scenario,
  baseline: StepCache | null,
  after: StepCache | null,
): CacheDriftEntry[] {
  if (!baseline || !after) return [];
  const numberOf = new Map<string, number>();
  for (const step of scenario.steps) {
    if (!numberOf.has(step.text)) numberOf.set(step.text, step.number);
  }
  return Object.entries(after)
    .filter(
      ([text, actions]) =>
        text in baseline &&
        JSON.stringify(baseline[text]) !== JSON.stringify(actions),
    )
    .map(([text, actions]) => ({
      number: numberOf.get(text) ?? null,
      text,
      before: baseline[text],
      after: actions,
    }));
}

export function buildScenarioOutcome(input: {
  scenario: Scenario;
  scenarioPath: string;
  result: AgentRunResult;
  cacheBefore: StepCache | null;
  cacheAfter: StepCache | null;
  thresholdViolations: string[];
  /** Cache before the first attempt; defaults to `cacheBefore`. */
  cacheBaseline?: StepCache | null;
  attempt?: number;
}): ScenarioOutcome {
  const { scenario, result, cacheBefore, cacheAfter } = input;
  const cacheBaseline = input.cacheBaseline ?? cacheBefore;
  const stepByNumber = new Map(scenario.steps.map((s) => [s.number, s]));
  const failed = result.steps.find((s) => s.error);
  const changedSteps = [...new Set(result.changedSteps)].map((number) => {
    const text = stepByNumber.get(number)?.text ?? '';
    const recorded = [...result.steps]
      .reverse()
      .find((s) => s.number === number);
    return {
      number,
      text,
      before: cacheBefore?.[text] ?? null,
      after: recorded?.actions ?? [],
    };
  });
  return {
    schema: 1,
    scenarioPath: input.scenarioPath.split('\\').join('/'),
    title: scenario.title,
    status: result.status,
    failedStep: failed
      ? { number: failed.number, text: failed.text, error: failed.error ?? '' }
      : null,
    timers: scenario.timers.map((timer) => {
      const ran = result.timers.find((t) => t.name === timer.name);
      return {
        name: timer.name,
        valid: ran?.valid ?? false,
        ...(ran?.reason ? { reason: ran.reason } : {}),
        endPinned: Boolean(stepByNumber.get(timer.until)?.checks),
        untilStep: timer.until,
      };
    }),
    thresholdViolations: input.thresholdViolations,
    changedSteps,
    rewordings: (result.rewordings ?? []).map((r) => ({
      number: r.number,
      from: stepByNumber.get(r.number)?.text ?? '',
      to: r.text,
    })),
    healedCache: cacheAfter,
    attempt: input.attempt ?? 0,
    cacheBaseline,
    cacheDrift: computeCacheDrift(scenario, cacheBaseline, cacheAfter),
    ...(result.failureScreen ? { failureScreen: result.failureScreen } : {}),
    modelCalls: result.modelCalls,
  };
}

export type OutcomeCategory =
  | 'passed'
  | 'repairable'
  | 'cache-drift'
  | 'pinned-check'
  | 'threshold'
  | 'submit-guard'
  | 'blocked'
  | 'timeout-or-crash'
  | 'no-path'
  | 'not-healed'
  | 'unknown';

export interface Classification {
  category: OutcomeCategory;
  repairable: boolean;
  /** Step the failure is about (the failed step or a timer's end step). */
  step: number | null;
  reason: string;
}

const FAIL_PATTERNS: [OutcomeCategory, RegExp][] = [
  [
    'submit-guard',
    /only a Confirm\/Submit step may submit|buys or adds funds, which this step does not ask for/,
  ],
  // FAIL with "end element ... did not appear" only comes from a pinned end
  // (an App-started timer); a model-chosen end becomes INVALID_MEASUREMENT.
  [
    'pinned-check',
    // runExpect on a pinned step: "expectation not met: <text> (testID=...)".
    /the scenario's check failed|end element .* did not appear|expectation not met: .* \((?:gone |any of )?(?:testID|label|text|code)[=:]/,
  ],
  ['blocked', /blocked on screen|the app shows "/],
  [
    'no-path',
    /did not finish within|expectation not met|has not taken effect|no element proves the step took effect|unusable action|no code path/i,
  ],
  [
    'timeout-or-crash',
    /timeout|timed out|session|ECONNRESET|socket hang up|crash|terminated|has been closed/i,
  ],
];

/** Re-resolved cached steps: carried drift plus this attempt's changed ones. */
export function driftEntries(outcome: ScenarioOutcome): CacheDriftEntry[] {
  const entries = new Map<string, CacheDriftEntry>();
  for (const entry of outcome.cacheDrift ?? []) entries.set(entry.text, entry);
  for (const step of outcome.changedSteps) {
    if (step.before && !entries.has(step.text)) {
      entries.set(step.text, {
        number: step.number,
        text: step.text,
        before: step.before,
        after: step.after,
      });
    }
  }
  return [...entries.values()].sort(
    (a, b) => (a.number ?? 1e9) - (b.number ?? 1e9),
  );
}

/**
 * Repairable means only the learned data is stale: every step ran, so all
 * pinned checks passed; no threshold failed; and each invalid timer ended on
 * a model-chosen element that the agent re-resolved after the window.
 * Everything else may be an app bug or a real regression.
 */
export function classifyOutcome(outcome: ScenarioOutcome): Classification {
  if (outcome.thresholdViolations.length > 0) {
    return {
      category: 'threshold',
      repairable: false,
      step: null,
      reason: outcome.thresholdViolations.join('; '),
    };
  }
  if (outcome.status === 'PASS') {
    // A valid measurement, but cached steps had to be re-resolved at runtime
    // (possibly by a failed first attempt that a retry then replayed).
    const drift = driftEntries(outcome);
    if (drift.length > 0 && outcome.healedCache) {
      return {
        category: 'cache-drift',
        repairable: true,
        step: drift[0].number,
        reason: `re-resolved ${drift.length} cached step${drift.length === 1 ? '' : 's'}: ${drift
          .map((d) => `${d.number ?? '?'}. ${d.text}`)
          .join('; ')}`,
      };
    }
    return { category: 'passed', repairable: false, step: null, reason: '' };
  }
  if (outcome.status === 'FAIL') {
    const error = outcome.failedStep?.error ?? 'failed without an error';
    const match = FAIL_PATTERNS.find(([, pattern]) => pattern.test(error));
    return {
      category: match?.[0] ?? 'unknown',
      repairable: false,
      step: outcome.failedStep?.number ?? null,
      reason: error,
    };
  }

  const invalid = outcome.timers.filter((t) => !t.valid);
  const changed = new Set(outcome.changedSteps.map((s) => s.number));
  const notRepairable = (
    category: OutcomeCategory,
    timer: ScenarioOutcome['timers'][number] | undefined,
    reason: string,
  ): Classification => ({
    category,
    repairable: false,
    step: timer?.untilStep ?? null,
    reason,
  });
  const pinned = invalid.find((t) => t.endPinned);
  if (pinned) {
    return notRepairable(
      'pinned-check',
      pinned,
      `pinned end check of "${pinned.name}": ${pinned.reason ?? 'did not hold'}`,
    );
  }
  const alreadyShown = invalid.find((t) =>
    /already on screen/.test(t.reason ?? ''),
  );
  if (alreadyShown) {
    return notRepairable(
      'not-healed',
      alreadyShown,
      `"${alreadyShown.name}": ${alreadyShown.reason}`,
    );
  }
  const unresolved = invalid.find((t) => !changed.has(t.untilStep));
  if (unresolved || invalid.length === 0) {
    return notRepairable(
      'not-healed',
      unresolved,
      unresolved
        ? `"${unresolved.name}": ${unresolved.reason ?? 'invalid'}; the end step was not re-resolved`
        : 'INVALID_MEASUREMENT without an invalid timer',
    );
  }
  if (!outcome.healedCache || outcome.changedSteps.length === 0) {
    return notRepairable(
      'not-healed',
      invalid[0],
      'the run saved no healed cache',
    );
  }
  return {
    category: 'repairable',
    repairable: true,
    step: invalid[0].untilStep,
    reason: invalid
      .map((t) => `"${t.name}": ${t.reason ?? 'invalid'}`)
      .join('; '),
  };
}

export interface FileChange {
  path: string;
  before: string | null;
  after: string;
}

const STEP_LINE = /^(\s*(\d+)[.)]\s+)(.*)$/;
const PIN_TOKEN = /\[(?:check|tap|if):[^\]]*\]/gi;
const LOCKED_PREFIX = /^(?:secret|app)\s*:/i;

/** Splits `Expect: text [check: ...]` into prefix, text and trailing pins. */
function splitStepBody(body: string) {
  const prefix = /^(expect\s*:\s*)/i.exec(body)?.[1] ?? '';
  const rest = body.slice(prefix.length);
  const pinsAt = rest.search(/\s*\[(?:check|tap|if):/i);
  return pinsAt < 0
    ? { prefix, text: rest.trimEnd(), pins: '' }
    : {
        prefix,
        text: rest.slice(0, pinsAt).trimEnd(),
        pins: rest.slice(pinsAt),
      };
}

/** Replaces only the wording of the given steps; pins and prefixes stay. */
export function applyRewordings(
  markdown: string,
  rewordings: ScenarioOutcome['rewordings'],
): { markdown: string; skipped: string[] } {
  const skipped: string[] = [];
  const byNumber = new Map(rewordings.map((r) => [r.number, r]));
  let inSteps = false;
  const lines = markdown.split('\n').map((line) => {
    if (/^##\s+/.test(line)) inSteps = /^##\s+steps\s*$/i.test(line.trim());
    const match = inSteps ? STEP_LINE.exec(line) : null;
    const reword = match ? byNumber.get(Number(match[2])) : undefined;
    if (!match || !reword) return line;
    if (LOCKED_PREFIX.test(match[3])) {
      skipped.push(
        `step ${reword.number}: Secret/App steps are never reworded`,
      );
      return line;
    }
    if (
      /[[\]]/.test(reword.to) ||
      /^(?:expect|secret|app)\s*:/i.test(reword.to)
    ) {
      skipped.push(
        `step ${reword.number}: proposed wording has a prefix or brackets`,
      );
      return line;
    }
    const { prefix, text, pins } = splitStepBody(match[3]);
    if (text !== reword.from) {
      skipped.push(`step ${reword.number}: wording changed since the run`);
      return line;
    }
    return `${match[1]}${prefix}${reword.to}${pins}`;
  });
  return { markdown: lines.join('\n'), skipped };
}

/**
 * The heal for one repairable outcome: the healed cache, and the step
 * wording the agent proposed (cache keys follow the new wording).
 */
export function buildHealChanges(
  outcome: ScenarioOutcome,
  readFile: (repoPath: string) => string | null,
): { changes: FileChange[]; notes: string[] } {
  const notes: string[] = [];
  const changes: FileChange[] = [];
  const mdPath = outcome.scenarioPath;
  const cachePath = mdPath.replace(/\.md$/, '.cache.json');
  if (outcome.status === 'PASS') {
    return buildDriftChanges(outcome, cachePath, readFile);
  }
  const mdBefore = readFile(mdPath);
  if (mdBefore === null) {
    return {
      changes,
      notes: [`${mdPath} no longer exists on the base branch`],
    };
  }

  const { markdown: mdAfter, skipped } = applyRewordings(
    mdBefore,
    outcome.rewordings,
  );
  notes.push(...skipped);
  const renamed = new Map<string, string>();
  for (const r of outcome.rewordings) {
    if (!skipped.some((s) => s.startsWith(`step ${r.number}:`))) {
      renamed.set(r.from, r.to);
    }
  }
  if (mdAfter !== mdBefore) {
    changes.push({ path: mdPath, before: mdBefore, after: mdAfter });
  }

  if (outcome.healedCache) {
    const cache: StepCache = {};
    for (const [text, actions] of Object.entries(outcome.healedCache)) {
      cache[renamed.get(text) ?? text] = actions;
    }
    const cacheAfter = `${JSON.stringify(cache, null, 2)}\n`;
    const cacheBefore = readFile(cachePath);
    if (cacheAfter !== cacheBefore) {
      changes.push({ path: cachePath, before: cacheBefore, after: cacheAfter });
    }
  }
  return { changes, notes };
}

/**
 * Cache drift on a passing run: only the re-resolved entries are written onto
 * the cache committed on the branch. The Markdown (wording, pins, timers) and
 * every other cache entry stay as they are.
 */
function buildDriftChanges(
  outcome: ScenarioOutcome,
  cachePath: string,
  readFile: (repoPath: string) => string | null,
): { changes: FileChange[]; notes: string[] } {
  const notes: string[] = [];
  const cacheBefore = readFile(cachePath);
  if (cacheBefore === null) {
    return {
      changes: [],
      notes: [`${cachePath} does not exist on the base branch`],
    };
  }
  let base: StepCache;
  try {
    base = JSON.parse(cacheBefore) as StepCache;
  } catch {
    return {
      changes: [],
      notes: [`${cachePath} is not valid JSON on the base branch`],
    };
  }
  const next: StepCache = { ...base };
  for (const entry of driftEntries(outcome)) {
    if (!(entry.text in base)) {
      notes.push(
        `step ${entry.number ?? '?'}: no cached entry on the base branch`,
      );
      continue;
    }
    next[entry.text] = outcome.healedCache?.[entry.text] ?? entry.after;
  }
  const cacheAfter = `${JSON.stringify(next, null, 2)}\n`;
  return {
    changes:
      cacheAfter === cacheBefore
        ? []
        : [{ path: cachePath, before: cacheBefore, after: cacheAfter }],
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
  /^tests\/performance\/(?:[\w.-]+\/)*[\w.-]+\.scenario\.(?:md|cache\.json)$/;

function scenarioShape(scenario: Scenario) {
  return {
    title: scenario.title,
    tags: scenario.tags,
    team: scenario.team,
    platforms: scenario.platforms,
    timers: scenario.timers,
    steps: scenario.steps.map(({ text: _text, ...rest }) => rest),
  };
}

/** Rule violations for a heal; empty when every change is allowed. */
export function healRuleViolations(
  changes: FileChange[],
  readFile: (repoPath: string) => string | null,
): string[] {
  const violations: string[] = [];
  const afterOf = (path: string) =>
    changes.find((c) => c.path === path)?.after ?? readFile(path);

  for (const change of changes) {
    const { path } = change;
    if (!ALLOWED_PATH.test(path) || path.includes('..')) {
      violations.push(
        `${path}: only *.scenario.cache.json and *.scenario.md may change`,
      );
      continue;
    }
    if (path.endsWith('.scenario.md')) {
      violations.push(...markdownViolations(path, change.before, change.after));
      continue;
    }
    violations.push(
      ...cacheViolations(
        path,
        change.after,
        afterOf(path.replace(/\.cache\.json$/, '.md')),
      ),
    );
  }
  return violations;
}

function markdownViolations(
  path: string,
  before: string | null,
  after: string,
): string[] {
  if (before === null) return [`${path}: a heal never adds a scenario`];
  let oldScenario: Scenario;
  let newScenario: Scenario;
  try {
    oldScenario = parseScenario(before);
    newScenario = parseScenario(after);
  } catch (error) {
    return [
      `${path}: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  const violations: string[] = [];
  if (
    JSON.stringify(scenarioShape(oldScenario)) !==
    JSON.stringify(scenarioShape(newScenario))
  ) {
    violations.push(
      `${path}: pins, timers, thresholds, tags, step kinds or step order changed; only step wording may`,
    );
  }
  oldScenario.steps.forEach((step, index) => {
    const next = newScenario.steps[index];
    if (
      next &&
      next.text !== step.text &&
      (step.kind === 'secret' || step.kind === 'app')
    ) {
      violations.push(
        `${path}: step ${step.number} is a ${step.kind} step and may not change`,
      );
    }
  });
  const oldLines = before.split('\n');
  const newLines = after.split('\n');
  if (oldLines.length !== newLines.length) {
    violations.push(`${path}: lines were added or removed`);
    return violations;
  }
  oldLines.forEach((line, index) => {
    const next = newLines[index];
    if (line === next) return;
    if (!STEP_LINE.test(line) || !STEP_LINE.test(next)) {
      violations.push(
        `${path}:${index + 1}: only numbered step lines may change`,
      );
      return;
    }
    const pins = (l: string) => (l.match(PIN_TOKEN) ?? []).join(' ');
    if (pins(line) !== pins(next)) {
      violations.push(
        `${path}:${index + 1}: [check:]/[tap:]/[if:] pins changed`,
      );
    }
    if (LOCKED_PREFIX.test(STEP_LINE.exec(line)?.[3] ?? '')) {
      violations.push(`${path}:${index + 1}: Secret/App steps may not change`);
    }
  });
  return violations;
}

function cacheViolations(
  path: string,
  after: string,
  markdown: string | null,
): string[] {
  let cache: unknown;
  try {
    cache = JSON.parse(after);
  } catch {
    return [`${path}: not valid JSON`];
  }
  if (typeof cache !== 'object' || cache === null || Array.isArray(cache)) {
    return [`${path}: must map step text to actions`];
  }
  if (markdown === null) return [`${path}: its scenario is missing`];
  const scenario = parseScenario(markdown);
  const learnable = new Set(
    scenario.steps
      .filter((s) => s.kind === 'do' || s.kind === 'expect')
      .map((s) => s.text),
  );
  const violations: string[] = [];
  for (const [text, actions] of Object.entries(
    cache as Record<string, unknown>,
  )) {
    if (!learnable.has(text)) {
      violations.push(
        `${path}: "${text}" is not a do/expect step of the scenario`,
      );
    }
    const valid =
      Array.isArray(actions) &&
      actions.every(
        (a) =>
          typeof a === 'object' &&
          a !== null &&
          ACTION_TYPES.has((a as { type?: string }).type ?? ''),
      );
    if (!valid) violations.push(`${path}: "${text}" has an unknown action`);
  }
  return violations;
}

export const HEAL_MARKER = 'perf-scenario-heal';

/** Dedupe key for one repairable scenario step. */
export const healKey = (outcome: ScenarioOutcome, step: number | null) =>
  `${outcome.scenarioPath}#${step ?? 0}`;

/** Every step a heal PR for this outcome proposes (one marker each). */
export function healKeys(
  outcome: ScenarioOutcome,
  classification: Classification,
): string[] {
  const steps = new Set<number | null>([classification.step]);
  for (const entry of driftEntries(outcome)) steps.add(entry.number);
  return [...steps].map((step) => healKey(outcome, step));
}

/** Rows for the PR table: this attempt's changes plus carried cache drift. */
export function healRows(outcome: ScenarioOutcome): {
  number: number | null;
  text: string;
  before: AgentAction[] | null;
  after: AgentAction[];
}[] {
  const rows = new Map<
    string,
    {
      number: number | null;
      text: string;
      before: AgentAction[] | null;
      after: AgentAction[];
    }
  >();
  if (outcome.status !== 'PASS') {
    for (const step of outcome.changedSteps) rows.set(step.text, step);
  }
  for (const entry of driftEntries(outcome)) {
    // The first attempt's resolution is the real "old" one.
    rows.set(entry.text, entry);
  }
  return [...rows.values()].sort(
    (a, b) => (a.number ?? 1e9) - (b.number ?? 1e9),
  );
}

/** `cache-drift` is listed with `repairable` when a failed run also drifted. */
export function healCategories(
  outcome: ScenarioOutcome,
  classification: Classification,
): string[] {
  const categories: string[] = [classification.category];
  if (
    classification.category === 'repairable' &&
    driftEntries(outcome).some(
      (d) => !outcome.changedSteps.some((c) => c.text === d.text),
    )
  ) {
    categories.push('cache-drift');
  }
  return categories;
}

const marker = (key: string) => `<!-- ${HEAL_MARKER}: ${key} -->`;

/** Keys already proposed by an open heal PR. */
export function proposedKeys(existingPrBodies: string[]): Set<string> {
  return new Set(
    indexHealPrs(existingPrBodies.map((body) => ({ body }))).keys(),
  );
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

/** One repairable scenario to announce in #mm-qa-legends-ai-alerts. */
export interface SlackHealNotice {
  scenario: string;
  /** `cache-drift` posts as a drift notice; anything else as repairable. */
  category?: OutcomeCategory;
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

/** Slack text for repairable heals. Empty when there is nothing to announce. */
export function renderHealSlackMessage(notices: SlackHealNotice[]): string {
  return notices
    .map((notice) =>
      [
        `${notice.category === 'cache-drift' ? 'Cache drift in performance scenario (run passed, cache was stale)' : 'Repairable performance scenario'}: ${notice.scenario}`,
        `${notice.category === 'cache-drift' ? 'First re-resolved step' : 'Failed step'}: ${notice.step ?? 'n/a'}`,
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

export const summarizeActions = (actions: AgentAction[] | null): string =>
  !actions || actions.length === 0
    ? '_none_'
    : actions
        .map((a) =>
          'locator' in a && a.locator
            ? `${a.type} ${a.locator.strategy}=${a.locator.value}`
            : a.type,
        )
        .join(', ');

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
    healed.every((h) => h.outcome.status === 'PASS')
      ? `Base: \`${links.baseRef}\`. Cache drift only: the runs passed, and only \`*.scenario.cache.json\` changes. Step wording, pins, timers and thresholds are untouched (enforced in code).`
      : `Base: \`${links.baseRef}\`. Only \`*.scenario.cache.json\` files and step wording in \`*.scenario.md\` change; pins, timers and thresholds are untouched (enforced in code).`,
    '',
  ];
  for (const { outcome, classification, changes, notes } of healed) {
    lines.push(
      `### ${outcome.title}`,
      '',
      `- Scenario: \`${outcome.scenarioPath}\``,
      `- Category: \`${healCategories(outcome, classification).join(' + ')}\``,
      `- ${classification.category === 'cache-drift' ? 'First re-resolved step' : 'Failed step'}: ${classification.step ?? 'n/a'}`,
      `- Reason: ${classification.reason}`,
      ...(classification.category === 'cache-drift'
        ? [
            `- Run status: ${outcome.status} (valid measurement; the run passed${outcome.attempt ? ` on retry ${outcome.attempt}` : ''}, so the committed cache is stale)`,
          ]
        : []),
      '',
      '| Step | Old action | New action |',
      '| --- | --- | --- |',
      ...healRows(outcome).map(
        (s) =>
          `| ${s.number ?? '?'}. ${cell(s.text)} | ${cell(summarizeActions(s.before))} | ${cell(summarizeActions(s.after))} |`,
      ),
      ...(outcome.status === 'PASS'
        ? []
        : outcome.rewordings.map(
            (r) => `- Step ${r.number} wording: "${r.from}" → "${r.to}"`,
          )),
      ...notes.map((n) => `- Not applied: ${n}`),
      `- Files: ${changes.map((c) => `\`${c.path}\``).join(', ')}`,
      ...healKeys(outcome, classification).map(marker),
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
  repairable: 'heal PR',
  'cache-drift': 'heal PR (cache drift: run passed, cache was stale)',
  'pinned-check': 'report only: a pinned check failed (possible app bug)',
  threshold: 'report only: threshold exceeded',
  'submit-guard': 'report only: the submit guard stopped the run',
  blocked: 'report only: the app blocked the step',
  'timeout-or-crash': 'report only: timeout or crash',
  'no-path': 'report only: the model found no path',
  'not-healed': 'report only: not healed in the run',
  unknown: 'report only',
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
    '| Scenario | Status | Category | Step | Reason | Action |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      ({ outcome, classification, note }) =>
        `| ${cell(outcome.title)} | ${outcome.status} | ${classification.category} | ${classification.step ?? ''} | ${cell(classification.reason)} | ${cell(note ?? ACTION_BY_CATEGORY[classification.category])} |`,
    ),
  ];
  if (rows.length === 0)
    lines.push('', '_No scenario outcomes were found in the artifacts._');
  if (extra.length) lines.push('', ...extra);
  return `${lines.join('\n')}\n`;
}
