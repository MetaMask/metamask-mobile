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
import type {
  AppCommand,
  Scenario,
  ScenarioStep,
  ScenarioTimer,
  StepCheck,
} from './scenario.ts';

export type Locator = RecoveredLocator;

/** Element that ends a timer, optionally once its text matches. */
interface EndTarget {
  locator: Locator;
  textPattern?: string;
  anyOf?: Locator[];
  code?: string;
}

/**
 * Only what a person can do on the screen: tap a visible element, scroll,
 * enter text through whatever keyboard the app shows, close that keyboard by
 * tapping something visible, and look for something.
 */
export type AgentAction =
  | { type: 'tap'; locator: Locator }
  | { type: 'type'; locator: Locator; text: string; method?: InputMethod }
  | { type: 'swipe'; direction: 'up' | 'down' }
  | { type: 'dismissKeyboard'; locator?: Locator }
  | {
      type: 'expect';
      locator: Locator;
      textPattern?: string;
      /**
       * Set on the element that proved a plain step took effect. Cached with
       * the step and checked again on replay; never performed as an action.
       */
      proof?: boolean;
    };

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

/**
 * Hooks around the key presses of a "type" action. `beforeKeys` runs after
 * the field is cleared (to check a timer's precondition); `afterLastKey`
 * runs right after the last key is released, when a timer starts.
 */
export interface TypingHooks {
  beforeKeys?(): Promise<void>;
  afterLastKey?(): Promise<void>;
}

export interface Point {
  x: number;
  y: number;
}

export interface LearnedKey {
  locator: Locator;
  center: Point;
}

/** How a field takes text, learned on the first run and replayed after. */
export interface InputMethod {
  input: 'keypad' | 'system';
  /**
   * Keypad only. "burst" (default): every key tapped at its centre in the
   * page source read once after the field tap, as one touch sequence with
   * short gaps; the field is read once, afterwards. "quick": key elements
   * clicked one by one with a check after the first key (used when a burst
   * did not register). "perKey": each key looked up and tapped with checks.
   */
  pace?: 'burst' | 'quick' | 'perKey';
  /** Keypad only: the key for each character of the text. */
  keys?: Record<string, LearnedKey>;
  deleteKey?: LearnedKey;
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
    /** fixed: checked only by the scenario's pinned checks. */
    source: 'cache' | 'agent' | 'secret' | 'fixed';
    actions: AgentAction[];
    error?: string;
  }[];
  timers: {
    name: string;
    valid: boolean;
    durationMs: number | null;
    reason?: string;
    /**
     * Pinned end check already held when the window opened. Measured anyway,
     * as the original spec does (its wait returns on the first poll).
     */
    endAlreadyVisible?: boolean;
  }[];
  changedSteps: number[];
  modelCalls: number;
  /**
   * Page source when the run failed (never a secret screen), so a failure can
   * be judged without the device.
   */
  failureScreen?: string;
  /**
   * Step wording the model proposed because the screen no longer matches it,
   * kept only for steps it then completed. A heal PR may apply these.
   */
  rewordings?: { number: number; text: string }[];
}

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

const MAX_ACTIONS_PER_STEP = 8;
/** Failed actions or checks fed back to the model before a step fails. */
const MAX_CORRECTIONS_PER_STEP = 2;
/** Longest wait for a keyboard to appear after the first tap on a field. */
const KEYBOARD_DISCOVERY_MS = 3_000;
/** Fixed gap between key clicks, so typing pace is the same every run. */
const KEY_GAP_MS = 120;
/** Burst taps: finger down for this long, then this gap before the next key. */
const BURST_PRESS_MS = 40;
const BURST_GAP_MS = 100;
const PER_KEY_GAP_MS = 300;
/** How long the end element may take to clear before a timed window. */
const PRECONDITION_MS = 5_000;
const DISMISS_CHECK_MS = 2_000;
const ACTION_TIMEOUT_MS = 5_000;
const EXPECT_TIMEOUT_MS = 15_000;
const TIMED_WINDOW_TIMEOUT_MS = 30_000;
const PAGE_SOURCE_LIMIT = 40_000;
/** How long the element that proves a step took effect may take to show. */
const PROOF_TIMEOUT_MS = 5_000;
const MAX_PROOF_ATTEMPTS = 2;
/** Same budget FooterActions.tapConfirmButton gives the footer to unmount. */
const GONE_TIMEOUT_MS = 30_000;

const checkName = (check: StepCheck): string =>
  check.code
    ? `code=${check.code}`
    : check.anyOf
      ? `any of ${check.anyOf.map((l) => `${l.strategy}=${l.value}`).join(' | ')}`
      : `${check.gone ? 'gone ' : ''}${check.locator.strategy}=${check.locator.value}${check.textPattern ? ` /${check.textPattern}/` : ''}`;
/** Whether a pinned check holds in a parsed page source. */
const checkVisibleIn = (nodes: ScreenNode[], check: StepCheck) =>
  check.anyOf
    ? check.anyOf.some((l) => visibleIn(nodes, l))
    : visibleIn(nodes, check.locator, check.textPattern);
const checkAction = (check: StepCheck): AgentAction => ({
  type: 'expect',
  locator: check.locator,
  ...(check.textPattern ? { textPattern: check.textPattern } : {}),
});
const MODEL_CALL_TIMEOUT_MS = 60_000;
/** Screen settling before a step's effect is judged (outside timers). */
const SETTLE_POLL_MS = 1_000;
const SETTLE_MAX_MS = 6_000;
const SETTLE_RETRY_MS = 4_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function systemKeyboardShown(): Promise<boolean> {
  try {
    return await getDriver().isKeyboardShown();
  } catch {
    return false;
  }
}

export interface ScreenNode {
  text: string;
  desc: string;
  id: string;
  top: number;
  center: Point;
  bounds: string;
  box: [number, number, number, number];
}

const decodeXml = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Visible nodes with bounds from one Android page source fetch. */
export function parseScreenNodes(xml: string): ScreenNode[] {
  const nodes: ScreenNode[] = [];
  for (const match of xml.matchAll(/<[\w.$]+\s([^>]*?)\/?>/g)) {
    const attrs = match[1];
    const attr = (name: string) =>
      decodeXml(
        attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? '',
      );
    const bounds = attr('bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!bounds || attr('displayed') === 'false') continue;
    const [x1, y1, x2, y2] = bounds.slice(1).map(Number);
    if (x2 <= x1 || y2 <= y1) continue;
    nodes.push({
      text: attr('text'),
      desc: attr('content-desc'),
      id: attr('resource-id'),
      top: y1,
      bounds: `[${x1},${y1}][${x2},${y2}]`,
      box: [x1, y1, x2, y2],
      center: { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) },
    });
  }
  return nodes;
}

/**
 * Alerts a person cannot get past by tapping around (missing funds). The run
 * stops on them instead of letting the model improvise, unless the step text
 * is about that alert.
 */
