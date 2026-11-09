/* eslint-disable import-x/no-nodejs-modules -- reads scenario Markdown / lock JSON from disk */
import fs from 'fs';
import path from 'path';
import { matchTemplate } from './matchSteps.ts';
import type {
  LoadedScenario,
  LockedLocator,
  LockedStep,
  Scenario,
  ScenarioLock,
  ScenarioPlatform,
  ScenarioStep,
  ScenarioTimer,
  StepParams,
} from './types.ts';

/**
 * Tags that would let the scheduled / labeled performance lanes or the
 * system lane pick up a scenario. Scenarios stay opt-in until promoted.
 */
const RESERVED_TAG_PATTERNS = [/@Performance\b/, /@System\b/];

const STEP_LINE = /^(\d+)[.)]\s+(.+)$/;
const EXPECT_PREFIX = /^expect\s*:\s*(.*)$/i;
const SECRET_PREFIX = /^(?:🔒\s*)?secret\s*:\s*(.*)$/i;
const META_LINE = /^(?:[-*]\s+)?(tags?|team|platforms?)\s*:\s*(.*)$/i;
const TIMER_LINE =
  /^(?:[-*]\s+)?(?:⏱️?\s*)?measure\s+from\s+(?:step\s+)?(\d+)\s+until\s+(?:step\s+)?(\d+)\s*\(([^)]*)\)\s*:\s*(.+)$/i;
const ENV_PARAM_PATTERN = /^\$\{env\.([A-Z0-9_]+)\}$/;

const TIMER_EXAMPLE =
  '- Measure from step 1 until step 2 (Android 2500 ms, iOS 2000 ms): Time since the user taps Swap until the swap screen is visible';

export class ScenarioValidationError extends Error {
  readonly issues: string[];

