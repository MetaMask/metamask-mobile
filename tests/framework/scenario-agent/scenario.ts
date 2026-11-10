import type { PlatformThreshold } from '../TimerHelper.ts';

/**
 * A check pinned in the Markdown, the same element and condition the
 * original spec's Page Object asserts. Code runs it; the model never picks it.
 * Written at the end of a step: `[check: testID=foo]`,
 * `[check: testID=foo text=/regex/]` or `[check: gone testID=foo]`.
 */
export interface StepCheck {
  locator: { strategy: 'testID' | 'label' | 'text'; value: string };
  /** The element's text (or text inside it) must match this regex. */
  textPattern?: string;
  /** The element must disappear instead (e.g. a Confirm footer unmounting). */
  gone?: boolean;
  /**
   * `[check: any testID=a | label="Add accounts"]`: holds when any of these
   * is visible (the original's waitForFirstSuccessful). `locator` is the first.
   */
  anyOf?: StepCheck['locator'][];
  /**
   * `[check: code=balance-stable]`: a wait the original runs in code that is
   * not one element (WalletView.waitForBalanceToStabilize). Named helpers
   * live next to the specs; `locator` is only a label for logs.
   */
  code?: string;
}

/**
 * An `App:` step: what the original spec does to the app process in code
 * (AppiumGestures.terminateApp / activateApp / backgroundApp), or a clock
 * mark for timers that start at a step boundary with no user action.
 */
export type AppCommand =
  | { command: 'terminate' }
  | { command: 'activate' }
  | { command: 'background'; seconds: number }
  | { command: 'startClock' }
  | { command: 'armProfiling' }
  | { command: 'skipProfilingUntilRestart' };

export interface ScenarioStep {
  number: number;
  kind: 'do' | 'expect' | 'secret' | 'app';
  text: string;
  /** Fixed checks, in order; when set, they replace any model-chosen check. */
  checks?: StepCheck[];
  /**
   * `[tap: testID=foo]`: the element the original spec taps. Code taps it;
   * the model never picks a different target.
   */
  tap?: StepCheck['locator'];
  /** Set on `App:` steps. */
  app?: AppCommand;
  /**
   * `[if: perps-gtm-onboarding]`: the step runs only when this named
   * condition (the original spec's own `if`) is true; resolved in code once.
   */
  condition?: string;
}

/** Reads an `App:` step's text; null when it names no known command. */
export function parseAppCommand(text: string): AppCommand | null {
  const t = text.trim().toLowerCase();
  if (/^terminate\b/.test(t)) return { command: 'terminate' };
  if (/^(?:activate|launch|relaunch|foreground)\b/.test(t))
    return { command: 'activate' };
  const bg = /^background(?:\s+the app)?\s+(?:for\s+)?(\d+)\s*s/.exec(t);
  if (bg) return { command: 'background', seconds: Number(bg[1]) };
  if (/^start (?:the )?clock\b/.test(t)) return { command: 'startClock' };
  if (/^arm hermes profiling\b/.test(t)) return { command: 'armProfiling' };
  if (/^skip hermes collection until restart\b/.test(t))
    return { command: 'skipProfilingUntilRestart' };
  return null;
}

const IF = /\s*\[if:\s*([a-z0-9-]+)\s*\]/i;
const CODE_CHECK = /\s*\[check:\s*code=([a-z0-9-]+)\s*\]\s*$/i;
const TAP = /\s*\[tap:\s*(testID|label|text)=(?:"([^"]+)"|(\S+?))\s*\]/;

const CHECK =
  /\s*\[check:\s*(gone\s+)?(testID|label|text)=(\S+?)(?:\s+text=\/(.*)\/)?\s*\]\s*$/;

const ANY_CHECK = /\s*\[check:\s*any\s+([^\]]+)\]\s*$/;
const LOCATOR = /^(testID|label|text)=(?:"([^"]+)"|(\S+))$/;

function parseAny(body: string): StepCheck {
  const anyOf = body.split('|').map((part) => {
    const match = LOCATOR.exec(part.trim());
    if (!match)
      throw new Error(`cannot read "${part.trim()}" in an "any" check`);
    return {
      strategy: match[1] as StepCheck['locator']['strategy'],
      value: match[2] ?? match[3],
    };
  });
  return { locator: anyOf[0], anyOf };
}

