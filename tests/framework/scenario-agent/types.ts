import type { RecoveredLocator } from '../ai-locator/SelfHealingLocator.ts';

export type Locator = RecoveredLocator;

export interface Point {
  x: number;
  y: number;
}

export interface ExpectAction {
  type: 'expect';
  locator: Locator;
  textPattern?: string;
  /**
   * Set on the element that proved a plain step took effect. Cached with the
   * step and checked again on replay; never performed as an action.
   */
  proof?: boolean;
}

/**
 * Only what a person can do on the screen: tap a visible element, scroll,
 * enter text through whatever keyboard the app shows, close that keyboard by
 * tapping something visible, and look for something.
 */
export type AgentAction =
  | { type: 'tap'; locator: Locator }
  | { type: 'type'; locator: Locator; text: string }
  | { type: 'swipe'; direction: 'up' | 'down' }
  | { type: 'dismissKeyboard'; locator?: Locator }
  | ExpectAction;

/** Step text -> the actions that completed it on the last good run. */
export type StepCache = Record<string, AgentAction[]>;

/**
 * Hooks around the key presses of a "type" action. `beforeKeys` runs after
 * the field is cleared (to check a timer's precondition); `afterLastKey`
 * runs right after the last key is released, when a timer starts.
 */
export interface TypingHooks {
  beforeKeys?(): Promise<void>;
  afterLastKey?(): Promise<void>;
}

/** Device operations. Injected in unit tests. */
export interface Device {
  observe(): Promise<{ pageSource: string; screenshot: Buffer }>;
  perform(action: AgentAction, hooks?: TypingHooks): Promise<void>;
  /** What a person reads in a field, for the check after a "type" action. */
  fieldText?(locator: Locator): Promise<string>;
  /**
   * `deep` also reads the visible text inside the element (a container's
   * children), as a person reads an area. Never used inside a timer window.
   */
  waitFor(
    locator: Locator,
    timeoutMs: number,
    textPattern?: string,
    deep?: boolean,
  ): Promise<void>;
  isVisibleNow(locator: Locator, textPattern?: string): Promise<boolean>;
  /** True while the system keyboard or an in-app keypad is on screen. */
  keyboardOpen?(): Promise<boolean>;
  /** Raw page source, for the code checks around each step. */
  pageSource?(): Promise<string>;
  /** Visible text of an element and its children, read before tapping it. */
  describe?(locator: Locator): Promise<string>;
}

/** Sends a prompt and screenshot to the model and returns its text reply. */
export interface Brain {
  ask(prompt: string, screenshot: Buffer): Promise<string>;
}

export interface TimerResult {
  name: string;
  valid: boolean;
  durationMs: number | null;
  reason?: string;
  /**
   * Pinned end check already held when the window opened. Measured anyway,
   * as the original spec does (its wait returns on the first poll).
   */
  endAlreadyVisible?: boolean;
}

export type StepSource = 'cache' | 'agent' | 'secret' | 'fixed';

export interface AgentRunResult {
  status: 'PASS' | 'INVALID_MEASUREMENT' | 'FAIL';
  steps: {
    number: number;
    text: string;
    /** fixed: checked only by the scenario's pinned checks. */
    source: StepSource;
    actions: AgentAction[];
    error?: string;
  }[];
  timers: TimerResult[];
  changedSteps: number[];
  modelCalls: number;
  /**
   * Page source when the run failed (never a secret screen), so a failure can
   * be judged without the device.
   */
  failureScreen?: string;
}