  constructor(source: string, issues: string[]) {
    super(
      `Invalid scenario ${source}:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'ScenarioValidationError';
    this.issues = issues;
  }
}

function scenarioIdFromSource(source: string): string {
  const base = path.basename(source);
  return (
    base.replace(/\.scenario\.md$/i, '').replace(/\.md$/i, '') || 'scenario'
  );
}

function parsePlatforms(value: string): ScenarioPlatform[] | null {
  const parts = value
    .split(/,|\band\b/i)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  const platforms: ScenarioPlatform[] = [];
  for (const part of parts) {
    if (part !== 'android' && part !== 'ios') {
      return null;
    }
    if (!platforms.includes(part)) {
      platforms.push(part);
    }
  }
  return platforms.length > 0 ? platforms : null;
}

function parseThresholds(
  inside: string,
  where: string,
  issues: string[],
): { ios: number; android: number } | null {
  const android = /android\s+(\d+)\s*m?s?/i.exec(inside);
  const ios = /\bios\s+(\d+)\s*m?s?/i.exec(inside);
  if (!android || !ios) {
    issues.push(
      `${where} needs both limits, like "(Android 2500 ms, iOS 2000 ms)". Got "(${inside.trim()})."`,
    );
    return null;
  }
  const parsed = { android: Number(android[1]), ios: Number(ios[1]) };
  if (parsed.android <= 0 || parsed.ios <= 0) {
    issues.push(`${where} thresholds must be greater than 0.`);
    return null;
  }
  return parsed;
}

interface ParsedStepDraft {
  id: string;
  kind: ScenarioStep['kind'];
  text: string;
  sensitive: boolean;
}

function parseStepLine(
  line: string,
  expectedNumber: number,
  issues: string[],
): ParsedStepDraft | null {
  const match = STEP_LINE.exec(line);
  if (!match) {
    issues.push(
      `Not a numbered step: "${line}". Write "1. Tap the Swap button", and keep each step on its own line.`,
    );
    return null;
  }
  const number = Number(match[1]);
  const rawText = match[2].trim();
  if (number !== expectedNumber) {
    issues.push(
      `Steps must be numbered 1, 2, 3, ... without gaps or repeats. Expected step ${expectedNumber}, found step ${number}.`,
    );
  }
  if (rawText.length === 0) {
    issues.push(`Step ${number} has no text.`);
    return null;
  }

  const expectation = EXPECT_PREFIX.exec(rawText);
  if (expectation) {
    const text = expectation[1].trim();
    if (text.length === 0) {
      issues.push(
        `Step ${number} says "Expect:" but not what to expect. Example: "2. Expect: the swap screen is visible".`,
      );
      return null;
    }
    return { id: String(number), kind: 'expect', text, sensitive: false };
  }

  const secret = SECRET_PREFIX.exec(rawText);
  if (secret) {
    const text = secret[1].trim();
    if (text.length === 0) {
      issues.push(`Step ${number} is marked Secret but has no action.`);
      return null;
    }
    return { id: String(number), kind: 'do', text, sensitive: true };
  }

  return { id: String(number), kind: 'do', text: rawText, sensitive: false };
}

function parseTimerLine(
  line: string,
  index: number,
  issues: string[],
): ScenarioTimer | null {
  const where = `Timer ${index + 1}`;
  const match = TIMER_LINE.exec(line.replace(/^⏱️?\s*/, ''));
  if (!match) {
    issues.push(
      `${where} could not be read: "${line}". Write it like:\n      ${TIMER_EXAMPLE}`,
    );
    return null;
  }
  const threshold = parseThresholds(match[3], where, issues);
  const name = match[4].trim();
  if (name.length === 0) {
    issues.push(`${where} needs a name after the colon.`);
    return null;
  }
  if (!threshold) {
    return null;
  }
  return {
    name,
    after: match[1],
    until: match[2],
    threshold,
  };
}

function validateTimers(
  steps: ScenarioStep[],
  timers: ScenarioTimer[],
  issues: string[],
): void {
  const stepById = new Map(
    steps.map((step, index) => [step.id, { step, index }]),
  );
  const names = new Set<string>();
  const lastStep = steps.length;

  for (const timer of timers) {
    if (names.has(timer.name)) {
      issues.push(`Two timers share the name "${timer.name}".`);
    }
    names.add(timer.name);

    const after = stepById.get(timer.after);
    const until = stepById.get(timer.until);
    if (!after) {
      issues.push(
        `Timer "${timer.name}": step ${timer.after} does not exist. This scenario has steps 1 to ${lastStep}.`,
      );
      continue;
    }
    if (!until) {
      issues.push(
        `Timer "${timer.name}": step ${timer.until} does not exist. This scenario has steps 1 to ${lastStep}.`,
      );
      continue;
    }
    if (after.step.kind !== 'do') {
      issues.push(
        `Timer "${timer.name}": step ${timer.after} is an expectation. Start the measurement on an action, and end it on the next "Expect:" step.`,
      );
    }
    if (until.step.kind !== 'expect') {
      issues.push(
        `Timer "${timer.name}": step ${timer.until} ("${until.step.text}") is an action. End the measurement on an "Expect:" step.`,
      );
    }
    if (until.index !== after.index + 1) {
      issues.push(
        `Timer "${timer.name}": step ${timer.until} must be the step right after step ${timer.after}. The measured time covers only that expectation, so nothing else can sit between them.`,
      );
    }
  }
}

/**
 * Reads a scenario written as a test case in Markdown.
 * The id comes from the file name (`eth-swap-flow.scenario.md`).
 */
export function parseScenario(
  markdown: string,
  source = 'scenario.md',
): Scenario {
  const issues: string[] = [];
  const lines = markdown.split(/\r?\n/);
  let title: string | null = null;
  let section: 'meta' | 'steps' | 'timers' | null = null;
  const meta: { tags?: string; team?: string; platforms?: string } = {};
  const drafts: ParsedStepDraft[] = [];
  const timers: ScenarioTimer[] = [];
  let sawSteps = false;
  let nextStepNumber = 1;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('<!--')) {
      continue;
    }

    if (title === null) {
      const heading = /^#\s+(.+)$/.exec(line);
      if (!heading) {
        issues.push(
          `Start the file with a title, for example "# Swap flow". Found: "${line}".`,
        );
        title = '';
        continue;
      }
      title = heading[1].trim();
      if (title.length === 0) {
        issues.push('The title heading is empty.');
      }
      section = 'meta';
      continue;
    }

    const sectionHeading = /^##\s+(.+?)\s*$/.exec(line);
    if (sectionHeading) {
      const name = sectionHeading[1].toLowerCase();
      if (name === 'steps') {
        section = 'steps';
        sawSteps = true;
      } else if (name === 'timers') {
        section = 'timers';
      } else {
        issues.push(
          `Unknown section "## ${sectionHeading[1]}". Use "## Steps" and "## Timers".`,
        );
        section = null;
      }
      continue;
    }

    if (section === 'meta') {
      const metaMatch = META_LINE.exec(line);
      if (!metaMatch) {
        issues.push(
          `Unrecognized line under the title: "${line}". Expected "Tags:", "Team:", or "Platforms:", then "## Steps".`,
        );
        continue;
      }
      const key = metaMatch[1].toLowerCase().replace(/s$/, '');
      const field =
        key === 'tag' ? 'tags' : key === 'platform' ? 'platforms' : key;
      if (field !== 'tags' && field !== 'team' && field !== 'platforms') {
        continue;
      }
      if (meta[field] !== undefined) {
        issues.push(`"${metaMatch[1]}" is set twice.`);
      }
      meta[field] = metaMatch[2].trim();
      continue;
    }

    if (section === 'steps') {
      const draft = parseStepLine(line, nextStepNumber, issues);
      if (draft) {
        drafts.push(draft);
        nextStepNumber = Number(draft.id) + 1;
      }
      continue;
    }

    if (section === 'timers') {
      const timer = parseTimerLine(line, timers.length, issues);
      if (timer) {
        timers.push(timer);
      }
    }
  }

  if (title === null) {
    issues.push(
      'The scenario has no title. Start the file with "# Swap flow".',
    );
  }

  const tags = (meta.tags ?? '')
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  if (!meta.tags) {
    issues.push(
      'Add `Tags: @PerformanceShadow` under the title. @Performance and @System are rejected, because those run in the scheduled suites.',
    );
  }
  for (const tag of tags) {
    if (!tag.startsWith('@')) {
      issues.push(`Tag "${tag}" should start with @, like @PerformanceShadow.`);
      continue;
    }
    if (RESERVED_TAG_PATTERNS.some((pattern) => pattern.test(tag))) {
      issues.push(
        `Tag "${tag}" would run this scenario in the scheduled performance or system suite. Use @PerformanceShadow.`,
      );
    }
  }

  if (!meta.team) {
    issues.push('Add `Team: @your-team` under the title.');
  }
  const platforms = meta.platforms ? parsePlatforms(meta.platforms) : null;
  if (!platforms) {
    issues.push(
      `Add \`Platforms: Android\` under the title (or iOS, or both).${
        meta.platforms ? ` Could not read "${meta.platforms}".` : ''
      }`,
    );
  }

