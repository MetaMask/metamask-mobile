/* eslint-disable import-x/no-nodejs-modules -- reads and writes the step cache */
import fs from 'fs';
import Assertions from '../Assertions.ts';
import Gestures from '../Gestures.ts';
import TimerHelper from '../TimerHelper.ts';
import TimerStore from '../TimerStore.ts';
import {
  getDriver,
  isOverheadTrackingActive,
  stopOverheadTracking,
  withImplicitWait,
} from '../AppiumUtilities.ts';
import {
  getElementForLocator,
  type RecoveredLocator,
} from '../ai-locator/SelfHealingLocator.ts';
import { pageSourceContainsSecrets } from '../ai-locator/ClaudeLocatorRecoveryProvider.ts';
import {
  configurePerformanceLocatorRecovery,
  getPerformanceLocatorRecovery,
} from '../ai-locator/PerformanceLocatorRecovery.ts';
import { ClaudeProvider } from '../ai-visual/providers/claude.ts';
import type { Scenario, ScenarioStep, ScenarioTimer } from './scenario.ts';

export type Locator = RecoveredLocator;

export type AgentAction =
  | { type: 'tap'; locator?: Locator; point?: { x: number; y: number } }
  | { type: 'type'; locator: Locator; text: string }
  | { type: 'expect'; locator: Locator }
  | { type: 'hideKeyboard' };

/** Device operations. Injected in unit tests. */
export interface Device {
  observe(): Promise<{ pageSource: string; screenshot: Buffer }>;
  perform(action: AgentAction): Promise<void>;
  waitFor(locator: Locator, timeoutMs: number): Promise<void>;
  isVisibleNow(locator: Locator): Promise<boolean>;
}

/** Sends a prompt and screenshot to the model and returns its text reply. */
export interface Brain {
  ask(prompt: string, screenshot: Buffer): Promise<string>;
}

/** Step text -> the actions that completed it on the last good run. */
export type StepCache = Record<string, AgentAction[]>;

export interface AgentRunResult {
  status: 'PASS' | 'INVALID_MEASUREMENT' | 'FAIL';
  steps: {
    number: number;
    text: string;
    source: 'cache' | 'agent' | 'secret';
    actions: AgentAction[];
    error?: string;
  }[];
  timers: {
    name: string;
    valid: boolean;
    durationMs: number | null;
    reason?: string;
  }[];
  changedSteps: number[];
  modelCalls: number;
}

export interface ScenarioAgentOptions {
  scenario: Scenario;
  platform: 'android' | 'ios';
  cachePath: string;
  tracker: { addTimer(timer: TimerHelper): void };
  /** Runs a `Secret:` step through existing code (login, SRP import). */
  runSecretStep(text: string): Promise<void>;
  /** testIDs from the Page Objects, offered to the model as a vocabulary. */
  hints?: string[];
  device?: Device;
  brain?: Brain;
  log?: (message: string) => void;
}

const MAX_ACTIONS_PER_STEP = 8;
const ACTION_TIMEOUT_MS = 5_000;
const EXPECT_TIMEOUT_MS = 15_000;
const TIMED_WINDOW_TIMEOUT_MS = 30_000;
const PAGE_SOURCE_LIMIT = 40_000;

const appiumDevice: Device = {
  async observe() {
    const appium = getDriver();
    return {
      pageSource: (await appium.getPageSource()).slice(0, PAGE_SOURCE_LIMIT),
      screenshot: Buffer.from(await appium.takeScreenshot(), 'base64'),
    };
  },
  async perform(action) {
    switch (action.type) {
      case 'tap':
        if (action.locator) {
          return Gestures.waitAndTap(getElementForLocator(action.locator), {
            timeout: ACTION_TIMEOUT_MS,
            elemDescription: action.locator.value,
          });
        }
        if (!action.point) throw new Error('tap needs a locator or a point');
        return getDriver()
          .action('pointer', { parameters: { pointerType: 'touch' } })
          .move(action.point)
          .down()
          .up()
          .perform();
      case 'type':
        return Gestures.typeText(
          getElementForLocator(action.locator),
          action.text,
          {
            hideKeyboard: false,
          },
        );
      case 'expect':
        return appiumDevice.waitFor(action.locator, EXPECT_TIMEOUT_MS);
      case 'hideKeyboard':
        return Gestures.hideKeyboard();
    }
  },
  waitFor: (locator, timeout) =>
    Assertions.expectElementToBeVisible(getElementForLocator(locator), {
      timeout,
      description: `${locator.strategy}=${locator.value}`,
    }),
  isVisibleNow: (locator) =>
    withImplicitWait(0, async () => {
      try {
        return await (await getElementForLocator(locator))
          .unwrap()
          .isDisplayed();
      } catch {
        return false;
      }
    }),
};