const BLOCKING_ALERTS: RegExp[] = [
  /insufficient funds/i,
  /insufficient balance/i,
  /(?:do not|don't) have enough [\w ]{1,40} to pay/i,
  /not enough [\w ]{1,30} to cover/i,
];

/** A state that stops the scenario; never fed back to the model as a correction. */
export class BlockingAlertError extends Error {}

/** A step that was claimed done but whose effect is not on screen. */
class ProgressError extends Error {}

export function findBlockingAlert(
  nodes: ScreenNode[],
  stepText: string,
): string | null {
  for (const node of nodes) {
    for (const value of [node.text, node.desc]) {
      if (!value) continue;
      const hit = BLOCKING_ALERTS.find((pattern) => pattern.test(value));
      if (hit && !hit.test(stepText)) return value;
    }
  }
  return null;
}

/**
 * Steps that submit something (Confirm, Submit, Approve, Sign, Place order,
 * or tapping Send / Swap on a review screen). Only these stop on a funds
 * alert up front; quote and review screens may show one harmlessly.
 * "Tap the Send button on the wallet home" opens a flow and is not one.
 */
export function isSubmitStep(stepText: string): boolean {
  if (
    /\b(?:confirm|submit|approve|sign|place (?:the |an? )?order|execute)\b/i.test(
      stepText,
    )
  ) {
    return true;
  }
  return (
    /^(?:tap|press|click)\s+(?:the\s+)?(?:send|swap)\b/i.test(stepText) &&
    !/\b(?:home|wallet|tab|menu)\b/i.test(stepText)
  );
}

/** Words that name structure, not content: a match proves nothing. */
const STRUCTURE_WORDS = new Set([
  'container',
  'scroll',
  'scrollview',
  'view',
  'wrapper',
  'root',
  'layout',
  'content',
  'frame',
  'body',
  'safe',
  'area',
  'main',
  'list',
  'flatlist',
  'section',
  'navbar',
  'header',
  'bar',
  'tabbar',
  'screen',
  'page',
  'id',
]);
/** Screens that are on display most of the run (the wallet home). */
const SCREEN_WORDS = new Set(['home', 'homepage', 'wallet', 'app']);

/**
 * Why an element cannot prove an expectation or a step's effect, or null.
 * Rejects generic containers (homepage-container, scroll views, class-only
 * XPaths), controls such as buttons and tabs, and the name of the place to
 * look ("Activity" for "... listed in Activity"), unless the step text is
 * literally about that element.
 */
export function genericLocatorReason(
  locator: Locator,
  stepText: string,
): string | null {
  const step = stepText.toLowerCase();
  const name = `${locator.strategy}=${locator.value}`;
  if (locator.strategy === 'nativeXPath') {
    return /@(?:text|content-desc|resource-id)\s*=/.test(locator.value)
      ? null
      : `${name} matches by element class only, so it proves nothing about this step`;
  }
  if (locator.strategy === 'testID') {
    const words = locator.value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    const meaningful = words.filter((w) => !STRUCTURE_WORDS.has(w));
    if (meaningful.length === 0) {
      return `${name} is a generic container`;
    }
    if (
      meaningful.every((w) => SCREEN_WORDS.has(w)) &&
      !meaningful.some((w) => step.includes(w.replace('page', '')))
    ) {
      return `${name} is a generic screen container; the step is not about that screen`;
    }
    if (
      words.some((w) => ['button', 'btn', 'tab'].includes(w)) &&
      !/\b(?:button|tab)\b/.test(step)
    ) {
      return `${name} is a control, which shows whether or not the step happened`;
    }
    return null;
  }
  // text / label: the visible words. Reject the place to look on its own.
  const place =
    /\b(?:in|on|at|from)\s+(?:the\s+)?([\w ]+?)(?:\s+(?:tab|screen|page|view|list))?\s*$/i
      .exec(stepText)?.[1]
      ?.trim()
      .toLowerCase();
  if (place && locator.value.trim().toLowerCase() === place) {
    return `${name} names where to look, not what the step expects`;
  }
  return null;
}

/** Nodes the locator matches in a parsed page source (nativeXPath: none). */
function matchingNodes(nodes: ScreenNode[], locator: Locator): ScreenNode[] {
  switch (locator.strategy) {
    case 'testID':
      return nodes.filter((n) => n.id === locator.value);
    case 'text':
      return nodes.filter((n) => n.text === locator.value);
    case 'label':
      return nodes.filter(
        (n) => n.desc === locator.value || n.text === locator.value,
      );
    default:
      return [];
  }
}

/** Visible text of a node and everything inside its bounds. */
function textInside(nodes: ScreenNode[], outer: ScreenNode): string {
  const [x1, y1, x2, y2] = outer.box;
  return nodes
    .filter(
      (n) =>
        n.center.x >= x1 &&
        n.center.x <= x2 &&
        n.center.y >= y1 &&
        n.center.y <= y2,
    )
    .flatMap((n) => [n.text, n.desc].filter(Boolean))
    .join(' ');
}

/** Whether the element (and its text, when given) is in a parsed page source. */
export function visibleIn(
  nodes: ScreenNode[],
  locator: Locator,
  textPattern?: string,
): boolean {
  const matches = matchingNodes(nodes, locator);
  if (!textPattern) return matches.length > 0;
  const pattern = new RegExp(textPattern);
  return matches.some((n) => pattern.test(textInside(nodes, n)));
}

/**
 * What a person would notice changing on the screen. Status bar, prices,
 * balances and clocks are left out, since they change by themselves.
 */
export function screenSignature(nodes: ScreenNode[]): string {
  const numeric = /^[\s\d$€£¥%+\-−.,:()<>~≈]*$/;
  const clean = (value: string) => (numeric.test(value) ? '#' : value);
  return [
    ...new Set(
      nodes
        .filter((n) => !n.id.startsWith('com.android.systemui'))
        .map((n) => `${n.id}|${clean(n.text)}|${clean(n.desc)}`),
    ),
  ]
    .sort()
    .join('\n');
}

/** Taps that spend or add money, allowed only when the step asks for them. */
/** Why a tap would submit something the step does not ask to submit, or null. */
export function submitTapReason(
  target: string,
  stepText: string,
): string | null {
  if (isSubmitStep(stepText)) return null;
  if (!/\b(?:confirm|submit|sign|approve|place order)\b/i.test(target))
    return null;
  return `refusing to tap "${target.trim()}": only a Confirm/Submit step may submit, and this step is "${stepText}"`;
}

export function fundingTapReason(
  elementText: string,
  stepText: string,
): string | null {
  const funding = /\b(?:buy|add funds|deposit|top up|on-?ramp|fund your)\b/i;
  if (
    !funding.test(elementText) ||
    funding.test(stepText) ||
    /\bfund/i.test(stepText)
  )
    return null;
  return `"${elementText.trim().slice(0, 60)}" buys or adds funds, which this step does not ask for`;
}

/**
 * The on-screen key a person would press for `char`: its visible text, then
 * its content-desc, then the keypad-key-* id. Only the lower part of the
 * screen counts (where keypads sit) and the lowest match wins, so a "0" in
 * an amount field is never used.
 */
function findKeyNode(
  nodes: ScreenNode[],
  char: string,
  screenHeight: number,
): LearnedKey | null {
  const id = char === '.' ? 'keypad-key-dot' : `keypad-key-${char}`;
  const lower = nodes.filter((n) => n.top >= screenHeight * 0.4);
  const tests: [(n: ScreenNode) => boolean, (n: ScreenNode) => Locator][] = [
    [
      (n) => n.text === char,
      (n) => ({
        strategy: 'nativeXPath',
        value: `//*[@text=${JSON.stringify(char)} and @bounds="${n.bounds}"]`,
      }),
    ],
    [
      (n) => n.desc === char,
      (n) => ({
        strategy: 'nativeXPath',
        value: `//*[@content-desc=${JSON.stringify(char)} and @bounds="${n.bounds}"]`,
      }),
    ],
    [(n) => n.id === id, () => ({ strategy: 'testID', value: id })],
  ];
  // A node with the key's id wins, since ids stay put between runs.
  const byId = lower.find((n) => n.id === id);
  if (byId)
    return { locator: { strategy: 'testID', value: id }, center: byId.center };
  for (const [test, toLocator] of tests) {
    const match = lower.filter(test).sort((a, b) => b.top - a.top)[0];
    if (match) return { locator: toLocator(match), center: match.center };
  }
  return null;
}

function findDeleteNode(nodes: ScreenNode[]): LearnedKey | null {
  const match =
    nodes.find((n) => n.id === 'keypad-delete-button') ??
    nodes.find((n) => /delete|backspace/i.test(n.desc));
  if (!match) return null;
  return {
    locator: match.id
      ? { strategy: 'testID', value: match.id }
      : { strategy: 'label', value: match.desc },
    center: match.center,
  };
}

/** What a field shows in a parsed page source: its own text, or text inside it. */
export function fieldTextIn(
  nodes: ScreenNode[],
  locator: Locator,
): string | null {
  const field = nodes.find((n) =>
    locator.strategy === 'testID'
      ? n.id === locator.value
      : locator.strategy === 'label'
        ? n.desc === locator.value || n.text === locator.value
        : locator.strategy === 'text'
          ? n.text === locator.value
          : false,
  );
  if (!field) return null;
  if (field.text.trim()) return field.text.trim();
  const [x1, y1, x2, y2] = field.box;
  return nodes
    .filter(
      (n) =>
        n !== field &&
        n.center.x >= x1 &&
        n.center.x <= x2 &&
        n.center.y >= y1 &&
        n.center.y <= y2,
    )
    .flatMap((n) => [n.text, n.desc].filter(Boolean))
    .join(' ')
    .trim();
}

/**
 * Where to tap for a burst, all from one page source: delete presses that
 * clear the field, then one press per character. Null when a key the text
 * needs is not on screen (the keypad has not opened yet).
 */
export function planBurst(
  nodes: ScreenNode[],
  text: string,
  field: Locator,
  height: number,
): { clear: Point[]; keys: Point[]; shown: string; field?: Point } | null {
  const centers = new Map<string, Point>();
  for (const char of new Set(text)) {
    const key = findKeyNode(nodes, char, height);
    if (!key) return null;
    centers.set(char, key.center);
  }
  const shown = fieldTextIn(nodes, field) ?? '';
  const needsClear = shown !== '' && shown !== '0';
  const del = needsClear ? findDeleteNode(nodes) : null;
  if (needsClear && !del) return null;
  const fieldNode = nodes.find((n) =>
    field.strategy === 'testID'
      ? n.id === field.value
      : field.strategy === 'label'
        ? n.desc === field.value || n.text === field.value
        : field.strategy === 'text'
          ? n.text === field.value
          : false,
  );
  return {
    clear: needsClear && del ? Array(shown.length).fill(del.center) : [],
    keys: [...text].map((char) => centers.get(char) as Point),
    shown,
    ...(fieldNode ? { field: fieldNode.center } : {}),
  };
}

/** Pause after the field tap inside a burst, so focus moves before the keys. */
const FIELD_FOCUS_MS = 250;
/** Same, when the keypad itself only opens on that tap. */
const KEYPAD_OPEN_MS = 600;

/**
 * A burst plan for a keypad that is not open yet: the field (and what it
 * shows) from the snapshot, the keys at their learned centres.
 */
export function learnedBurstPlan(
  nodes: ScreenNode[],
  text: string,
  field: Locator,
  method: InputMethod,
): {
  clear: Point[];
  keys: Point[];
  shown: string;
  field?: Point;
  learned: true;
} | null {
  const keys = method.keys ?? {};
  if (![...text].every((char) => keys[char]?.center)) return null;
  const fieldNode = nodes.find((n) =>
    field.strategy === 'testID'
      ? n.id === field.value
      : field.strategy === 'label'
        ? n.desc === field.value || n.text === field.value
        : field.strategy === 'text'
          ? n.text === field.value
          : false,
  );
  if (!fieldNode) return null;
  const shown = fieldTextIn(nodes, field) ?? '';
  const needsClear = shown !== '' && shown !== '0';
  if (needsClear && !method.deleteKey?.center) return null;
  return {
    clear:
      needsClear && method.deleteKey
        ? Array(shown.length).fill(method.deleteKey.center)
        : [],
    keys: [...text].map((char) => keys[char].center),
    shown,
    field: fieldNode.center,
    learned: true,
  };
}

/** One W3C touch sequence for all taps: one request instead of one per key. */
export function burstActions(
  points: Point[],
  pressMs = BURST_PRESS_MS,
  gapMs = BURST_GAP_MS,
  firstGapMs = gapMs,
): Record<string, unknown>[] {
  const steps: Record<string, unknown>[] = [];
  points.forEach((point, i) => {
    if (i > 0)
      steps.push({ type: 'pause', duration: i === 1 ? firstGapMs : gapMs });
    steps.push(
      {
        type: 'pointerMove',
        duration: 0,
        x: Math.round(point.x),
        y: Math.round(point.y),
      },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: pressMs },
      { type: 'pointerUp', button: 0 },
    );
  });
  return steps;
}