  if (!sawSteps) {
    issues.push('Add a "## Steps" section with numbered steps, starting at 1.');
  } else if (drafts.length === 0) {
    issues.push('The Steps section is empty.');
  }

  const steps: ScenarioStep[] = drafts.map((draft) => ({
    id: draft.id,
    kind: draft.kind,
    text: draft.text,
    params: {},
    sensitive: draft.sensitive,
    allowHeal: true,
  }));
  validateTimers(steps, timers, issues);

  if (issues.length > 0) {
    throw new ScenarioValidationError(source, issues);
  }

  return {
    id: scenarioIdFromSource(source),
    title: title as string,
    tags,
    team: meta.team as string,
    platforms: platforms as ScenarioPlatform[],
    steps,
    timers,
  };
}

const LOCATOR_STRATEGIES = ['testID', 'label', 'text', 'nativeXPath'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseLockedLocator(
  raw: unknown,
  where: string,
  issues: string[],
): LockedLocator | null {
  if (
    !isRecord(raw) ||
    !LOCATOR_STRATEGIES.includes(
      raw.strategy as (typeof LOCATOR_STRATEGIES)[number],
    ) ||
    !isNonEmptyString(raw.value) ||
    !isNonEmptyString(raw.source)
  ) {
    issues.push(
      `${where} needs strategy (${LOCATOR_STRATEGIES.join('|')}), value and source`,
    );
    return null;
  }
  return {
    strategy: raw.strategy as LockedLocator['strategy'],
    value: raw.value,
    source: raw.source,
  };
}

/**
 * Parses a lockfile and checks it against the scenario: every step is bound,
 * no stale entries remain, and step text matches so editing a step forces the
 * lock to be regenerated with `yarn scenario:lock`.
 */
export function parseScenarioLock(
  jsonText: string,
  scenario: Scenario,
  source = 'lock',
): ScenarioLock {
  const issues: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch (error) {
    throw new ScenarioValidationError(source, [
      `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }
  if (!isRecord(raw) || !isRecord(raw.steps)) {
    throw new ScenarioValidationError(source, ['lock must have a "steps" map']);
  }
  if (raw.scenario !== scenario.id) {
    issues.push(
      `lock is for scenario "${String(raw.scenario)}", expected "${scenario.id}"`,
    );
  }

  const steps: Record<string, LockedStep> = {};
  const stepById = new Map(scenario.steps.map((step) => [step.id, step]));

  for (const [stepId, entry] of Object.entries(raw.steps)) {
    const where = `steps.${stepId}`;
    const step = stepById.get(stepId);
    if (!step) {
      issues.push(
        `${where} is not a step of the scenario. Run yarn scenario:lock to regenerate it.`,
      );
      continue;
    }
    if (!isRecord(entry)) {
      issues.push(`${where} must be a map`);
      continue;
    }
    if (entry.text !== step.text) {
      issues.push(
        `${where}.text does not match the scenario anymore. Run yarn scenario:lock to regenerate it.`,
      );
    }
    const action = entry.action;
    const expectedActions =
      step.kind === 'expect' ? ['assertVisible'] : ['tap', 'macro'];
    if (typeof action !== 'string' || !expectedActions.includes(action)) {
      issues.push(
        `${where}.action must be one of ${expectedActions.join('|')} for a "${step.kind}" step`,
      );
    }
    if (!isNonEmptyString(entry.binding) || !isNonEmptyString(entry.source)) {
      issues.push(`${where} needs "binding" and "source"`);
    }
    let paramTemplate: string | undefined;
    if (entry.paramTemplate !== undefined) {
      if (!isNonEmptyString(entry.paramTemplate)) {
        issues.push(
          `${where}.paramTemplate must be a phrase with {placeholders}`,
        );
      } else if (!matchTemplate(entry.paramTemplate, step.text)) {
        issues.push(
          `${where}.paramTemplate no longer matches the step text. Run yarn scenario:lock.`,
        );
      } else {
        paramTemplate = entry.paramTemplate;
      }
    }
    const rawLocators = Array.isArray(entry.locators) ? entry.locators : [];
    const locators = rawLocators
      .map((locator, index) =>
        parseLockedLocator(locator, `${where}.locators[${index}]`, issues),
      )
      .filter((locator): locator is LockedLocator => locator !== null);
    if (action === 'macro' && locators.length > 0) {
      issues.push(
        `${where}: macro steps run only through their binding; remove "locators"`,
      );
    }
    steps[stepId] = {
      text: String(entry.text),
      action: action as LockedStep['action'],
      binding: String(entry.binding),
      source: String(entry.source),
      ...(paramTemplate ? { paramTemplate } : {}),
      locators,
    };
  }

  for (const step of scenario.steps) {
    if (!(step.id in raw.steps)) {
      issues.push(
        `step ${step.id} ("${step.text}") has no lock entry. Run yarn scenario:lock.`,
      );
    }
  }

  if (issues.length > 0) {
    throw new ScenarioValidationError(source, issues);
  }

  return {
    scenario: scenario.id,
    generatedFrom: String(raw.generatedFrom ?? ''),
    steps,
  };
}

/** Loads `<name>.scenario.md` and its sibling `<name>.scenario.lock.json`. */
export function loadScenario(scenarioPath: string): LoadedScenario {
  const lockPath = scenarioPath.replace(/\.md$/, '.lock.json');
  if (lockPath === scenarioPath || !scenarioPath.endsWith('.scenario.md')) {
    throw new Error(`Scenario file must end in .scenario.md: ${scenarioPath}`);
  }
  const scenario = parseScenario(
    fs.readFileSync(scenarioPath, 'utf8'),
    path.basename(scenarioPath),
  );
  const lock = parseScenarioLock(
    fs.readFileSync(lockPath, 'utf8'),
    scenario,
    path.basename(lockPath),
  );
  return { scenario, lock, scenarioPath, lockPath };
}

/**
 * Resolves `${env.NAME}` params at run time so secrets never live in the
 * scenario, the lock, or the run report.
 */
export function resolveStepParams(
  params: StepParams,
  env: Record<string, string | undefined> = process.env,
): StepParams {
  const resolved: StepParams = {};
  for (const [key, value] of Object.entries(params)) {
    const match = ENV_PARAM_PATTERN.exec(value);
    if (!match) {
      resolved[key] = value;
      continue;
    }
    const envValue = env[match[1]];
    if (envValue === undefined || envValue === '') {
      throw new Error(
        `Scenario param "${key}" needs environment variable ${match[1]}`,
      );
    }
    resolved[key] = envValue;
  }
  return resolved;
}
