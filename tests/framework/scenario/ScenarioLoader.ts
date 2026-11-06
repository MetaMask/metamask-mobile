/* eslint-disable import-x/no-nodejs-modules -- reads scenario YAML / lock JSON from disk */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type {
  LoadedScenario,
  LockedLocator,
  LockedStep,
  Scenario,
  ScenarioLock,
  ScenarioPlatform,
  ScenarioStep,
  ScenarioTimer,
  ScenarioVisualCheck,
  StepParams,
} from './types.ts';

/**
 * Tags that would let the scheduled / labeled performance lanes or the
 * system lane pick up a scenario (`playwright.testmu.config.ts` greps
 * `/@Performance\b/`, the system configs grep `/@System/`). Scenarios stay
 * opt-in until they are promoted deliberately.
 */
const RESERVED_TAG_PATTERNS = [/@Performance\b/, /@System\b/];

const PLATFORMS: readonly ScenarioPlatform[] = ['android', 'ios'];
const PRECONDITIONS = ['logged-in'] as const;
const PROFILING = ['hermes', 'none'] as const;
const LOCATOR_STRATEGIES = ['testID', 'label', 'text', 'nativeXPath'] as const;
const ENV_PARAM_PATTERN = /^\$\{env\.([A-Z0-9_]+)\}$/;

export class ScenarioValidationError extends Error {
  readonly issues: string[];

  constructor(source: string, issues: string[]) {
    super(
      `Invalid scenario ${source}:\n${issues.map((i) => `  - ${i}`).join('\n')}`,
    );
    this.name = 'ScenarioValidationError';
    this.issues = issues;
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readStringRecord(
  value: unknown,
  where: string,
  issues: string[],
): StepParams {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    issues.push(`${where} must be a map of strings`);
    return {};
  }
  const result: StepParams = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      issues.push(`${where}.${key} must be a string`);
      continue;
    }
    result[key] = entry;
  }
  return result;
}

function readBoolean(
  value: unknown,
  fallback: boolean,
  where: string,
  issues: string[],
): boolean {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'boolean') {
    issues.push(`${where} must be a boolean`);
    return fallback;
  }
  return value;
}

function parseStep(
  raw: unknown,
  index: number,
  issues: string[],
): ScenarioStep | null {
  const where = `steps[${index}]`;
  if (!isRecord(raw)) {
    issues.push(`${where} must be a map`);
    return null;
  }
  if (!isNonEmptyString(raw.id)) {
    issues.push(`${where}.id is required`);
    return null;
  }
  const hasDo = raw.do !== undefined;
  const hasExpect = raw.expect !== undefined;
  if (hasDo === hasExpect) {
    issues.push(
      `${where} (${raw.id}) must have exactly one of "do" or "expect"`,
    );
    return null;
  }
  const text = hasDo ? raw.do : raw.expect;
  if (!isNonEmptyString(text)) {
    issues.push(`${where} (${raw.id}) step text must be a non-empty string`);
    return null;
  }

  const base = {
    id: raw.id,
    text: text.trim(),
    params: readStringRecord(raw.params, `${where}.params`, issues),
    sensitive: readBoolean(raw.sensitive, false, `${where}.sensitive`, issues),
    allowHeal: readBoolean(raw.allowHeal, true, `${where}.allowHeal`, issues),
  };
  return hasDo ? { ...base, kind: 'do' } : { ...base, kind: 'expect' };
}

function parseTimer(
  raw: unknown,
  index: number,
  issues: string[],
): ScenarioTimer | null {
  const where = `timers[${index}]`;
  if (!isRecord(raw)) {
    issues.push(`${where} must be a map`);
    return null;
  }
  const { name, after, until, threshold } = raw;
  if (!isNonEmptyString(name)) {
    issues.push(`${where}.name is required`);
  }
  if (!isNonEmptyString(after)) {
    issues.push(`${where}.after is required`);
  }
  if (!isNonEmptyString(until)) {
    issues.push(`${where}.until is required`);
  }
  if (
    !isRecord(threshold) ||
    typeof threshold.ios !== 'number' ||
    typeof threshold.android !== 'number' ||
    threshold.ios <= 0 ||
    threshold.android <= 0
  ) {
    issues.push(
      `${where}.threshold must define positive "ios" and "android" numbers (ms)`,
    );
    return null;
  }
  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(after) ||
    !isNonEmptyString(until)
  ) {
    return null;
  }
  return {
    name,
    after,
    until,
    threshold: { ios: threshold.ios, android: threshold.android },
  };
}

function parseVisual(
  raw: unknown,
  index: number,
  issues: string[],
): ScenarioVisualCheck | null {
  const where = `visual[${index}]`;
  if (
    !isRecord(raw) ||
    !isNonEmptyString(raw.baseline) ||
    !isNonEmptyString(raw.config)
  ) {
    issues.push(`${where} needs "baseline" and "config" strings`);
    return null;
  }
  const options: ScenarioVisualCheck['options'] = {};
  if (raw.options !== undefined) {
    if (!isRecord(raw.options)) {
      issues.push(`${where}.options must be a map`);
    } else {
      for (const [key, value] of Object.entries(raw.options)) {
        if (
          typeof value === 'number' ||
          typeof value === 'string' ||
          typeof value === 'boolean'
        ) {
          options[key] = value;
        } else {
          issues.push(`${where}.options.${key} must be a scalar`);
        }
      }
    }
  }
  return { baseline: raw.baseline, config: raw.config, options };
}