async function tapBurst(points: Point[], firstGapMs?: number): Promise<void> {
  if (points.length === 0) return;
  const drv = getDriver();
  await drv.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: burstActions(points, BURST_PRESS_MS, BURST_GAP_MS, firstGapMs),
    },
  ]);
  // Every sequence ends with pointerUp, so nothing is left pressed; skipping
  // releaseActions saves one grid round trip per burst.
}

let windowHeight: number | undefined;
async function screenHeight(): Promise<number> {
  windowHeight ??= (await getDriver().getWindowSize()).height;
  return windowHeight;
}

async function inAppKeypadVisible(): Promise<boolean> {
  const nodes = parseScreenNodes(await getDriver().getPageSource());
  const height = await screenHeight();
  return (
    findKeyNode(nodes, '1', height) !== null &&
    findKeyNode(nodes, '9', height) !== null
  );
}

/** All visible text inside an element's bounds, from one page source. */
async function textWithin(locator: Locator): Promise<string> {
  const native = await (await getElementForLocator(locator)).unwrap();
  const { x, y } = await native.getLocation();
  const { width, height } = await native.getSize();
  return parseScreenNodes(await getDriver().getPageSource())
    .filter(
      (n) =>
        n.center.x >= x &&
        n.center.x <= x + width &&
        n.center.y >= y &&
        n.center.y <= y + height,
    )
    .flatMap((n) => [n.text, n.desc].filter(Boolean))
    .join(' ');
}

/** What a person reads in a field; some amount fields keep the text in a child. */
const fieldText = async (locator: Locator) => {
  const own = (
    (await (await getElementForLocator(locator)).textContent()) ?? ''
  ).trim();
  return own || (await textWithin(locator)).trim();
};

/**
 * After tapping the field, find which keyboard opened, with one page source
 * per poll and no fixed wait: the system keyboard, or the in-app keypad and
 * every key the text needs.
 */
async function discoverInput(
  locator: Locator,
  text: string,
): Promise<InputMethod> {
  const height = await screenHeight();
  const start = Date.now();
  let missing = '';
  while (Date.now() - start < KEYBOARD_DISCOVERY_MS) {
    if (await systemKeyboardShown()) return { input: 'system' };
    const nodes = parseScreenNodes(await getDriver().getPageSource());
    const keys: Record<string, LearnedKey> = {};
    missing = '';
    for (const char of new Set(text)) {
      const key = findKeyNode(nodes, char, height);
      if (key) keys[char] = key;
      else missing += char;
    }
    if (!missing) {
      const deleteKey = findDeleteNode(nodes);
      return {
        input: 'keypad',
        pace: 'burst',
        keys,
        ...(deleteKey ? { deleteKey } : {}),
      };
    }
    await sleep(150);
  }
  throw new Error(
    `tapped ${locator.strategy}=${locator.value}, but neither the system keyboard nor on-screen keys for "${missing}" appeared`,
  );
}

/**
 * Enters text the way a person does: tap the field, then press the keys of
 * whichever keyboard appears. Values are never injected into the element.
 *
 * The first run discovers the keyboard and stores it on `action.method`
 * (saved in the cache). Later runs replay it directly: tap the field, clear
 * it, tap the stored key centres back-to-back. The read-back check runs once,
 * in ScenarioAgent.verify; if it fails, the agent rediscovers.
 */
