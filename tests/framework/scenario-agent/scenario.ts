import type { PlatformThreshold } from '../TimerHelper.ts';

export interface ScenarioStep {
  number: number;
  kind: 'do' | 'expect' | 'secret';
  text: string;
}

export interface ScenarioTimer {
  name: string;
  /** Step whose action starts the timer. */
  from: number;
  /** `Expect:` step that stops the timer; always `from + 1`. */
  until: number;
  threshold: PlatformThreshold;
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
const STEP = /^(\d+)[.)]\s+(?:(expect|secret)\s*:\s*)?(.+)$/i;
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
      steps.push({
        number,
        kind:
          prefix === 'expect'
            ? 'expect'
            : prefix === 'secret'
              ? 'secret'
              : 'do',
        text: match[3].trim(),
      });
    } else {
      const match = TIMER.exec(line);
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
    } else if (from.kind !== 'do') {
      problems.push(`Timer "${timer.name}" must start on a plain action step`);
    } else if (until.kind !== 'expect' || timer.until !== timer.from + 1) {
      problems.push(
        `Timer "${timer.name}" must end on the "Expect:" step right after step ${timer.from}`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid scenario:\n  - ${problems.join('\n  - ')}`);
  }
  return { title, tags, team: meta.team, platforms, steps, timers };
}