/** Splits trailing `[check: ...]` markers off a step's text. */
export function extractChecks(raw: string): {
  text: string;
  checks: StepCheck[];
} {
  let text = raw;
  const checks: StepCheck[] = [];
  for (;;) {
    const code = CODE_CHECK.exec(text);
    if (code) {
      checks.unshift({
        locator: { strategy: 'text', value: `code:${code[1]}` },
        code: code[1],
      });
      text = text.slice(0, code.index);
      continue;
    }
    const any = ANY_CHECK.exec(text);
    if (any) {
      checks.unshift(parseAny(any[1]));
      text = text.slice(0, any.index);
      continue;
    }
    const match = CHECK.exec(text);
    if (!match) break;
    if (match[4] !== undefined) new RegExp(match[4]); // throws on a bad regex
    checks.unshift({
      locator: {
        strategy: match[2] as StepCheck['locator']['strategy'],
        value: match[3],
      },
      ...(match[4] !== undefined ? { textPattern: match[4] } : {}),
      ...(match[1] ? { gone: true } : {}),
    });
    text = text.slice(0, match.index);
  }
  return { text: text.trim(), checks };
}

export interface ScenarioTimer {
  name: string;
  /** Step whose action starts the timer. */
  from: number;
  /**
   * `Expect:` step that stops the timer. Plain steps between `from` and
   * `until` run after the window closes and are not timed.
   */
  until: number;
  /** Absent for `(no threshold)`, like an original TimerHelper without one. */
  threshold?: PlatformThreshold;
}

export interface Scenario {
  title: string;
  tags: string[];
  team: string;
  platforms: ('android' | 'ios')[];
  steps: ScenarioStep[];
  timers: ScenarioTimer[];
}

/** Tags the scheduled performance and system suites grep for. */
const RESERVED_TAG = /@(Performance|System)\b/;
const STEP = /^(\d+)[.)]\s+(?:(expect|secret|app)\s*:\s*)?(.+)$/i;
const TIMER =
  /^[-*]?\s*measure from step (\d+) until step (\d+)\s*\(([^)]*)\)\s*:\s*(.+)$/i;
const TIMER_EXAMPLE =
  '- Measure from step 2 until step 3 (Android 2500 ms, iOS 2000 ms): <timer name>';

