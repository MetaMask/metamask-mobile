/* eslint-disable import-x/no-nodejs-modules -- reads and writes the step cache */
import fs from 'fs';
import TimerHelper from '../TimerHelper.ts';
import TimerStore from '../TimerStore.ts';
import {
  isOverheadTrackingActive,
  stopOverheadTracking,
} from '../AppiumUtilities.ts';
import { sleep } from '../Utilities.ts';
import { pageSourceContainsSecrets } from '../ai-locator/ClaudeLocatorRecoveryProvider.ts';
import {
  configurePerformanceLocatorRecovery,
  getPerformanceLocatorRecovery,
} from '../ai-locator/PerformanceLocatorRecovery.ts';
import type {
  AppCommand,
  Scenario,
  ScenarioStep,
  ScenarioTimer,
  StepCheck,
} from './scenario.ts';
import {
  blockedReason,
  buildPrompt,
  claudeBrain,
  errorMessage,
  notDoneReason,
  parseReply,
  type AskMode,
} from './brain.ts';
import { appiumDevice, PAGE_SOURCE_LIMIT } from './device.ts';
import {
  BlockingAlertError,
  findBlockingAlert,
  fundingTapReason,
  isSubmitStep,
  submitTapReason,
} from './guards.ts';
import {
  genericLocatorReason,
  parseScreenNodes,
  screenSignature,
  visibleIn,
  type ScreenNode,
} from './screen.ts';
import type {
  AgentAction,
  AgentRunResult,
  Brain,
  Device,
  ExpectAction,
  Locator,
  StepCache,
  StepSource,
  TimerResult,
} from './types.ts';

export interface ScenarioAgentOptions {
  scenario: Scenario;
  platform: 'android' | 'ios';
  cachePath: string;
  tracker: { addTimer(timer: TimerHelper): void };
  /** Runs a `Secret:` step through existing code (login, SRP import). */
  runSecretStep(text: string): Promise<void>;
  /**
   * Runs an `App:` step (terminate, activate, background, profiling) with the
   * same AppiumGestures calls as the original spec. "start clock" never
   * reaches it.
   */
  runAppStep?(command: AppCommand): Promise<void>;
  /** Runs a `[check: code=name]` wait; throws when it does not hold. */
  runCodeCheck?(name: string): Promise<void>;
  /**
   * A code check that takes the timer itself, like the original's helper
   * (measureCreatePasswordToWalletHome(timer) may measure twice). Returns
   * false when `name` is not such a check.
   */
  runTimedCodeCheck?(name: string, timer: TimerHelper): Promise<boolean>;
  /** Resolves an `[if: name]` condition, the same way the original spec does. */
  evaluateCondition?(name: string): Promise<boolean>;
  /** testIDs from the Page Objects, offered to the model as a vocabulary. */
  hints?: string[];
  device?: Device;
  brain?: Brain;
  log?: (message: string) => void;
  /** Poll interval while waiting for the screen to settle (unit tests: 1). */
  settlePollMs?: number;
}

/** Element that ends a timer: a pinned check, or the model's choice. */
interface EndTarget {
  locator: Locator;
  textPattern?: string;
  anyOf?: Locator[];
  code?: string;
}

const MAX_ACTIONS_PER_STEP = 8;
/** Failed actions or checks fed back to the model before a step fails. */
const MAX_CORRECTIONS_PER_STEP = 2;
/** How long the end element may take to clear before a timed window. */
const PRECONDITION_MS = 5_000;
const DISMISS_CHECK_MS = 2_000;
const EXPECT_TIMEOUT_MS = 15_000;
const TIMED_WINDOW_TIMEOUT_MS = 30_000;
/** How long the element that proves a step took effect may take to show. */
const PROOF_TIMEOUT_MS = 5_000;
const MAX_PROOF_ATTEMPTS = 2;
/** Same budget FooterActions.tapConfirmButton gives the footer to unmount. */
const GONE_TIMEOUT_MS = 30_000;
/** Screen settling before a step's effect is judged (outside timers). */
const SETTLE_POLL_MS = 1_000;
const SETTLE_MAX_MS = 6_000;
const SETTLE_RETRY_MS = 4_000;

/** A step that was claimed done but whose effect is not on screen. */
class ProgressError extends Error {}

const locatorName = (locator: Locator, textPattern?: string) =>
  `${locator.strategy}=${locator.value}${textPattern ? ` /${textPattern}/` : ''}`;

const checkName = (check: EndTarget & { gone?: boolean }): string =>
  check.code
    ? `code=${check.code}`
    : check.anyOf
      ? `any of ${check.anyOf.map((l) => locatorName(l)).join(' | ')}`
      : `${check.gone ? 'gone ' : ''}${locatorName(check.locator, check.textPattern)}`;

/** Whether a pinned check holds in a parsed page source. */
const checkVisibleIn = (nodes: ScreenNode[], check: StepCheck) =>
  check.anyOf
    ? check.anyOf.some((l) => visibleIn(nodes, l))
    : visibleIn(nodes, check.locator, check.textPattern);