async function typeLikeAHuman(
  action: Extract<AgentAction, { type: 'type' }>,
  hooks: TypingHooks = {},
): Promise<void> {
  const { locator, text } = action;
  const startedAt = Date.now();
  let keysStartedAt = 0;
  const learnedBurst =
    action.method?.input === 'keypad' &&
    (action.method.pace ?? 'burst') === 'burst';
  if (learnedBurst) {
    // One page source before touching anything. When the keypad and the
    // field are both on it, the field tap, the clear presses and the keys go
    // out as one touch sequence: one snapshot and one request in total.
    const height = await screenHeight();
    const nodes = parseScreenNodes(await getDriver().getPageSource());
    const snapshotAt = Date.now();
    // Keypad already open: every centre comes from this snapshot. Keypad
    // opens on the field tap: the learned key centres (same device and
    // layout) after a longer pause; a miss is caught by the one read-back
    // in verify, which falls back to element clicks.
    const plan =
      planBurst(nodes, text, locator, height) ??
      learnedBurstPlan(nodes, text, locator, action.method as InputMethod);
    if (plan?.field) {
      const learnedCentres = 'learned' in plan;
      const focusMs = learnedCentres ? KEYPAD_OPEN_MS : FIELD_FOCUS_MS;
      if (hooks.beforeKeys) {
        await tapBurst([plan.field, ...plan.clear], focusMs);
        await hooks.beforeKeys();
        keysStartedAt = Date.now();
        await tapBurst(plan.keys);
      } else {
        keysStartedAt = Date.now();
        await tapBurst([plan.field, ...plan.clear, ...plan.keys], focusMs);
      }
      const doneAt = Date.now();
      console.log(
        `[scenario-agent] Typed "${text}" via keypad (learned, burst, one sequence, ${learnedCentres ? 'learned key centres' : 'keys from snapshot'}) in ${doneAt - startedAt} ms; snapshot ${snapshotAt - startedAt} ms, field tap + ${plan.clear.length} clear + ${plan.keys.length} key presses ${doneAt - keysStartedAt} ms`,
      );
      await hooks.afterLastKey?.();
      return;
    }
  }
  // A real element click on the field, like every other tap.
  await (await getElementForLocator(locator)).unwrap().click();
  const learned = action.method;
  const method = learned ?? (await discoverInput(locator, text));
  action.method = method;

  if (method.input === 'system') {
    await hooks.beforeKeys?.();
    await getDriver().keys(text.split(''));
    console.log(
      `[scenario-agent] Typed "${text}" via system keyboard (${learned ? 'learned' : 'discovered'}) in ${Date.now() - startedAt} ms`,
    );
    if (hooks.afterLastKey) {
      await hooks.afterLastKey();
    } else if (await systemKeyboardShown()) {
      // Close the keyboard as a person (and the original page objects) would,
      // so it does not cover the next button. Kept out of timed windows.
      await Gestures.hideKeyboard();
    }
    return;
  }

  if ((method.pace ?? 'burst') === 'burst') {
    // One page source after the field tap gives every key centre and the
    // field's text; polled only until the keypad is open.
    const clickedAt = Date.now();
    const height = await screenHeight();
    const deadline = Date.now() + KEYBOARD_DISCOVERY_MS;
    let plan = planBurst(
      parseScreenNodes(await getDriver().getPageSource()),
      text,
      locator,
      height,
    );
    while (!plan && Date.now() < deadline) {
      await sleep(150);
      plan = planBurst(
        parseScreenNodes(await getDriver().getPageSource()),
        text,
        locator,
        height,
      );
    }
    if (!plan)
      throw new Error(
        `keypad keys for "${text}" did not appear after tapping the field`,
      );
    method.pace = 'burst';
    const snapshotAt = Date.now();
    if (hooks.beforeKeys) {
      // A timer starts between clearing and the first key: two bursts.
      await tapBurst(plan.clear);
      await hooks.beforeKeys();
      keysStartedAt = Date.now();
      await tapBurst(plan.keys);
    } else {
      // Nothing to run in between: clear and keys in one touch sequence.
      keysStartedAt = Date.now();
      await tapBurst([...plan.clear, ...plan.keys]);
    }
    const doneAt = Date.now();
    console.log(
      `[scenario-agent] Typed "${text}" via keypad (${learned ? 'learned' : 'discovered'}, burst) in ${doneAt - startedAt} ms; field tap ${clickedAt - startedAt} ms, keypad snapshot ${snapshotAt - clickedAt} ms, ${plan.clear.length} clear + ${plan.keys.length} key presses ${doneAt - keysStartedAt} ms`,
    );
    await hooks.afterLastKey?.();
    // Read back once, in ScenarioAgent.verify; a miss falls back to "quick".
    return;
  }

  const keys = method.keys ?? {};
  // Resolve every key element once, before any key is pressed. A learned
  // keypad is resolved here as well, which also waits for it to open.
  const resolve = async (key: LearnedKey) => {
    const element = await (await getElementForLocator(key.locator)).unwrap();
    await element.waitForExist({ timeout: KEYBOARD_DISCOVERY_MS });
    return element;
  };
  const elements = new Map<string, WebdriverIO.Element>();
  for (const char of new Set(text)) {
    if (!keys[char]) throw new Error(`no learned key for "${char}"`);
    elements.set(
      char,
      (await resolve(keys[char])) as unknown as WebdriverIO.Element,
    );
  }

  // Clear what is already in the field with the visible delete key.
  const current = await fieldText(locator);
  if (current !== '' && current !== '0') {
    if (!method.deleteKey) {
      throw new Error(`field shows "${current}" and no delete key is visible`);
    }
    const del = await resolve(method.deleteKey);
    for (let i = 0; i < current.length; i++) {
      if (i > 0) await sleep(KEY_GAP_MS);
      await del.click();
    }
  }
  const initial = await fieldText(locator);
  await hooks.beforeKeys?.();

  // The first key press whose result differs from what the field shows now
  // ("0." for "0.01" in an empty field) proves the keys register.
  const checkAt = [...text].findIndex(
    (_, i) => text.slice(0, i + 1) !== initial,
  );

  const typePerKey = async () => {
    for (const [i, char] of [...text].entries()) {
      if (i > 0) await sleep(PER_KEY_GAP_MS);
      await Gestures.waitAndTap(getElementForLocator(keys[char].locator), {
        timeout: ACTION_TIMEOUT_MS,
        checkEnabled: false,
        elemDescription: `keypad key ${char}`,
      });
    }
  };

  keysStartedAt = Date.now();
  if (method.pace === 'perKey') {
    await typePerKey();
  } else {
    let registered = true;
    for (const [i, char] of [...text].entries()) {
      if (i > 0) await sleep(KEY_GAP_MS);
      await (elements.get(char) as WebdriverIO.Element).click();
      if (i === checkAt && i < text.length - 1) {
        const shown = await fieldText(locator);
        if (shown !== text.slice(0, i + 1)) {
          registered = false;
          break;
        }
      }
    }
    if (!registered) {
      // Quick clicks were ignored: clear and type key by key instead, and
      // remember that this keypad needs it.
      const shown = await fieldText(locator);
      if (shown !== '' && shown !== '0' && method.deleteKey) {
        const del = await resolve(method.deleteKey);
        for (const _char of shown) await del.click();
      }
      method.pace = 'perKey';
      await typePerKey();
    }
  }
  // The last click has returned: the full text is in.
  const doneAt = Date.now();
  console.log(
    `[scenario-agent] Typed "${text}" via keypad (${learned ? 'learned' : 'discovered'}, ${method.pace}) in ${doneAt - startedAt} ms; key presses ${doneAt - keysStartedAt} ms`,
  );
  await hooks.afterLastKey?.();
  // The read-back happens in ScenarioAgent.verify, after any timer window.
}

/** A finger drag across the middle of the screen. "up" moves the finger up, which reveals content further down a list. */
async function swipe(direction: 'up' | 'down'): Promise<void> {
  const drv = getDriver();
  const { width, height } = await drv.getWindowSize();
  const [from, to] = direction === 'up' ? [0.7, 0.3] : [0.3, 0.7];
  await drv
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ x: Math.round(width / 2), y: Math.round(height * from) })
    .down()
    .pause(100)
    .move({
      duration: 400,
      x: Math.round(width / 2),
      y: Math.round(height * to),
    })
    .up()
    .perform();
}

/** The coordinate drag Gestures.scrollWithinContainer uses: no hold, 600 ms. */
async function dragLikePageObjects(direction: 'up' | 'down'): Promise<void> {
  const drv = getDriver();
  const { width, height } = await drv.getWindowSize();
  const [from, to] = direction === 'up' ? [0.75, 0.35] : [0.35, 0.75];
  const x = Math.round(width / 2);
  await drv.swipe({
    direction,
    duration: 600,
    from: { x, y: Math.round(height * from) },
    to: { x, y: Math.round(height * to) },
  });
}