function validateTimers(
  steps: ScenarioStep[],
  timers: ScenarioTimer[],
  issues: string[],
): void {
  const indexById = new Map(steps.map((step, index) => [step.id, index]));
  const names = new Set<string>();
  const usedAsAfter = new Set<string>();
  const usedAsUntil = new Set<string>();

  for (const timer of timers) {
    if (names.has(timer.name)) {
      issues.push(`timer name "${timer.name}" is duplicated`);
    }
    names.add(timer.name);

    const afterIndex = indexById.get(timer.after);
    const untilIndex = indexById.get(timer.until);
    if (afterIndex === undefined) {
      issues.push(
        `timer "${timer.name}": after step "${timer.after}" not found`,
      );
      continue;
    }
    if (untilIndex === undefined) {
      issues.push(
        `timer "${timer.name}": until step "${timer.until}" not found`,
      );
      continue;
    }
    if (steps[afterIndex].kind !== 'do') {
      issues.push(
        `timer "${timer.name}": after step "${timer.after}" must be a "do" step`,
      );
    }
    if (steps[untilIndex].kind !== 'expect') {
      issues.push(
        `timer "${timer.name}": until step "${timer.until}" must be an "expect" step`,
      );
    }
    // Encodes the "action before measure(), assertion inside measure()" rule:
    // nothing else may run inside the measured window.
    if (untilIndex !== afterIndex + 1) {
      issues.push(
        `timer "${timer.name}": until step "${timer.until}" must directly follow after step "${timer.after}"`,
      );
    }
    if (usedAsAfter.has(timer.after)) {
      issues.push(
        `step "${timer.after}" is the trigger of more than one timer`,
      );
    }
    if (usedAsUntil.has(timer.until)) {
      issues.push(`step "${timer.until}" ends more than one timer`);
    }
    usedAsAfter.add(timer.after);
    usedAsUntil.add(timer.until);
  }
}

/** Parses and validates scenario YAML text. */
export function parseScenario(yamlText: string, source = 'scenario'): Scenario {
  const issues: string[] = [];
  const raw = yaml.load(yamlText);
  if (!isRecord(raw)) {
    throw new ScenarioValidationError(source, ['document must be a map']);
  }

  for (const key of ['id', 'title', 'team'] as const) {
    if (!isNonEmptyString(raw[key])) {
      issues.push(`"${key}" is required`);
    }
  }

  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  if (tags.length === 0) {
    issues.push('"tags" must list at least one tag');
  }
  for (const tag of tags) {
    if (typeof tag !== 'string' || !tag.startsWith('@')) {
      issues.push(
        `tag ${JSON.stringify(tag)} must be a string starting with "@"`,
      );
      continue;
    }
    if (RESERVED_TAG_PATTERNS.some((pattern) => pattern.test(tag))) {
      issues.push(
        `tag "${tag}" would enrol the scenario in scheduled/system runs; use a shadow tag such as @PerformanceShadow`,
      );
    }
  }

  const platforms = Array.isArray(raw.platforms) ? raw.platforms : [];
  if (
    platforms.length === 0 ||
    !platforms.every((p) => PLATFORMS.includes(p as ScenarioPlatform))
  ) {
    issues.push('"platforms" must be a non-empty list of android | ios');
  }

  const precondition = raw.precondition ?? 'logged-in';
  if (!PRECONDITIONS.includes(precondition as (typeof PRECONDITIONS)[number])) {
    issues.push(`"precondition" must be one of ${PRECONDITIONS.join(', ')}`);
  }
  const profiling = raw.profiling ?? 'none';
  if (!PROFILING.includes(profiling as (typeof PROFILING)[number])) {
    issues.push(`"profiling" must be one of ${PROFILING.join(', ')}`);
  }

  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  if (rawSteps.length === 0) {
    issues.push('"steps" must list at least one step');
  }
  const steps = rawSteps
    .map((step, index) => parseStep(step, index, issues))
    .filter((step): step is ScenarioStep => step !== null);

  const seenIds = new Set<string>();
  for (const step of steps) {
    if (seenIds.has(step.id)) {
      issues.push(`step id "${step.id}" is duplicated`);
    }
    seenIds.add(step.id);
  }

  const rawTimers = Array.isArray(raw.timers) ? raw.timers : [];
  const timers = rawTimers
    .map((timer, index) => parseTimer(timer, index, issues))
    .filter((timer): timer is ScenarioTimer => timer !== null);
  validateTimers(steps, timers, issues);

  const rawVisual = Array.isArray(raw.visual) ? raw.visual : [];
  const visual = rawVisual
    .map((check, index) => parseVisual(check, index, issues))
    .filter((check): check is ScenarioVisualCheck => check !== null);

  if (issues.length > 0) {
    throw new ScenarioValidationError(source, issues);
  }

  return {
    id: raw.id as string,
    title: raw.title as string,
    tags: tags as string[],
    team: raw.team as string,
    platforms: platforms as ScenarioPlatform[],
    precondition: precondition as Scenario['precondition'],
    profiling: profiling as Scenario['profiling'],
    steps,
    timers,
    visual,
  };
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
 * binding to be reviewed.
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
      issues.push(`${where} is not a step of the scenario (stale lock entry)`);
      continue;
    }
    if (!isRecord(entry)) {
      issues.push(`${where} must be a map`);
      continue;
    }
    if (entry.text !== step.text) {
      issues.push(
        `${where}.text does not match the scenario step text; re-review the binding`,
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
      locators,
    };
  }

  for (const step of scenario.steps) {
    if (!(step.id in raw.steps)) {
      issues.push(`step "${step.id}" has no lock entry`);
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

/**
 * Loads `<name>.scenario.yaml` and its sibling `<name>.scenario.lock.json`.
 */
export function loadScenario(scenarioPath: string): LoadedScenario {
  const lockPath = scenarioPath.replace(/\.ya?ml$/, '.lock.json');
  if (lockPath === scenarioPath) {
    throw new Error(`Scenario file must end in .yaml: ${scenarioPath}`);
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