function claudeBrain(): Brain {
  let provider: ClaudeProvider | undefined;
  return {
    async ask(prompt, screenshot) {
      provider ??= new ClaudeProvider({ maxTokens: 512 });
      const result = await provider.analyzeImage(prompt, screenshot);
      if (!result.success)
        throw new Error(`Claude call failed: ${result.summary}`);
      return result.rawResponse;
    },
  };
}

function isLocator(value: unknown): value is Locator {
  const v = value as Locator | undefined;
  return (
    typeof v?.value === 'string' &&
    ['testID', 'label', 'text', 'nativeXPath'].includes(v.strategy)
  );
}

function parseReply(raw: string): { action: AgentAction; final: boolean } {
  const json = raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1');
  const reply = JSON.parse(json) as { action?: AgentAction; final?: boolean };
  const action = reply.action as AgentAction | undefined;
  const valid =
    (action?.type === 'tap' &&
      (isLocator(action.locator) || typeof action.point?.x === 'number')) ||
    (action?.type === 'type' &&
      isLocator(action.locator) &&
      typeof action.text === 'string') ||
    (action?.type === 'expect' && isLocator(action.locator)) ||
    action?.type === 'hideKeyboard';
  if (!action || !valid)
    throw new Error(`Model returned an unusable action: ${raw}`);
  return { action, final: reply.final === true };
}

const summarize = (actions: AgentAction[] = []) =>
  actions
    .map((a) =>
      'locator' in a && a.locator
        ? `${a.type} ${a.locator.strategy}=${a.locator.value}`
        : a.type,
    )
    .join(', ') || 'nothing';

/**
 * Runs a Markdown scenario with Claude choosing each action from the live
 * screen. Model calls never happen while a timer runs: the end-of-timer
 * element is resolved before the trigger tap, and only code polls it.
 */
export class ScenarioAgent {
  private readonly device: Device;
  private readonly brain: Brain;
  private readonly log: (message: string) => void;
  private readonly cache: StepCache;
  private readonly learned: StepCache = {};
  private windowOpen = false;
  private modelCalls = 0;
  private readonly result: AgentRunResult = {
    status: 'PASS',
    steps: [],
    timers: [],
    changedSteps: [],
    modelCalls: 0,
  };

  private readonly options: ScenarioAgentOptions;

  constructor(options: ScenarioAgentOptions) {
    this.options = options;
    this.device = options.device ?? appiumDevice;
    this.brain = options.brain ?? claudeBrain();
    this.log =
      options.log ?? ((message) => console.log(`[scenario-agent] ${message}`));
    this.cache = fs.existsSync(options.cachePath)
      ? (JSON.parse(fs.readFileSync(options.cachePath, 'utf8')) as StepCache)
      : {};
  }