const appiumDevice: Device = {
  async observe() {
    const appium = getDriver();
    return {
      pageSource: (await appium.getPageSource()).slice(0, PAGE_SOURCE_LIMIT),
      screenshot: Buffer.from(await appium.takeScreenshot(), 'base64'),
    };
  },
  fieldText,
  async perform(action, hooks) {
    switch (action.type) {
      case 'tap':
        return Gestures.waitAndTap(getElementForLocator(action.locator), {
          timeout: ACTION_TIMEOUT_MS,
          elemDescription: action.locator.value,
        });
      case 'type':
        return typeLikeAHuman(action, hooks);
      case 'swipe': {
        // Some lists (the account hub) ignore the first drag; if nothing
        // moved, drag again the way the Page Objects do.
        const before = screenSignature(
          parseScreenNodes(await getDriver().getPageSource()),
        );
        await swipe(action.direction);
        await sleep(400);
        const after = screenSignature(
          parseScreenNodes(await getDriver().getPageSource()),
        );
        if (after === before) await dragLikePageObjects(action.direction);
        return;
      }
      case 'dismissKeyboard':
        // A person closes the system keyboard with its own control (back).
        if (await systemKeyboardShown()) return Gestures.hideKeyboard();
        if (action.locator) {
          return Gestures.waitAndTap(getElementForLocator(action.locator), {
            timeout: ACTION_TIMEOUT_MS,
            checkForDisplayed: true,
            checkEnabled: false,
            elemDescription: `dismiss keyboard via ${action.locator.value}`,
          });
        }
        throw new Error(
          'an in-app keypad is closed by tapping a visible element; give its locator',
        );
      case 'expect':
        return appiumDevice.waitFor(
          action.locator,
          EXPECT_TIMEOUT_MS,
          action.textPattern,
          true,
        );
    }
  },
  keyboardOpen: async () =>
    (await systemKeyboardShown()) || (await inAppKeypadVisible()),
  pageSource: () => getDriver().getPageSource(),
  async describe(locator) {
    const element = await getElementForLocator(locator);
    const own = ((await element.textContent()) ?? '').trim();
    let inside = '';
    try {
      inside = await textWithin(locator);
    } catch {
      // Not resolvable for text reading; the tap itself will report it.
    }
    return `${own} ${inside}`.trim();
  },
  async waitFor(locator, timeout, textPattern, deep = false) {
    if (!textPattern) {
      return Assertions.expectElementToBeVisible(
        getElementForLocator(locator),
        {
          timeout,
          description: `${locator.strategy}=${locator.value}`,
        },
      );
    }
    // Same polling as QuoteView.waitForQuoteReady: read the text until it matches.
    const pattern = new RegExp(textPattern);
    const start = Date.now();
    let lastSeen = '<element not found>';
    while (Date.now() - start < timeout) {
      try {
        lastSeen = await (await getElementForLocator(locator)).textContent();
        if (pattern.test(lastSeen ?? '')) return;
        if (deep) {
          lastSeen = await textWithin(locator);
          if (pattern.test(lastSeen)) return;
        }
      } catch {
        lastSeen = '<element not found>';
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(
      `${locator.strategy}=${locator.value} text did not match /${textPattern}/ after ${timeout}ms, got: "${lastSeen}"`,
    );
  },
  isVisibleNow: (locator, textPattern) =>
    withImplicitWait(0, async () => {
      try {
        const element = await getElementForLocator(locator);
        if (!(await element.unwrap().isDisplayed())) return false;
        return textPattern
          ? new RegExp(textPattern).test((await element.textContent()) ?? '')
          : true;
      } catch {
        return false;
      }
    }),
};

/**
 * Model for scenario runs: cheap, since replays from the cache make no calls.
 * `||`, not `??`: CI may set ANTHROPIC_MODEL / ANTHROPIC_BASE_URL to "".
 */
export const SCENARIO_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export function scenarioModelConfig(env: NodeJS.ProcessEnv = process.env): {
  model: string;
  baseURL?: string;
} {
  const baseURL = env.ANTHROPIC_BASE_URL || undefined;
  return {
    model: env.ANTHROPIC_MODEL || SCENARIO_DEFAULT_MODEL,
    ...(baseURL ? { baseURL } : {}),
  };
}

/**
 * The key, read from the live environment (`env.X`, not `process.env.X`, so
 * no build step inlines it). Empty or unset gives "", which ClaudeProvider
 * rejects with "ANTHROPIC_API_KEY is required": a clear step FAIL, no call.
 */
export function scenarioApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.ANTHROPIC_API_KEY || '';
}

function claudeBrain(): Brain {
  let provider: ClaudeProvider | undefined;
  return {
    async ask(prompt, screenshot) {
      provider ??= new ClaudeProvider({
        maxTokens: 512,
        apiKey: scenarioApiKey(),
        ...scenarioModelConfig(),
      });
      const claude = provider;
      // A stalled call is abandoned and asked once more, so one slow reply
      // does not eat the test timeout.
      for (let attempt = 1; ; attempt++) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const result = await Promise.race([
            claude.analyzeImage(prompt, screenshot),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(`no reply within ${MODEL_CALL_TIMEOUT_MS} ms`),
                  ),
                MODEL_CALL_TIMEOUT_MS,
              );
            }),
          ]);
          if (!result.success)
            throw new Error(`Claude call failed: ${result.summary}`);
          return result.rawResponse;
        } catch (error) {
          if (attempt >= 2) throw error;
          console.log(
            `[scenario-agent] Model call failed (${errorMessage(error)}); retrying once`,
          );
        } finally {
          clearTimeout(timer);
        }
      }
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

function parseReply(raw: string): {
  action: AgentAction;
  final: boolean;
  satisfied: boolean;
  reword?: string;
} {
  const json = raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1');
  const reply = JSON.parse(json) as {
    action?: AgentAction;
    type?: string;
    final?: boolean;
    satisfied?: boolean;
    rewordStep?: unknown;
  };
  // Smaller models sometimes drop the {"action": ...} wrapper.
  const candidate = (reply.action ??
    (typeof reply.type === 'string' ? reply : undefined)) as
    | { type: string; [key: string]: unknown }
    | undefined;
  const action = (
    candidate?.type === 'hideKeyboard'
      ? { ...candidate, type: 'dismissKeyboard' }
      : candidate
  ) as AgentAction | undefined;
  const valid =
    (action?.type === 'tap' && isLocator(action.locator)) ||
    (action?.type === 'type' &&
      isLocator(action.locator) &&
      typeof action.text === 'string' &&
      action.text.length > 0) ||
    (action?.type === 'swipe' &&
      (action.direction === 'up' || action.direction === 'down')) ||
    (action?.type === 'dismissKeyboard' &&
      (action.locator === undefined || isLocator(action.locator))) ||
    (action?.type === 'expect' && isLocator(action.locator));
  if (!action || !valid)
    throw new Error(`Model returned an unusable action: ${raw}`);
  if (action.type === 'type') delete action.method;
  const reword =
    typeof reply.rewordStep === 'string' && reply.rewordStep.trim()
      ? reply.rewordStep.trim()
      : undefined;
  return {
    action,
    final: reply.final === true,
    satisfied: reply.satisfied === true,
    ...(reword ? { reword } : {}),
  };
}