const asExpect = (
  target: { locator: Locator; textPattern?: string },
  proof = false,
): ExpectAction => ({
  type: 'expect',
  locator: target.locator,
  ...(target.textPattern ? { textPattern: target.textPattern } : {}),
  ...(proof ? { proof: true } : {}),
});

const isProof = (action: AgentAction): action is ExpectAction =>
  action.type === 'expect' && action.proof === true;

const summarize = (actions: AgentAction[] = []) =>
  actions
    .map((a) =>
      'locator' in a && a.locator
        ? `${a.type} ${locatorName(a.locator)}`
        : a.type === 'swipe'
          ? `swipe ${a.direction}`
          : a.type,
    )
    .join(', ') || 'nothing';

/** Why a model-chosen element cannot be checked by code, or null. */
const xpathIssue = (locator: Locator) =>
  locator.strategy === 'nativeXPath'
    ? 'use testID, text or label so code can check it'
    : null;

/**
 * Runs a Markdown scenario with Claude choosing each action from the live
 * screen. Model calls never happen while a timer runs: the end-of-timer
 * element is resolved before the trigger tap, and only code polls it.
 */
export class ScenarioAgent {
  private readonly options: ScenarioAgentOptions;
  private readonly device: Device;
  private readonly brain: Brain;
  private readonly log: (message: string) => void;
  private readonly cache: StepCache;
  private readonly learned: StepCache = {};
  private readonly conditions = new Map<string, boolean>();
  private windowOpen = false;
  private readonly result: AgentRunResult = {
    status: 'PASS',
    steps: [],
    timers: [],
    changedSteps: [],
    modelCalls: 0,
  };

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
        if (step.condition && !(await this.conditionHolds(step.condition))) {
          // Like the original's `if`: the step and any timer on it are skipped.
          this.log(
            `Step ${step.number}: skipped ([if: ${step.condition}] is false)`,
          );
          this.record(step, 'fixed', []);
        } else if (step.kind === 'secret') {
          await this.options.runSecretStep(step.text);
          this.record(step, 'secret', []);
        } else if (timer) {
          const untilIndex = steps.findIndex((s) => s.number === timer.until);
          current = steps[untilIndex];
          if (step.kind === 'app') {
            await this.runTimedApp(step, current, timer);
          } else {
            const between = steps.slice(i + 1, untilIndex);
            await this.runTimedPair(step, current, timer, between);
          }
          i = untilIndex;
        } else if (step.kind === 'app') {
          await this.runApp(step);
        } else if (step.kind === 'expect') {
          await this.runExpect(step);
        } else {
          // Right before a clock mark ("App: start the clock"), the step's
          // action must return as the original's tap does: no wait for a
          // proof, which would let the next screen load before the clock
          // starts. The timer's pinned end check verifies it instead.
          // A pinned tap followed by a pinned Expect: that check is the
          // proof, as in the original (tap, then assert); no model call.
          const next = steps[i + 1];
          const beforeClock =
            next?.kind === 'app' && next.app?.command === 'startClock';
          const pinnedNext = Boolean(
            step.tap && next?.kind === 'expect' && next.checks,
          );
          await this.runDo(
            step,
            (action) => this.performChecked(action),
            !beforeClock && !pinnedNext,
          );
        }
      }
    } catch (error) {
      this.log(`FAIL at step ${current?.number ?? 0}: ${errorMessage(error)}`);
      this.result.status = 'FAIL';
      await this.captureFailureScreen();
      this.result.steps.push({
        number: current?.number ?? 0,
        text: current?.text ?? '',
        source: 'agent',
        actions: [],
        error: errorMessage(error),
      });
    } finally {
      configurePerformanceLocatorRecovery(perTapRecovery);
    }

    if (this.result.status !== 'FAIL') {
      const invalid = this.result.timers.filter((t) => !t.valid);
      for (const t of invalid) {
        this.log(`INVALID_MEASUREMENT: "${t.name}": ${t.reason ?? ''}`);
      }
      if (invalid.length > 0) this.result.status = 'INVALID_MEASUREMENT';
      this.saveCache();
    }
    return this.result;
  }

  private async captureFailureScreen(): Promise<void> {
    if (!this.device.pageSource) return;
    try {
      const xml = await this.device.pageSource();
      if (!pageSourceContainsSecrets(xml)) {
        this.result.failureScreen = xml.slice(0, PAGE_SOURCE_LIMIT);
      }
    } catch {
      // The session may be gone (crash, timeout); the error says why.
    }
  }

  /** Every model call goes through here, so the timed-window rule has one guard. */
  private async askModel(
    step: ScenarioStep,
    mode: AskMode,
    history: AgentAction[],
    note: string,
  ): Promise<string> {
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
    this.dump(step, mode, screen.pageSource);
    const submit = isSubmitStep(step.text);
    // On a submit step, a blocking alert stops the run before the model is
    // asked to act, so it cannot work around it. Other steps (quotes, review
    // screens, expectations) may show one; it stops them only if the step
    // then fails to take effect (see confirmProgress).
    if (mode === 'do' && submit) {
      this.stopOnBlockingAlert(step, parseScreenNodes(screen.pageSource));
    }
    const next = this.options.scenario.steps.find(
      (s) => s.number === step.number + 1,
    );
    this.result.modelCalls += 1;
    const askStartedAt = Date.now();
    const raw = await this.brain.ask(
      buildPrompt({
        platform: this.options.platform,
        step,
        mode,
        offerSatisfied: !submit && history.length === 0 && !step.checks,
        nextStep: mode === 'proof' ? next?.text : undefined,
        note,
        history,
        hints: this.options.hints ?? [],
        pageSource: screen.pageSource,
      }),
      screen.screenshot,
    );
    this.log(
      `Model call ${this.result.modelCalls} (step ${step.number}, ${mode}): ${Date.now() - askStartedAt} ms`,
    );
    const blocked = blockedReason(raw);
    if (blocked !== undefined) {
      throw new BlockingAlertError(
        `Step ${step.number}: blocked on screen: ${blocked}`,
      );
    }
    return raw;
  }

  private async decide(
    step: ScenarioStep,
    mode: 'do' | 'expect' | 'predict',
    history: AgentAction[],
    note = '',
    retry = true,
  ): Promise<ReturnType<typeof parseReply>> {
    const raw = await this.askModel(step, mode, history, note);
    try {
      return parseReply(raw);
    } catch (error) {
      if (!retry) throw error;
      this.log(`Step ${step.number}: unusable model reply; asking once more`);
      return this.decide(
        step,
        mode,
        history,
        `${note} Your previous reply was not valid JSON. Reply with the JSON object only, no prose.`.trim(),
        false,
      );
    }
  }

  /** Writes page sources for debugging when SCENARIO_PAGE_SOURCE_DIR is set. */
  private dump(step: ScenarioStep, label: string, xml: string): void {
    const dir = process.env.SCENARIO_PAGE_SOURCE_DIR;
    if (!dir || pageSourceContainsSecrets(xml)) return;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      `${dir}/step-${step.number}-${label}-${Date.now()}.xml`,
      xml,
    );
  }

  private stopOnBlockingAlert(step: ScenarioStep, nodes: ScreenNode[]): void {
    const alert = findBlockingAlert(nodes, step.text);
    if (alert) {
      throw new BlockingAlertError(
        `Step ${step.number}: the app shows "${alert}"; stopping instead of working around it`,
      );
    }
  }

  /** Page source nodes now, or null when the device cannot read them. */
  private async snapshot(
    step: ScenarioStep,
    label: string,
  ): Promise<ScreenNode[] | null> {
    if (!this.device.pageSource) return null;
    const xml = await this.device.pageSource();
    this.dump(step, label, xml);
    return parseScreenNodes(xml);
  }

  /**
   * Waits until two page sources in a row look the same (loading skeletons
   * gone), up to `maxMs`. Never used inside a timer window.
   */
  private async settle(
    step: ScenarioStep,
    current: ScreenNode[],
    maxMs = SETTLE_MAX_MS,
  ): Promise<ScreenNode[]> {
    let last = current;
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await sleep(this.options.settlePollMs ?? SETTLE_POLL_MS);
      const next = await this.snapshot(step, 'settle');
      if (!next) return last;
      if (screenSignature(next) === screenSignature(last)) return next;
      last = next;
    }
    return last;
  }

  /**
   * Refuses taps that submit (Confirm, Sign, ...) outside a submit step, so a
   * correction on "Tap Review" can never send a transaction, and taps on
   * Buy / Add funds unless the step asks for them.
   */
  private async guard(step: ScenarioStep, action: AgentAction): Promise<void> {
    if (action.type !== 'tap') return;
    const canDescribe = Boolean(this.device.describe);
    // Not found: the tap itself reports it.
    const text = canDescribe
      ? await this.device.describe?.(action.locator).catch(() => '')
      : '';
    const target = `${action.locator.value} ${text ?? ''}`;
    const reason =
      submitTapReason(target, step.text) ??
      (canDescribe ? fundingTapReason(target, step.text) : null);
    if (reason) throw new Error(reason);
  }

  /**
   * Code checks that a step took effect, instead of trusting "final": no
   * blocking alert, the screen changed, and an element that was not there
   * before the step now proves it. Returns that element, cached with the step.
   */
  private async confirmProgress(
    step: ScenarioStep,
    before: ScreenNode[] | null,
    done: AgentAction[],
    requireProof: boolean,
    cachedProof?: ExpectAction,
  ): Promise<ExpectAction | undefined> {
    try {
      if (step.checks && requireProof) {
        const issue = await this.fixedChecksIssue(
          step.checks,
          PROOF_TIMEOUT_MS,
        );
        if (issue)
          throw new ProgressError(`the scenario's check failed: ${issue}`);
        return undefined;
      }
      return await this.checkProgress(
        step,
        before,
        done,
        requireProof,
        cachedProof,
      );
    } catch (error) {
      // A step that did not take effect while a blocking alert shows stops
      // the run with the alert as the reason, instead of more corrections.
      if (error instanceof ProgressError && this.device.pageSource) {
        this.stopOnBlockingAlert(
          step,
          parseScreenNodes(await this.device.pageSource()),
        );
      }
      throw error;
    }
  }

  /** Polls until one of the elements is visible; like waitForFirstSuccessful. */
  private async waitForAny(
    locators: Locator[],
    timeoutMs: number,
  ): Promise<boolean> {
    const start = Date.now();
    for (;;) {
      for (const locator of locators) {
        if (await this.device.isVisibleNow(locator)) return true;
      }
      if (Date.now() - start > timeoutMs) return false;
      await sleep(300);
    }
  }

  /** Waits for a pinned check or a timer's end element; throws when it does not show. */
  private async waitForEnd(
    end: EndTarget,
    timeoutMs: number,
    deep = false,
  ): Promise<void> {
    if (end.code) return this.codeCheck(end.code);
    if (!end.anyOf) {
      return this.device.waitFor(end.locator, timeoutMs, end.textPattern, deep);
    }
    if (!(await this.waitForAny(end.anyOf, timeoutMs))) {
      throw new Error(
        `none of ${end.anyOf.map((l) => l.value).join(', ')} appeared after ${timeoutMs}ms`,
      );
    }
  }

  /** Runs pinned checks in order; returns the first failure, or null. */
  private async fixedChecksIssue(
    checks: StepCheck[],
    timeoutMs: number,
  ): Promise<string | null> {
    for (const check of checks) {
      try {
        if (!check.gone) {
          await this.waitForEnd(check, timeoutMs, true);
          continue;
        }
        const start = Date.now();
        while (
          await this.device.isVisibleNow(check.locator, check.textPattern)
        ) {
          if (Date.now() - start > GONE_TIMEOUT_MS) {
            throw new Error(`still visible after ${GONE_TIMEOUT_MS}ms`);
          }
          await sleep(300);
        }
      } catch (error) {
        return `${checkName(check)}: ${errorMessage(error)}`;
      }
    }
    return null;
  }

  /** Null when the element shows within the proof budget, else why not. */
  private async notOnScreenIssue(target: ExpectAction): Promise<string | null> {
    try {
      await this.device.waitFor(
        target.locator,
        PROOF_TIMEOUT_MS,
        target.textPattern,
        true,
      );
      return null;
    } catch (error) {
      return `${locatorName(target.locator, target.textPattern)} is not on screen: ${errorMessage(error)}`;
    }
  }

  private async checkProgress(
    step: ScenarioStep,
    before: ScreenNode[] | null,
    done: AgentAction[],
    requireProof: boolean,
    cachedProof?: ExpectAction,
  ): Promise<ExpectAction | undefined> {
    if (!before) return undefined;
    const first = await this.snapshot(step, 'after');
    if (!first || !requireProof) return undefined;
    const last = done[done.length - 1];
    // Typed text is read back from the field and a closed keyboard is
    // checked in verify(), right after the action.
    if (last?.type === 'type' || last?.type === 'dismissKeyboard') {
      return undefined;
    }
    let after = await this.settle(step, first);
    if (screenSignature(before) === screenSignature(after)) {
      throw new ProgressError(
        `nothing on the screen changed after ${summarize(done)}`,
      );
    }
    const problem = async (proof: ExpectAction): Promise<string | null> => {
      const xpath = xpathIssue(proof.locator);
      if (xpath)
        return `${locatorName(proof.locator, proof.textPattern)}: ${xpath}`;
      const wasThere = visibleIn(before, proof.locator, proof.textPattern);
      const generic = genericLocatorReason(proof.locator, step.text);
      // A control that was not on screen before and appeared (Confirm after
      // Review) does prove the step; containers never do.
      if (generic && !(/ is a control,/.test(generic) && !wasThere))
        return generic;
      if (wasThere) {
        return `${locatorName(proof.locator, proof.textPattern)} was already on screen before the step, so it does not prove the step happened`;
      }
      if (visibleIn(after, proof.locator, proof.textPattern)) return null;
      return this.notOnScreenIssue(proof);
    };
    // A final "expect" the model already checked is the first candidate.
    if (!cachedProof && last?.type === 'expect') {
      const own = asExpect(last, true);
      if (!(await problem(own))) return own;
    }
    if (cachedProof) {
      const issue = await problem(cachedProof);
      if (!issue) return cachedProof;
      this.log(
        `Step ${step.number}: cached proof failed (${issue}); asking the agent`,
      );
    }
    let note = '';
    for (let attempt = 0; attempt < MAX_PROOF_ATTEMPTS; attempt++) {
      const raw = await this.askModel(step, 'proof', done, note);
      const notDone = notDoneReason(raw);
      if (notDone !== undefined) {
        // A screen still loading is judged again once it has changed.
        const later = await this.settle(step, after, SETTLE_RETRY_MS);
        if (
          attempt < MAX_PROOF_ATTEMPTS - 1 &&
          screenSignature(later) !== screenSignature(after)
        ) {
          after = later;
          note = `The screen has changed since you said: "${notDone}". Check it again.`;
          continue;
        }
        throw new ProgressError(`the step has not taken effect: ${notDone}`);
      }
      let proof: ExpectAction | undefined;
      try {
        const { action } = parseReply(raw);
        if (action.type === 'expect') proof = asExpect(action, true);
      } catch {
        // handled below
      }
      const issue = proof
        ? await problem(proof)
        : 'reply was not an "expect" action';
      if (proof && !issue) return proof;
      note = `Your proof was rejected: ${issue}. Pick another element, or reply {"done":false,"reason":"..."} if the step did not take effect.`;
    }
    throw new ProgressError(`no element proves the step took effect (${note})`);
  }

  /** Replays the cached actions, falling back to the model from the first one that fails. */
  private async runDo(
    step: ScenarioStep,
    performFinal: (action: AgentAction) => Promise<void>,
    requireProof = true,
  ): Promise<void> {
    const before = await this.snapshot(step, 'before');
    const submit = isSubmitStep(step.text);
    // A submit step never replays its cached taps over a blocking alert.
    if (before && submit) this.stopOnBlockingAlert(step, before);
    const stored = this.cache[step.text];
    const cachedProof = step.checks ? undefined : stored?.find(isProof);
    const cached = stored?.filter((a) => !isProof(a));
    // Pinned checks already hold before acting (like TabBarComponent.tapActivity
    // finding Activity open): nothing to do. Never for submits.
    const present = step.checks?.filter((c) => !c.gone) ?? [];
    if (
      requireProof &&
      before &&
      present.length > 0 &&
      !submit &&
      present.every((c) => checkVisibleIn(before, c)) &&
      !step.checks?.some(
        (c) => c.gone && visibleIn(before, c.locator, c.textPattern),
      )
    ) {
      this.log(
        `Step ${step.number}: already satisfied (${present.map(checkName).join(', ')} on screen); nothing to do`,
      );
      // Keep the learned actions for runs where the app is not there yet.
      if (stored) this.record(step, 'cache', stored);
      else
        this.record(
          step,
          'fixed',
          present.map((c) => asExpect(c)),
        );
      return;
    }
    if (step.tap) {
      // The scenario pins the element the original taps: code taps it, no
      // model and no cache. A missing element fails the step.
      const action: AgentAction = { type: 'tap', locator: step.tap };
      await this.guard(step, action);
      await performFinal(action);
      const proof = await this.confirmProgress(
        step,
        before,
        [action],
        requireProof,
        cachedProof,
      );
      // A model-picked proof (no pinned check) is cached for the next run.
      this.record(
        step,
        proof ? 'agent' : 'fixed',
        proof ? [action, proof] : [action],
      );
      return;
    }
    // The app may already be where this step leads (a Confirm that opens
    // Activity by itself, then "Open the Activity tab"): the learned proof
    // is on screen before acting, so nothing needs doing. Never for submits.
    if (
      requireProof &&
      before &&
      stored &&
      cachedProof &&
      !submit &&
      !xpathIssue(cachedProof.locator) &&
      !genericLocatorReason(cachedProof.locator, step.text) &&
      visibleIn(before, cachedProof.locator, cachedProof.textPattern)
    ) {
      this.log(
        `Step ${step.number}: already satisfied (${summarize([cachedProof])} is on screen); nothing to do`,
      );
      this.record(step, 'cache', stored);
      return;
    }
    const done: AgentAction[] = [];
    if (cached?.length) {
      try {
        for (const [index, action] of cached.entries()) {
          await this.guard(step, action);
          await (index === cached.length - 1
            ? performFinal(action)
            : this.performChecked(action));
          done.push(action);
        }
        const proof = await this.confirmProgress(
          step,
          before,
          done,
          requireProof,
          cachedProof,
        );
        this.record(step, 'cache', proof ? [...done, proof] : done);
        return;
      } catch (error) {
        if (error instanceof BlockingAlertError) throw error;
        this.log(
          `Step ${step.number}: cached replay not verified after ${done.length} action(s) (${errorMessage(error)}); asking the agent`,
        );
      }
    }
    let corrections = 0;
    let note = '';
    let lastSignature = before ? screenSignature(before) : undefined;
    const correct = (message: string, logged: string) => {
      corrections += 1;
      if (corrections > MAX_CORRECTIONS_PER_STEP) {
        throw new Error(`Step ${step.number} not completed: ${message}`);
      }
      this.log(`Step ${step.number}: correction ${corrections}: ${logged}`);
    };
    for (let turn = 0; turn < MAX_ACTIONS_PER_STEP; turn++) {
      const { action, final, satisfied } = await this.decide(
        step,
        'do',
        done,
        note,
      );
      note = '';
      if (
        satisfied &&
        requireProof &&
        done.length === 0 &&
        !step.checks &&
        !submit
      ) {
        const issue = await this.satisfiedIssue(step, before, action);
        if (!issue && action.type === 'expect') {
          const proof = asExpect(action, true);
          this.log(
            `Step ${step.number}: already satisfied (${summarize([proof])} is on screen); nothing to do`,
          );
          this.record(step, 'agent', [proof]);
          return;
        }
        correct(issue ?? 'not satisfied', `"satisfied" rejected: ${issue}`);
        note = `You said the step is already satisfied, but code found: ${issue}. Look at the current screen and do the step.`;
        continue;
      }
      try {
        await this.guard(step, action);
        await (final ? performFinal(action) : this.performChecked(action));
      } catch (error) {
        if (error instanceof BlockingAlertError) throw error;
        correct(
          errorMessage(error),
          `${summarize([action])} failed: ${errorMessage(error)}`,
        );
        note = `Your last action ${JSON.stringify(action)} did not work: ${errorMessage(error)}. Look at the current screen and choose again.`;
        continue;
      }
      done.push(action);
      this.log(
        `Step ${step.number}: did ${summarize([action])}${final ? ' (final)' : ''}`,
      );
      if (!final) {
        // Tell the model when its action changed nothing, so it does not
        // repeat it (a swipe at the end of a list, a tap that did not land).
        if (lastSignature !== undefined) {
          await sleep(500);
          const now = await this.snapshot(step, 'action');
          const signature = now ? screenSignature(now) : undefined;
          if (signature === lastSignature) {
            note = `Your last action ${JSON.stringify(action)} changed nothing on the screen. Do something different (for a swipe, try the other direction).`;
          }
          lastSignature = signature;
        }
        continue;
      }
      try {
        const proof = await this.confirmProgress(
          step,
          before,
          done,
          requireProof,
        );
        this.record(step, 'agent', proof ? [...done, proof] : done);
        return;
      } catch (error) {
        if (!(error instanceof ProgressError)) throw error;
        correct(
          errorMessage(error),
          `marked done but not verified: ${errorMessage(error)}`,
        );
        note = `You marked the step done, but code found it is not: ${errorMessage(error)}. Look at the current screen and continue the step.`;
      }
    }
    throw new Error(
      `Step ${step.number} did not finish within ${MAX_ACTIONS_PER_STEP} actions`,
    );
  }

  /** Why a "satisfied" reply does not hold, or null when its element is on screen. */
  private async satisfiedIssue(
    step: ScenarioStep,
    before: ScreenNode[] | null,
    action: AgentAction,
  ): Promise<string | null> {
    if (action.type !== 'expect')
      return 'a "satisfied" reply needs an "expect" action';
    const issue =
      xpathIssue(action.locator) ??
      genericLocatorReason(action.locator, step.text);
    if (issue) return issue;
    if (before && visibleIn(before, action.locator, action.textPattern))
      return null;
    return this.notOnScreenIssue(action);
  }

  /** Performs an action, then checks its visible effect where one is defined. */
  private async performChecked(action: AgentAction): Promise<void> {
    await this.device.perform(action);
    await this.verify(action);
  }

  private async verify(action: AgentAction): Promise<void> {
    if (action.type === 'type' && this.device.fieldText) {
      const shown = (await this.device.fieldText(action.locator)) ?? '';
      if (!shown.includes(action.text)) {
        throw new Error(
          `after entering "${action.text}", ${locatorName(action.locator)} shows "${shown}"`,
        );
      }
      return;
    }
    if (action.type !== 'dismissKeyboard' || !this.device.keyboardOpen) return;
    const start = Date.now();
    while (Date.now() - start < DISMISS_CHECK_MS) {
      if (!(await this.device.keyboardOpen())) return;
      await sleep(300);
    }
    throw new Error(
      `the keyboard/keypad is still visible after ${summarize([action])}; tap a different visible element outside it`,
    );
  }

  private async runExpect(step: ScenarioStep, avoid?: Locator): Promise<void> {
    if (step.checks) {
      const issue = await this.fixedChecksIssue(step.checks, EXPECT_TIMEOUT_MS);
      if (issue) {
        throw new Error(
          `Step ${step.number}: expectation not met: ${step.text} (${issue})`,
        );
      }
      this.record(
        step,
        'fixed',
        step.checks.map((c) => asExpect(c)),
      );
      return;
    }
    const cached = this.cache[step.text]?.[0];
    if (
      cached?.type === 'expect' &&
      cached.locator.value !== avoid?.value &&
      !genericLocatorReason(cached.locator, step.text)
    ) {
      try {
        await this.device.waitFor(
          cached.locator,
          EXPECT_TIMEOUT_MS,
          cached.textPattern,
          true,
        );
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
      const generic = genericLocatorReason(action.locator, step.text);
      if (generic) {
        this.log(`Step ${step.number}: rejected end-check: ${generic}`);
        note = `Rejected: ${generic}. Return the specific element the expectation names.`;
        continue;
      }
      try {
        await this.device.waitFor(
          action.locator,
          EXPECT_TIMEOUT_MS,
          action.textPattern,
          true,
        );
        this.record(step, 'agent', [action]);
        return;
      } catch (error) {
        note = `${action.locator.strategy}=${action.locator.value} did not appear (${errorMessage(error)}); choose another element.`;
      }
    }
    throw new Error(`Step ${step.number}: expectation not met: ${step.text}`);
  }

  /**
   * The timed window: TimerHelper.measure covers only code polling for the
   * end, so no model call can happen inside it. A timed code check
   * (measureCreatePasswordToWalletHome) takes the timer itself.
   */
  private async timeEnd(
    timer: ScenarioTimer,
    end: EndTarget,
    endAlreadyVisible = false,
  ): Promise<{ entry: TimerResult; helper?: TimerHelper }> {
    const helper = new TimerHelper(
      timer.name,
      timer.threshold,
      this.options.platform,
    );
    this.windowOpen = true;
    try {
      const measuredByCode =
        end.code !== undefined &&
        (await this.options.runTimedCodeCheck?.(end.code, helper)) === true;
      if (!measuredByCode) {
        await helper.measure(() =>
          this.waitForEnd(end, TIMED_WINDOW_TIMEOUT_MS),
        );
      }
      return {
        entry: {
          name: timer.name,
          valid: true,
          durationMs: helper.getDuration(),
          ...(endAlreadyVisible ? { endAlreadyVisible: true } : {}),
        },
        helper,
      };
    } catch (error) {
      return {
        entry: {
          name: timer.name,
          valid: false,
          durationMs: null,
          reason: `end element ${checkName(end)} did not appear: ${String(error)}`,
        },
      };
    } finally {
      this.windowOpen = false;
      // measure() skips this when the action throws; later timers would inherit it.
      if (isOverheadTrackingActive()) stopOverheadTracking();
    }
  }

  /**
   * The model picks the trigger action and the end element first. Then code
   * taps, and the timer covers only the polling for that element, the same
   * window eth-swap-flow.spec.ts measures.
   */
  private async runTimedPair(
    trigger: ScenarioStep,
    until: ScenarioStep,
    timer: ScenarioTimer,
    between: ScenarioStep[],
  ): Promise<void> {
    const state: { end: EndTarget | null; failed: Locator | null } = {
      end: null,
      failed: null,
    };
    // A pinned end check follows the original spec exactly: it is measured
    // even when it already holds, with no "must not be visible" precondition.
    const pinned = Boolean(until.checks);
    const alreadyShown = (when: string): TimerResult => ({
      name: timer.name,
      valid: false,
      durationMs: null,
      reason: `end element is already on screen ${when}, so its appearance cannot be timed`,
    });

    await this.runDo(
      trigger,
      async (action) => {
        const end = await this.resolveEndElement(trigger, until);
        state.end = end;
        state.failed = null;
        const run: { entry?: TimerResult; helper?: TimerHelper } = {};
        if (!end) {
          await this.device.perform(action);
          run.entry = alreadyShown('before the action');
        } else {
          // Informational, read before the trigger so the window is not delayed.
          const endAlreadyVisible =
            pinned &&
            !end.code &&
            (await this.device.isVisibleNow(end.locator, end.textPattern));
          if (endAlreadyVisible) {
            this.log(
              `Timer "${timer.name}": the pinned end check already holds before step ${trigger.number}; measured as the original spec does`,
            );
          }
          const measure = async () => {
            Object.assign(
              run,
              await this.timeEnd(timer, end, endAlreadyVisible),
            );
            if (!run.entry?.valid) state.failed = end.locator;
          };
          if (action.type === 'type') {
            // Like a person typing: the clock starts right after the last key
            // tap returns, when the full text is in. Precondition: after the
            // field is cleared, the end must not be on screen (for example a
            // stale quote), or its appearance is not timed.
            await this.device.perform(action, {
              beforeKeys: async () => {
                if (pinned) return;
                const start = Date.now();
                while (
                  await this.device.isVisibleNow(end.locator, end.textPattern)
                ) {
                  if (Date.now() - start > PRECONDITION_MS) {
                    run.entry = alreadyShown('after clearing the field');
                    return;
                  }
                  await sleep(300);
                }
              },
              afterLastKey: async () => {
                if (!run.entry) await measure();
              },
            });
          } else {
            await this.device.perform(action);
            await measure();
          }
        }
        if (!run.entry) throw new Error('timer window never ran');
        // Check the trigger did what it says only after the window, so the
        // check is never timed. If it fails, the measurement is discarded and
        // the error goes back to the model as a correction.
        await this.verify(action);
        if (run.helper && run.entry.valid)
          this.options.tracker.addTimer(run.helper);
        this.result.timers.push(run.entry);
      },
      false,
    );

    // Steps inside the timer's range run after the window and are not timed.
    for (const step of between) {
      await this.runDo(step, (action) => this.performChecked(action));
    }

    const { end, failed } = state;
    if (!end || failed) {
      await this.runExpect(until, failed ?? undefined);
    } else if (until.checks) {
      this.record(
        until,
        'fixed',
        until.checks.map((c) => asExpect(c)),
      );
    } else {
      const action = asExpect(end);
      const fromCache =
        JSON.stringify(this.cache[until.text]?.[0]) === JSON.stringify(action);
      this.record(until, fromCache ? 'cache' : 'agent', [action]);
    }
  }

  private async codeCheck(name: string): Promise<void> {
    if (!this.options.runCodeCheck)
      throw new Error(`no code path for check "${name}"`);
    await this.options.runCodeCheck(name);
  }

  private async conditionHolds(name: string): Promise<boolean> {
    if (!this.conditions.has(name)) {
      if (!this.options.evaluateCondition)
        throw new Error(`no code path for condition "${name}"`);
      const value = await this.options.evaluateCondition(name);
      this.conditions.set(name, value);
      this.log(`Condition "${name}" is ${value}`);
    }
    return this.conditions.get(name) as boolean;
  }

  private async runApp(step: ScenarioStep): Promise<void> {
    const app = step.app as AppCommand;
    if (app.command !== 'startClock') {
      if (!this.options.runAppStep) {
        throw new Error(
          `Step ${step.number}: no code path for App step "${step.text}"`,
        );
      }
      await this.options.runAppStep(app);
    }
    this.log(
      `Step ${step.number}: app ${app.command}${app.command === 'background' ? ` ${app.seconds}s` : ''} (code)`,
    );
    this.record(step, 'fixed', []);
  }

  /**
   * A timer that starts at an App step: the command runs first and the clock
   * starts when it returns, as the originals call TimerHelper.measure right
   * after AppiumGestures.activateApp (or with no action at all for "start
   * clock"). The end is the pinned check; no model is involved.
   */
  private async runTimedApp(
    step: ScenarioStep,
    until: ScenarioStep,
    timer: ScenarioTimer,
  ): Promise<void> {
    const checks = until.checks as StepCheck[];
    await this.runApp(step);
    const { entry, helper } = await this.timeEnd(timer, checks[0]);
    this.result.timers.push(entry);
    if (!helper) throw new Error(`Step ${until.number}: ${entry.reason}`);
    this.options.tracker.addTimer(helper);
    this.record(
      until,
      'fixed',
      checks.map((c) => asExpect(c)),
    );
  }

  /** Cached end element, or the model's prediction; rejected if already visible. */
  private async resolveEndElement(
    trigger: ScenarioStep,
    until: ScenarioStep,
  ): Promise<EndTarget | null> {
    // The scenario pins the end element: no model, no cache, and (like the
    // original spec) no check that it is absent before the trigger.
    if (until.checks) return until.checks[0];
    const cached = this.cache[until.text]?.[0];
    const candidates: EndTarget[] =
      cached?.type === 'expect'
        ? [{ locator: cached.locator, textPattern: cached.textPattern }]
        : [];
    let note = `The previous action is: "${trigger.text}".`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const target = candidates.shift() ?? (await this.predict(until, note));
      if (!target) continue;
      const generic = genericLocatorReason(target.locator, until.text);
      if (generic) {
        note = `${note} Rejected ${target.locator.value}: ${generic}.`;
        continue;
      }
      if (!(await this.device.isVisibleNow(target.locator, target.textPattern)))
        return target;
      note = `${note} ${target.locator.strategy}=${target.locator.value}${target.textPattern ? ` with text /${target.textPattern}/` : ''} is already visible; pick an element or textPattern that appears only afterwards.`;
    }
    return null;
  }

  private async predict(
    step: ScenarioStep,
    note: string,
  ): Promise<EndTarget | null> {
    const { action } = await this.decide(step, 'predict', [], note);
    return action.type === 'expect' ? asExpect(action) : null;
  }

  private record(
    step: ScenarioStep,
    source: StepSource,
    actions: AgentAction[],
  ): void {
    this.result.steps.push({
      number: step.number,
      text: step.text,
      source,
      actions,
    });
    // Pinned checks live in the Markdown; the cache never holds them.
    if (source === 'secret' || source === 'fixed') return;
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
    // Expect steps with pinned checks need nothing learned.
    const texts = new Set(
      this.options.scenario.steps
        .filter((s) => !(s.kind === 'expect' && s.checks))
        .map((s) => s.text),
    );
    const next: StepCache = {};
    for (const text of texts) {
      const actions = this.learned[text] ?? this.cache[text];
      if (actions) next[text] = actions;
    }
    // Scenarios run entirely by code (Secret / App steps, pinned taps and
    // checks) learn nothing: no empty cache file.
    if (Object.keys(next).length === 0) {
      if (fs.existsSync(this.options.cachePath))
        fs.unlinkSync(this.options.cachePath);
      return;
    }
    fs.writeFileSync(
      this.options.cachePath,
      `${JSON.stringify(next, null, 2)}\n`,
    );
  }
}