  async run(): Promise<AgentRunResult> {
    // Gestures.waitAndTap has its own opt-in AI recovery; keep the agent the only model user.
    const perTapRecovery = getPerformanceLocatorRecovery();
    configurePerformanceLocatorRecovery(undefined);
    const { steps, timers } = this.options.scenario;
    let current: ScenarioStep | undefined;
    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        current = step;
        const timer = timers.find((t) => t.from === step.number);
        if (step.kind === 'secret') {
          await this.options.runSecretStep(step.text);
          this.record(step, 'secret', []);
        } else if (timer) {
          current = steps[i + 1];
          await this.runTimedPair(step, steps[i + 1], timer);
          i += 1;
        } else if (step.kind === 'expect') {
          await this.runExpect(step);
        } else {
          await this.runDo(step, (action) => this.device.perform(action));
        }
      }
    } catch (error) {
      this.result.status = 'FAIL';
      this.result.steps.push({
        number: current?.number ?? 0,
        text: current?.text ?? '',
        source: 'agent',
        actions: [],
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      configurePerformanceLocatorRecovery(perTapRecovery);
    }

    if (this.result.status !== 'FAIL') {
      if (this.result.timers.some((t) => !t.valid)) {
        this.result.status = 'INVALID_MEASUREMENT';
      }
      this.saveCache();
    }
    this.result.modelCalls = this.modelCalls;
    return this.result;
  }

  /** Every model call goes through here, so the timed-window rule has one guard. */
  private async decide(
    step: ScenarioStep,
    mode: 'do' | 'expect' | 'predict',
    history: AgentAction[],
    note = '',
  ): Promise<{ action: AgentAction; final: boolean }> {
    if (this.windowOpen || TimerStore.hasActiveTimer()) {
      throw new Error(
        'Refusing a model call while a performance timer is running',
      );
    }
    const screen = await this.device.observe();
    if (pageSourceContainsSecrets(screen.pageSource)) {
      throw new Error(
        `Step ${step.number}: screen shows secrets; not sending it to the model`,
      );
    }
    const task = {
      do: 'Return the next single action. Set "final": true on the action that completes the step.',
      expect:
        'Return one "expect" action for an element that proves the expectation is met now.',
      predict:
        'This expectation will be checked right after the previous action, which has NOT happened yet. ' +
        'Return one "expect" action for an element that will appear only once it is met. ' +
        'It must NOT already be on the current screen, because its appearance is what gets timed.',
    }[mode];
    this.modelCalls += 1;
    const raw = await this.brain.ask(
      [
        `You drive the MetaMask mobile app (${this.options.platform}) through Appium.`,
        `Step ${step.number}: "${step.text}"`,
        task,
        note,
        `Actions already done for this step: ${JSON.stringify(history)}`,
        `testIDs used by the existing Page Objects (prefer them when they fit): ${(this.options.hints ?? []).join(', ')}`,
        'Reply with JSON only: {"action": ACTION, "final": true|false} where ACTION is one of',
        '{"type":"tap","locator":L} | {"type":"tap","point":{"x":0,"y":0}} | {"type":"type","locator":L,"text":"..."} | {"type":"expect","locator":L} | {"type":"hideKeyboard"}',
        'and L is {"strategy":"testID"|"label"|"text"|"nativeXPath","value":"..."}.',
        'Prefer testID, then label, then text. Use nativeXPath or a point only if nothing else identifies the element.',
        `Page source:\n${screen.pageSource}`,
      ]
        .filter(Boolean)
        .join('\n'),
      screen.screenshot,
    );
    return parseReply(raw);
  }

  /** Replays the cached actions, falling back to the model from the first one that fails. */
  private async runDo(
    step: ScenarioStep,
    performFinal: (action: AgentAction) => Promise<void>,
  ): Promise<void> {
    const done: AgentAction[] = [];
    const cached = this.cache[step.text];
    if (cached?.length) {
      try {
        for (const [index, action] of cached.entries()) {
          await (index === cached.length - 1
            ? performFinal(action)
            : this.device.perform(action));
          done.push(action);
        }
        this.record(step, 'cache', done);
        return;
      } catch (error) {
        this.log(
          `Step ${step.number}: cached action ${done.length + 1} failed (${String(error)}); asking the agent`,
        );
      }
    }
    for (let turn = 0; turn < MAX_ACTIONS_PER_STEP; turn++) {
      const { action, final } = await this.decide(step, 'do', done);
      await (final ? performFinal(action) : this.device.perform(action));
      done.push(action);
      if (final) {
        this.record(step, 'agent', done);
        return;
      }
    }
    throw new Error(
      `Step ${step.number} did not finish within ${MAX_ACTIONS_PER_STEP} actions`,
    );
  }

  private async runExpect(step: ScenarioStep, avoid?: Locator): Promise<void> {
    const cached = this.cache[step.text]?.[0];
    if (cached?.type === 'expect' && cached.locator.value !== avoid?.value) {
      try {
        await this.device.waitFor(cached.locator, EXPECT_TIMEOUT_MS);
        this.record(step, 'cache', [cached]);
        return;
      } catch {
        this.log(
          `Step ${step.number}: cached element missing; asking the agent`,
        );
      }
    }
    let note = avoid
      ? `Do not use ${avoid.strategy}=${avoid.value}; it was not found.`
      : '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const { action } = await this.decide(step, 'expect', [], note);
      if (action.type !== 'expect') {
        note = 'Return an "expect" action.';
        continue;
      }
      try {
        await this.device.waitFor(action.locator, EXPECT_TIMEOUT_MS);
        this.record(step, 'agent', [action]);
        return;
      } catch {
        note = `${action.locator.strategy}=${action.locator.value} did not appear; choose another element.`;
      }
    }
    throw new Error(`Step ${step.number}: expectation not met: ${step.text}`);
  }

  /**
   * The model picks the trigger action and the end element first. Then code
   * taps, and TimerHelper.measure covers only the polling for that element,
   * the same window eth-swap-flow.spec.ts measures.
   */
  private async runTimedPair(
    trigger: ScenarioStep,
    until: ScenarioStep,
    timer: ScenarioTimer,
  ): Promise<void> {
    const state: { end: Locator | null; failed: Locator | null } = {
      end: null,
      failed: null,
    };

    await this.runDo(trigger, async (action) => {
      state.end = await this.resolveEndElement(trigger, until);
      await this.device.perform(action);
      if (!state.end) {
        this.result.timers.push({
          name: timer.name,
          valid: false,
          durationMs: null,
          reason:
            'end element is already on screen before the action, so its appearance cannot be timed',
        });
        return;
      }
      const helper = new TimerHelper(
        timer.name,
        timer.threshold,
        this.options.platform,
      );
      const locator = state.end;
      this.windowOpen = true;
      try {
        await helper.measure(() =>
          this.device.waitFor(locator, TIMED_WINDOW_TIMEOUT_MS),
        );
        this.options.tracker.addTimer(helper);
        this.result.timers.push({
          name: timer.name,
          valid: true,
          durationMs: helper.getDuration(),
        });
      } catch (error) {
        state.failed = locator;
        this.result.timers.push({
          name: timer.name,
          valid: false,
          durationMs: null,
          reason: `end element ${locator.strategy}=${locator.value} did not appear: ${String(error)}`,
        });
      } finally {
        this.windowOpen = false;
        // measure() skips this when the action throws; later timers would inherit it.
        if (isOverheadTrackingActive()) stopOverheadTracking();
      }
    });

    if (state.end && !state.failed) {
      const cached = this.cache[until.text]?.[0];
      const fromCache =
        cached?.type === 'expect' && cached.locator.value === state.end.value;
      this.record(until, fromCache ? 'cache' : 'agent', [
        { type: 'expect', locator: state.end },
      ]);
    } else {
      await this.runExpect(until, state.failed ?? undefined);
    }
  }

  /** Cached end element, or the model's prediction; rejected if already visible. */
  private async resolveEndElement(
    trigger: ScenarioStep,
    until: ScenarioStep,
  ): Promise<Locator | null> {
    const cached = this.cache[until.text]?.[0];
    const candidates: Locator[] =
      cached?.type === 'expect' ? [cached.locator] : [];
    let note = `The previous action is: "${trigger.text}".`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const locator = candidates.shift() ?? (await this.predict(until, note));
      if (!locator) continue;
      if (!(await this.device.isVisibleNow(locator))) return locator;
      note = `${note} ${locator.strategy}=${locator.value} is already visible; pick an element that appears only afterwards.`;
    }
    return null;
  }

  private async predict(
    step: ScenarioStep,
    note: string,
  ): Promise<Locator | null> {
    const { action } = await this.decide(step, 'predict', [], note);
    return action.type === 'expect' ? action.locator : null;
  }

  private record(
    step: ScenarioStep,
    source: 'cache' | 'agent' | 'secret',
    actions: AgentAction[],
  ): void {
    this.result.steps.push({
      number: step.number,
      text: step.text,
      source,
      actions,
    });
    if (source === 'secret') return;
    this.learned[step.text] = actions;
    const before = this.cache[step.text];
    if (JSON.stringify(before) !== JSON.stringify(actions)) {
      this.result.changedSteps.push(step.number);
      this.log(
        `Step ${step.number} changed: was ${summarize(before)}, now ${summarize(actions)}`,
      );
    }
  }

  private saveCache(): void {
    const texts = new Set(this.options.scenario.steps.map((s) => s.text));
    const next: StepCache = {};
    for (const text of texts) {
      const actions = this.learned[text] ?? this.cache[text];
      if (actions) next[text] = actions;
    }
    fs.writeFileSync(
      this.options.cachePath,
      `${JSON.stringify(next, null, 2)}\n`,
    );
  }
}