const summarize = (actions: AgentAction[] = []) =>
  actions
    .map((a) =>
      'locator' in a && a.locator
        ? `${a.type} ${a.locator.strategy}=${a.locator.value}`
        : a.type === 'swipe'
          ? `swipe ${a.direction}`
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
  private readonly rewordProposals = new Map<number, string>();
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
        if (step.condition && !(await this.conditionHolds(step.condition))) {
          // Like the original's `if`: the step and any timer on it are skipped.
          this.log(
            `Step ${step.number}: skipped ([if: ${step.condition}] is false)`,
          );
          this.record(step, 'fixed', []);
          continue;
        }
        if (step.kind === 'secret') {
          await this.options.runSecretStep(step.text);
          this.record(step, 'secret', []);
        } else if (step.kind === 'app' && timer) {
          const untilIndex = steps.findIndex((s) => s.number === timer.until);
          current = steps[untilIndex];
          await this.runTimedApp(step, steps[untilIndex], timer);
          i = untilIndex;
        } else if (step.kind === 'app') {
          await this.runApp(step);
        } else if (timer) {
          const untilIndex = steps.findIndex((s) => s.number === timer.until);
          const between = steps.slice(i + 1, untilIndex);
          current = steps[untilIndex];
          await this.runTimedPair(step, steps[untilIndex], timer, between);
          i = untilIndex;
        } else if (step.kind === 'expect') {
          await this.runExpect(step);
        } else {
          // Right before a clock mark ("App: start the clock"), the step's
          // action must return as the original's tap does: no wait for a
          // proof, which would let the next screen load before the clock
          // starts. The timer's pinned end check verifies it instead.
          const next = steps[i + 1];
          const beforeClock =
            next?.kind === 'app' && next.app?.command === 'startClock';
          // A pinned tap followed by a pinned Expect: that check is the
          // proof, as in the original (tap, then assert); no model call.
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
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      configurePerformanceLocatorRecovery(perTapRecovery);
    }

    if (this.result.status !== 'FAIL') {
      if (this.result.timers.some((t) => !t.valid)) {
        for (const t of this.result.timers.filter((x) => !x.valid)) {
          this.log(`INVALID_MEASUREMENT: "${t.name}": ${t.reason ?? ''}`);
        }
        this.result.status = 'INVALID_MEASUREMENT';
      }
      this.saveCache();
    }
    this.result.modelCalls = this.modelCalls;
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
    mode: 'do' | 'expect' | 'predict' | 'proof',
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
    // On a submit step, a blocking alert stops the run before the model is
    // asked to act, so it cannot work around it. Other steps (quotes, review
    // screens, expectations) may show one; it stops them only if the step
    // then fails to take effect (see confirmProgress).
    if (mode === 'do' && isSubmitStep(step.text)) {
      this.stopOnBlockingAlert(step, parseScreenNodes(screen.pageSource));
    }
    const next = this.options.scenario.steps.find(
      (s) => s.number === step.number + 1,
    );
    const task = {
      do:
        'Return the next single action. Set "final": true on the action that completes the step.' +
        (isSubmitStep(step.text) || history.length > 0 || step.checks
          ? ''
          : ' If, before you do anything, the screen ALREADY shows what this step is meant to reach (for example the step opens a screen or tab that is already open), reply {"satisfied":true,"action":{"type":"expect","locator":L}} with a specific element of that screen instead of acting. Never use this for a step whose action has simply not happened yet.'),
      expect:
        'Return one "expect" action for an element that proves the expectation is met now. ' +
        'Pick the specific thing the expectation names (a row, a value, a message), never a generic container, scroll view, button or tab.',
      predict:
        'This expectation will be checked right after the previous action, which has NOT happened yet. ' +
        'Return one "expect" action for an element that will appear only once it is met. ' +
        'It must NOT already be on the current screen, because its appearance is what gets timed.',
      proof:
        'The actions above were just performed for this step. Check the current screen. ' +
        'If the step\'s intended effect is visible, return {"action":{"type":"expect","locator":L,"textPattern":"..."(optional)},"final":true} ' +
        'for a specific element that proves it and that was NOT on the screen before the step started ' +
        '(not a generic container, scroll view, button or tab; use testID, text or label, not nativeXPath; ' +
        'prefer elements whose text does not depend on balances or prices). ' +
        'Apps often move on by themselves once a step is done: after Confirm or Submit the app may open the Activity list or a status screen, after Continue the next form appears. ' +
        'Arriving at such a natural next screen IS the effect of the step: prove it with a specific element of that new screen. ' +
        (next
          ? `The next scenario step is "${next.text}", so the screen it needs counts too. `
          : '') +
        'If the step did not take effect (wrong screen, nothing changed, an error), reply {"done":false,"reason":"..."}.',
    }[mode];
    this.modelCalls += 1;
    const askStartedAt = Date.now();
    const raw = await this.brain.ask(
      [
        `You drive the MetaMask mobile app (${this.options.platform}) through Appium.`,
        `Step ${step.number}: "${step.text}"`,
        task,
        note,
        `Actions already done for this step: ${JSON.stringify(history)}`,
        `testIDs used by the existing Page Objects (prefer them when they fit): ${(this.options.hints ?? []).join(', ')}`,
        'Act like a person using the phone: only tap elements that are visible in the screenshot, scroll, and enter text through the keyboard the app shows.',
        'Never tap Buy, Add funds or Deposit unless the step asks for it. If an error or alert stops the step (for example insufficient funds), reply {"blocked":"<what it says>"} instead of working around it.',
        'Reply with JSON only: {"action": ACTION, "final": true|false} where ACTION is one of',
        '{"type":"tap","locator":L} | {"type":"type","locator":L,"text":"..."} | {"type":"swipe","direction":"up"|"down"} | {"type":"dismissKeyboard","locator":L} | {"type":"expect","locator":L}',
        '"swipe" "up" drags the finger up the screen, which reveals items further DOWN a list; "down" drags it down, back towards the top.',
        'and L is {"strategy":"testID"|"label"|"text"|"nativeXPath","value":"..."} for an element in the page source.',
        'Prefer testID, then label, then text; use nativeXPath only if nothing else identifies the element.',
        '"type" enters the whole text into a field: the runner taps the field and then presses the keys of whichever keyboard appears (system keyboard or the app\'s own keypad), one by one. Use one "type" action for the whole text; do not tap keypad keys yourself.',
        '"dismissKeyboard" closes the keyboard or keypad by tapping the visible element L, which must be a non-interactive element outside the keypad (for example a label or a dismiss target). Omit L only for the system keyboard. The runner checks that the keypad is gone.',
        'An "expect" action may add "textPattern": a JavaScript regex the element text must match. Use it when the expectation is about a value (for example a positive amount: "[1-9]"), because the element itself may already be on screen before the value appears.',
        'Every step is checked by code afterwards: claiming "final" when the step has not taken effect only costs a correction.',
        'If the step\'s wording no longer matches the screen (for example a button was renamed), you may add "rewordStep": "<the step rewritten for the current screen, same intent>" to your reply. A person reviews it; never use it to change what the step does.',
        `Page source:\n${screen.pageSource}`,
      ]
        .filter(Boolean)
        .join('\n'),
      screen.screenshot,
    );
    this.log(
      `Model call ${this.modelCalls} (step ${step.number}, ${mode}): ${Date.now() - askStartedAt} ms`,
    );
    const blocked = /"blocked"\s*:\s*"([^"]*)"/.exec(raw)?.[1];
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
  ): Promise<{ action: AgentAction; final: boolean; satisfied: boolean }> {
    const raw = await this.askModel(step, mode, history, note);
    try {
      const reply = parseReply(raw);
      if (reply.reword && reply.reword !== step.text) {
        this.rewordProposals.set(step.number, reply.reword);
      }
      return reply;
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
   * Refuses taps on Buy / Add funds unless the step asks for them, and taps
   * that submit (Confirm, Sign, ...) outside a submit step, so a correction
   * on "Tap Review" can never send a transaction.
   */
  private async guard(step: ScenarioStep, action: AgentAction): Promise<void> {
    if (action.type !== 'tap') return;
    let text = '';
    if (this.device.describe) {
      try {
        text = await this.device.describe(action.locator);
      } catch {
        // not found: the tap reports it
      }
    }
    const submit = submitTapReason(
      `${action.locator.value} ${text}`,
      step.text,
    );
    if (submit) throw new Error(submit);
    if (!this.device.describe) return;
    const reason = fundingTapReason(
      `${action.locator.value} ${text}`,
      step.text,
    );
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
    cachedProof?: Extract<AgentAction, { type: 'expect' }>,
  ): Promise<Extract<AgentAction, { type: 'expect' }> | undefined> {
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

  /** Runs pinned checks in order; returns the first failure, or null. */
  private async fixedChecksIssue(
    checks: StepCheck[],
    timeoutMs: number,
  ): Promise<string | null> {
    for (const check of checks) {
      if (check.code) {
        try {
          await this.codeCheck(check.code);
        } catch (error) {
          return `${checkName(check)}: ${errorMessage(error)}`;
        }
        continue;
      }
      if (check.anyOf) {
        if (!(await this.waitForAny(check.anyOf, timeoutMs))) {
          return `${checkName(check)}: none visible after ${timeoutMs}ms`;
        }
        continue;
      }
      if (check.gone) {
        const start = Date.now();
        while (
          await this.device.isVisibleNow(check.locator, check.textPattern)
        ) {
          if (Date.now() - start > GONE_TIMEOUT_MS) {
            return `${checkName(check)}: still visible after ${GONE_TIMEOUT_MS}ms`;
          }
          await sleep(300);
        }
        continue;
      }
      try {
        await this.device.waitFor(
          check.locator,
          timeoutMs,
          check.textPattern,
          true,
        );
      } catch (error) {
        return `${checkName(check)}: ${errorMessage(error)}`;
      }
    }
    return null;
  }

  private async checkProgress(
    step: ScenarioStep,
    before: ScreenNode[] | null,
    done: AgentAction[],
    requireProof: boolean,
    cachedProof?: Extract<AgentAction, { type: 'expect' }>,
  ): Promise<Extract<AgentAction, { type: 'expect' }> | undefined> {
    if (!before) return undefined;
    const first = await this.snapshot(step, 'after');
    if (!first || !requireProof) return undefined;
    let after: ScreenNode[] = first;
    const last = done[done.length - 1];
    // Typed text is read back from the field and a closed keyboard is
    // checked in verify(), right after the action.
    if (last?.type === 'type' || last?.type === 'dismissKeyboard') {
      return undefined;
    }
    after = await this.settle(step, after);
    if (screenSignature(before) === screenSignature(after)) {
      throw new ProgressError(
        `nothing on the screen changed after ${summarize(done)}`,
      );
    }
    const problem = async (
      proof: Extract<AgentAction, { type: 'expect' }>,
    ): Promise<string | null> => {
      const name = `${proof.locator.strategy}=${proof.locator.value}${proof.textPattern ? ` /${proof.textPattern}/` : ''}`;
      if (proof.locator.strategy === 'nativeXPath') {
        return `${name}: use testID, text or label so code can check it`;
      }
      const generic = genericLocatorReason(proof.locator, step.text);
      // A control that was not on screen before and appeared (Confirm after
      // Review) does prove the step; containers never do.
      const newControl =
        generic !== null &&
        / is a control,/.test(generic) &&
        !visibleIn(before, proof.locator, proof.textPattern);
      if (generic && !newControl) return generic;
      if (visibleIn(before, proof.locator, proof.textPattern)) {
        return `${name} was already on screen before the step, so it does not prove the step happened`;
      }
      if (visibleIn(after, proof.locator, proof.textPattern)) return null;
      try {
        await this.device.waitFor(
          proof.locator,
          PROOF_TIMEOUT_MS,
          proof.textPattern,
          true,
        );
        return null;
      } catch (error) {
        return `${name} is not on screen: ${errorMessage(error)}`;
      }
    };
    // A final "expect" the model already checked is the first candidate.
    if (!cachedProof && last?.type === 'expect') {
      const own = {
        type: 'expect' as const,
        locator: last.locator,
        ...(last.textPattern ? { textPattern: last.textPattern } : {}),
        proof: true,
      };
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
      const notDone = /"done"\s*:\s*false/.test(raw);
      if (notDone) {
        const reason =
          /"reason"\s*:\s*"([^"]*)"/.exec(raw)?.[1] ?? 'no reason given';
        // A screen still loading is judged again once it has changed.
        const later = await this.settle(step, after, SETTLE_RETRY_MS);
        if (
          attempt < MAX_PROOF_ATTEMPTS - 1 &&
          screenSignature(later) !== screenSignature(after)
        ) {
          after = later;
          note = `The screen has changed since you said: "${reason}". Check it again.`;
          continue;
        }
        throw new ProgressError(`the step has not taken effect: ${reason}`);
      }
      let proof: Extract<AgentAction, { type: 'expect' }> | undefined;
      try {
        const { action } = parseReply(raw);
        if (action.type === 'expect') {
          proof = {
            type: 'expect',
            locator: action.locator,
            ...(action.textPattern ? { textPattern: action.textPattern } : {}),
            proof: true,
          };
        }
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
    // A submit step never replays its cached taps over a blocking alert.
    if (before && isSubmitStep(step.text))
      this.stopOnBlockingAlert(step, before);
    const done: AgentAction[] = [];
    // Copy, so a learned input method shows up as a change against the cache.
    const stored = this.cache[step.text]
      ? (JSON.parse(JSON.stringify(this.cache[step.text])) as AgentAction[])
      : undefined;
    const isProof = (
      a: AgentAction,
    ): a is Extract<AgentAction, { type: 'expect' }> =>
      a.type === 'expect' && a.proof === true;
    const cachedProof = step.checks ? undefined : stored?.find(isProof);
    const cached = stored?.filter((a) => !isProof(a));
    // Pinned checks already hold before acting (like TabBarComponent.tapActivity
    // finding Activity open): nothing to do. Never for submits.
    const present = step.checks?.filter((c) => !c.gone) ?? [];
    if (
      requireProof &&
      before &&
      present.length > 0 &&
      !isSubmitStep(step.text) &&
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
      else this.record(step, 'fixed', present.map(checkAction));
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
      !isSubmitStep(step.text) &&
      cachedProof.locator.strategy !== 'nativeXPath' &&
      !genericLocatorReason(cachedProof.locator, step.text) &&
      visibleIn(before, cachedProof.locator, cachedProof.textPattern)
    ) {
      this.log(
        `Step ${step.number}: already satisfied (${summarize([cachedProof])} is on screen); nothing to do`,
      );
      this.record(step, 'cache', stored);
      return;
    }
    if (cached?.length) {
      try {
        for (const [index, cachedAction] of cached.entries()) {
          const run = async (a: AgentAction) => {
            await this.guard(step, a);
            return index === cached.length - 1
              ? performFinal(a)
              : this.performChecked(a);
          };
          let action = cachedAction;
          try {
            await run(action);
          } catch (error) {
            if (action.type !== 'type' || !action.method) throw error;
            if (
              action.method.input === 'keypad' &&
              (action.method.pace ?? 'burst') === 'burst'
            ) {
              // Burst taps did not register: same keys, clicked one by one
              // with checks, and remember it (no model call).
              this.log(
                `Step ${step.number}: burst typing failed (${errorMessage(error)}); retrying with element clicks`,
              );
              action = {
                ...action,
                method: { ...action.method, pace: 'quick' },
              };
              try {
                await run(action);
                done.push(action);
                continue;
              } catch (quickError) {
                this.log(
                  `Step ${step.number}: element clicks failed too (${errorMessage(quickError)})`,
                );
              }
            }
            // The learned keyboard no longer works: rediscover it in code
            // (no model call) and keep the new method.
            this.log(
              `Step ${step.number}: learned input failed (${errorMessage(error)}); rediscovering the keyboard`,
            );
            const { method: _stale, ...fresh } = action;
            action = fresh;
            await run(action);
          }
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
    const correct = (message: string) => {
      corrections += 1;
      if (corrections > MAX_CORRECTIONS_PER_STEP) {
        throw new Error(`Step ${step.number} not completed: ${message}`);
      }
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
        !isSubmitStep(step.text)
      ) {
        const issue = await this.satisfiedIssue(step, before, action);
        if (!issue && action.type === 'expect') {
          const proof: AgentAction = {
            type: 'expect',
            locator: action.locator,
            ...(action.textPattern ? { textPattern: action.textPattern } : {}),
            proof: true,
          };
          this.log(
            `Step ${step.number}: already satisfied (${summarize([proof])} is on screen); nothing to do`,
          );
          this.record(step, 'agent', [proof]);
          return;
        }
        correct(issue ?? 'not satisfied');
        this.log(
          `Step ${step.number}: correction ${corrections}: "satisfied" rejected: ${issue}`,
        );
        note = `You said the step is already satisfied, but code found: ${issue}. Look at the current screen and do the step.`;
        continue;
      }
      try {
        await this.guard(step, action);
        const perform = (a: AgentAction) =>
          final ? performFinal(a) : this.performChecked(a);
        try {
          await perform(action);
        } catch (error) {
          // A discovered keypad whose burst taps did not register: same
          // keys, clicked one by one with checks (no model call).
          if (action.type !== 'type' || action.method?.pace !== 'burst')
            throw error;
          this.log(
            `Step ${step.number}: burst typing failed (${errorMessage(error)}); retrying with element clicks`,
          );
          action.method = { ...action.method, pace: 'quick' };
          await perform(action);
        }
      } catch (error) {
        if (error instanceof BlockingAlertError) throw error;
        correct(errorMessage(error));
        this.log(
          `Step ${step.number}: correction ${corrections}: ${summarize([action])} failed: ${errorMessage(error)}`,
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
        correct(errorMessage(error));
        this.log(
          `Step ${step.number}: correction ${corrections}: marked done but not verified: ${errorMessage(error)}`,
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
    if (action.locator.strategy === 'nativeXPath') {
      return 'use testID, text or label so code can check it';
    }
    const generic = genericLocatorReason(action.locator, step.text);
    if (generic) return generic;
    if (before && visibleIn(before, action.locator, action.textPattern))
      return null;
    try {
      await this.device.waitFor(
        action.locator,
        PROOF_TIMEOUT_MS,
        action.textPattern,
        true,
      );
      return null;
    } catch (error) {
      return `${action.locator.strategy}=${action.locator.value} is not on screen: ${errorMessage(error)}`;
    }
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
          `after entering "${action.text}", ${action.locator.strategy}=${action.locator.value} shows "${shown}"`,
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
      this.record(step, 'fixed', step.checks.map(checkAction));
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
   * The model picks the trigger action and the end element first. Then code
   * taps, and TimerHelper.measure covers only the polling for that element,
   * the same window eth-swap-flow.spec.ts measures.
   */
  private async runTimedPair(
    trigger: ScenarioStep,
    until: ScenarioStep,
    timer: ScenarioTimer,
    between: ScenarioStep[] = [],
  ): Promise<void> {
    const state: { end: EndTarget | null; failed: Locator | null } = {
      end: null,
      failed: null,
    };
    // A pinned end check follows the original spec exactly: it is measured
    // even when it already holds, with no "must not be visible" precondition.
    const pinned = Boolean(until.checks);
    let endAlreadyVisible = false;

    await this.runDo(
      trigger,
      async (action) => {
        state.end = await this.resolveEndElement(trigger, until);
        state.failed = null;
        // Informational, read before the trigger so the window is not delayed.
        endAlreadyVisible = Boolean(
          pinned &&
            state.end &&
            !state.end.code &&
            (await this.device.isVisibleNow(
              state.end.locator,
              state.end.textPattern,
            )),
        );
        if (endAlreadyVisible) {
          this.log(
            `Timer "${timer.name}": the pinned end check already holds before step ${trigger.number}; measured as the original spec does`,
          );
        }
        let entry: AgentRunResult['timers'][number] | undefined;
        let helper: TimerHelper | undefined;
        const alreadyShown = (when: string) => ({
          name: timer.name,
          valid: false,
          durationMs: null,
          reason: `end element is already on screen ${when}, so its appearance cannot be timed`,
        });
        const measure = async () => {
          if (!state.end) return;
          helper = new TimerHelper(
            timer.name,
            timer.threshold,
            this.options.platform,
          );
          const { locator, textPattern, anyOf, code } = state.end;
          this.windowOpen = true;
          try {
            await helper.measure(async () => {
              if (code) return this.codeCheck(code);
              if (!anyOf) {
                return this.device.waitFor(
                  locator,
                  TIMED_WINDOW_TIMEOUT_MS,
                  textPattern,
                );
              }
              if (!(await this.waitForAny(anyOf, TIMED_WINDOW_TIMEOUT_MS))) {
                throw new Error(
                  `none of ${anyOf.map((l) => l.value).join(', ')} appeared`,
                );
              }
            });
            entry = {
              name: timer.name,
              valid: true,
              durationMs: helper.getDuration(),
              ...(endAlreadyVisible ? { endAlreadyVisible: true } : {}),
            };
          } catch (error) {
            state.failed = locator;
            helper = undefined;
            entry = {
              name: timer.name,
              valid: false,
              durationMs: null,
              reason: `end element ${locator.strategy}=${locator.value} did not appear: ${String(error)}`,
            };
          } finally {
            this.windowOpen = false;
            // measure() skips this when the action throws; later timers would inherit it.
            if (isOverheadTrackingActive()) stopOverheadTracking();
          }
        };
        if (!state.end) {
          await this.device.perform(action);
          entry = alreadyShown('before the action');
        } else if (action.type === 'type') {
          // Like a person typing: the clock starts right after the last key
          // tap returns, when the full text is in.
          // Precondition: after the field is cleared, the end must not be on
          // screen (for example a stale quote), or its appearance is not timed.
          const end = state.end;
          await this.device.perform(action, {
            beforeKeys: async () => {
              if (pinned) return;
              const start = Date.now();
              while (
                await this.device.isVisibleNow(end.locator, end.textPattern)
              ) {
                if (Date.now() - start > PRECONDITION_MS) {
                  entry = alreadyShown('after clearing the field');
                  return;
                }
                await sleep(300);
              }
            },
            afterLastKey: async () => {
              if (!entry) await measure();
            },
          });
        } else {
          await this.device.perform(action);
          await measure();
        }
        if (!entry) throw new Error('timer window never ran');
        // Check the trigger did what it says only after the window, so the
        // check is never timed. If it fails, the measurement is discarded and
        // the error goes back to the model as a correction.
        await this.verify(action);
        if (helper && entry.valid) this.options.tracker.addTimer(helper);
        this.result.timers.push(entry);
      },
      false,
    );

    // Steps inside the timer's range run after the window and are not timed.
    for (const step of between) {
      await this.runDo(step, (action) => this.performChecked(action));
    }

    if (state.end && !state.failed && until.checks) {
      this.record(until, 'fixed', until.checks.map(checkAction));
    } else if (state.end && !state.failed) {
      const cached = this.cache[until.text]?.[0];
      const end: AgentAction = { type: 'expect', ...state.end };
      const fromCache = JSON.stringify(cached) === JSON.stringify(end);
      this.record(until, fromCache ? 'cache' : 'agent', [end]);
    } else {
      await this.runExpect(until, state.failed ?? undefined);
    }
  }

  private async codeCheck(name: string): Promise<void> {
    if (!this.options.runCodeCheck)
      throw new Error(`no code path for check "${name}"`);
    await this.options.runCodeCheck(name);
  }

  private readonly conditions = new Map<string, boolean>();

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
    const [check] = until.checks as StepCheck[];
    await this.runApp(step);
    const helper = new TimerHelper(
      timer.name,
      timer.threshold,
      this.options.platform,
    );
    this.windowOpen = true;
    let entry: AgentRunResult['timers'][number];
    try {
      const measuredByCode =
        check.code && this.options.runTimedCodeCheck
          ? await this.options.runTimedCodeCheck(check.code, helper)
          : false;
      if (!measuredByCode) {
        await helper.measure(async () => {
          if (check.code) return this.codeCheck(check.code);
          if (!check.anyOf) {
            return this.device.waitFor(
              check.locator,
              TIMED_WINDOW_TIMEOUT_MS,
              check.textPattern,
            );
          }
          if (!(await this.waitForAny(check.anyOf, TIMED_WINDOW_TIMEOUT_MS))) {
            throw new Error(
              `none of ${check.anyOf.map((l) => l.value).join(', ')} appeared`,
            );
          }
        });
      }
      entry = {
        name: timer.name,
        valid: true,
        durationMs: helper.getDuration(),
      };
    } catch (error) {
      entry = {
        name: timer.name,
        valid: false,
        durationMs: null,
        reason: `end element ${checkName(check)} did not appear: ${String(error)}`,
      };
    } finally {
      this.windowOpen = false;
      if (isOverheadTrackingActive()) stopOverheadTracking();
    }
    this.result.timers.push(entry);
    if (!entry.valid) throw new Error(`Step ${until.number}: ${entry.reason}`);
    this.options.tracker.addTimer(helper);
    this.record(until, 'fixed', until.checks?.map(checkAction) ?? []);
  }

  /** Cached end element, or the model's prediction; rejected if already visible. */
  private async resolveEndElement(
    trigger: ScenarioStep,
    until: ScenarioStep,
  ): Promise<EndTarget | null> {
    if (until.checks) {
      // The scenario pins the end element: no model, no cache, and (like
      // the original spec) no check that it is absent before the trigger.
      const [check] = until.checks;
      return {
        locator: check.locator,
        ...(check.textPattern ? { textPattern: check.textPattern } : {}),
        ...(check.anyOf ? { anyOf: check.anyOf } : {}),
        ...(check.code ? { code: check.code } : {}),
      };
    }
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
    return action.type === 'expect'
      ? {
          locator: action.locator,
          ...(action.textPattern ? { textPattern: action.textPattern } : {}),
        }
      : null;
  }

  private record(
    step: ScenarioStep,
    source: 'cache' | 'agent' | 'secret' | 'fixed',
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
    const reword = this.rewordProposals.get(step.number);
    if (source === 'agent' && reword) {
      (this.result.rewordings ??= []).push({
        number: step.number,
        text: reword,
      });
    }
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