/** Parses a `*.scenario.md` file. Throws one error listing every problem. */
export function parseScenario(markdown: string): Scenario {
  const problems: string[] = [];
  const meta: Record<string, string> = {};
  const steps: ScenarioStep[] = [];
  const timers: ScenarioTimer[] = [];
  let title = '';
  let section: 'meta' | 'steps' | 'timers' = 'meta';

  for (const line of markdown.split(/\r?\n/).map((l) => l.trim())) {
    if (!line || line.startsWith('<!--')) continue;
    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
    } else if (/^##\s+steps$/i.test(line)) {
      section = 'steps';
    } else if (/^##\s+timers$/i.test(line)) {
      section = 'timers';
    } else if (section === 'meta') {
      const field = /^[-*]?\s*(tags|team|platforms)\s*:\s*(.+)$/i.exec(line);
      if (field) meta[field[1].toLowerCase()] = field[2].trim();
      else problems.push(`Unknown line before "## Steps": "${line}"`);
    } else if (section === 'steps') {
      const match = STEP.exec(line);
      if (!match) {
        problems.push(`Not a numbered step: "${line}" (write "1. Tap ...")`);
        continue;
      }
      const number = Number(match[1]);
      if (number !== steps.length + 1) {
        problems.push(
          `Expected step ${steps.length + 1}, found step ${number}`,
        );
      }
      const prefix = match[2]?.toLowerCase();
      const kind =
        prefix === 'expect'
          ? 'expect'
          : prefix === 'secret'
            ? 'secret'
            : prefix === 'app'
              ? 'app'
              : 'do';
      let body = match[3].trim();
      const ifMatch = IF.exec(body);
      const condition = ifMatch?.[1].toLowerCase();
      if (ifMatch) {
        body = (
          body.slice(0, ifMatch.index) +
          body.slice(ifMatch.index + ifMatch[0].length)
        ).trim();
      }
      const tapMatch = TAP.exec(body);
      let tap: StepCheck['locator'] | undefined;
      if (tapMatch) {
        tap = {
          strategy: tapMatch[1] as StepCheck['locator']['strategy'],
          value: tapMatch[2] ?? tapMatch[3],
        };
        body = (
          body.slice(0, tapMatch.index) +
          body.slice(tapMatch.index + tapMatch[0].length)
        ).trim();
        if (kind !== 'do')
          problems.push(
            `Step ${number}: only plain action steps can pin a tap`,
          );
      }
      let parsed: ReturnType<typeof extractChecks>;
      try {
        parsed = extractChecks(body);
      } catch (error) {
        problems.push(`Step ${number}: bad check regex (${String(error)})`);
        continue;
      }
      if (parsed.checks.length > 0 && (kind === 'secret' || kind === 'app')) {
        problems.push(
          `Step ${number}: ${kind === 'secret' ? 'Secret' : 'App'} steps cannot have checks`,
        );
      }
      const app = kind === 'app' ? parseAppCommand(parsed.text) : null;
      if (kind === 'app' && !app) {
        problems.push(
          `Step ${number}: unknown App command "${parsed.text}" (terminate, activate, background for N s, start clock, arm Hermes profiling, skip Hermes collection until restart)`,
        );
      }
      steps.push({
        number,
        kind,
        text: parsed.text,
        ...(parsed.checks.length > 0 ? { checks: parsed.checks } : {}),
        ...(tap ? { tap } : {}),
        ...(app ? { app } : {}),
        ...(condition ? { condition } : {}),
      });
      if (
        parsed.checks.some((c) => c.code) &&
        (kind !== 'expect' || parsed.checks.length !== 1)
      ) {
        problems.push(
          `Step ${number}: a code check must be the only check of an Expect step`,
        );
      }
    } else {
      const match = TIMER.exec(line);
      if (match && /^\s*no threshold\s*$/i.test(match[3])) {
        timers.push({
          name: match[4].trim(),
          from: Number(match[1]),
          until: Number(match[2]),
        });
        continue;
      }
      const android = match && /android\s+(\d+)/i.exec(match[3]);
      const ios = match && /ios\s+(\d+)/i.exec(match[3]);
      if (!match || !android || !ios) {
        problems.push(`Cannot read timer "${line}". Write: ${TIMER_EXAMPLE}`);
        continue;
      }
      timers.push({
        name: match[4].trim(),
        from: Number(match[1]),
        until: Number(match[2]),
        threshold: { android: Number(android[1]), ios: Number(ios[1]) },
      });
    }
  }

  const tags = (meta.tags ?? '').split(/\s+/).filter(Boolean);
  const platforms = (meta.platforms ?? '')
    .toLowerCase()
    .split(/[\s,]+|\band\b/)
    .filter((p): p is 'android' | 'ios' => p === 'android' || p === 'ios');

  if (!title) problems.push('Add a title: "# Swap flow"');
  if (tags.length === 0) problems.push('Add "Tags: @PerformanceShadow"');
  for (const tag of tags.filter((t) => RESERVED_TAG.test(t))) {
    problems.push(
      `Tag ${tag} would put this scenario in scheduled CI; use @PerformanceShadow`,
    );
  }
  if (!meta.team) problems.push('Add "Team: @your-team"');
  if (platforms.length === 0)
    problems.push('Add "Platforms: Android" (or iOS)');
  if (steps.length === 0) problems.push('Add "## Steps" with numbered steps');

  for (const timer of timers) {
    const from = steps[timer.from - 1];
    const until = steps[timer.until - 1];
    if (!from || !until) {
      problems.push(
        `Timer "${timer.name}" points at a step that does not exist`,
      );
    } else if (
      steps
        .slice(timer.from - 1, timer.until)
        .some((step) => step.condition !== from.condition)
    ) {
      problems.push(
        `Timer "${timer.name}": every step from ${timer.from} to ${timer.until} needs the same [if: ...]`,
      );
    } else if (from.kind !== 'do' && from.kind !== 'app') {
      problems.push(
        `Timer "${timer.name}" must start on a plain action step or an App: step`,
      );
    } else if (from.kind === 'app' && !until.checks) {
      problems.push(
        `Timer "${timer.name}" starts on an App: step, so its end step needs a pinned [check: ...]`,
      );
    } else if (from.kind === 'app' && timer.until !== timer.from + 1) {
      problems.push(
        `Timer "${timer.name}" starts on an App: step, so it must end on the very next step`,
      );
    } else if (until.kind !== 'expect' || timer.until <= timer.from) {
      problems.push(
        `Timer "${timer.name}" must end on an "Expect:" step after step ${timer.from}`,
      );
    } else if (
      until.checks &&
      (until.checks.length !== 1 || until.checks[0].gone)
    ) {
      problems.push(
        `Timer "${timer.name}": the end step needs exactly one element check that appears (not "gone")`,
      );
    } else if (
      steps
        .slice(timer.from, timer.until - 1)
        .some((step) => step.kind !== 'do')
    ) {
      problems.push(
        `Timer "${timer.name}": only plain action steps may sit between step ${timer.from} and step ${timer.until}`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid scenario:\n  - ${problems.join('\n  - ')}`);
  }
  return { title, tags, team: meta.team, platforms, steps, timers };
}

/** Missing (or empty) env vars from `names`; only names, never values. */
export function missingEnv(
  names: string[] = [],
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return names.filter((name) => !env[name]);
}

/**
 * A secret (SRP, password) for a `Secret:` code step. Fails with the variable
 * name only, so a missing secret is a clear error and nothing leaks.
 */
export function requireSecretEnv(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const value = env[name];
  if (!value)
    throw new Error(
      `${name} environment variable is required for this scenario`,
    );
  return value;
}
