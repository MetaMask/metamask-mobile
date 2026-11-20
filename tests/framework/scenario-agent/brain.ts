import { ClaudeProvider } from '../ai-visual/providers/claude.ts';
import type { AgentAction, Brain, Locator } from './types.ts';

/** Model for scenario runs: cheap, since replays from the cache make no calls. */
export const SCENARIO_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MODEL_CALL_TIMEOUT_MS = 60_000;

/** `||`, not `??`: CI may set ANTHROPIC_MODEL / ANTHROPIC_BASE_URL to "". */
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

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Claude through ClaudeProvider. The key is read from the live environment
 * (`env.X`, so no build step inlines it); empty or unset makes the provider
 * throw "ANTHROPIC_API_KEY is required" on the first call: a clear step FAIL.
 */
export function claudeBrain(env: NodeJS.ProcessEnv = process.env): Brain {
  let provider: ClaudeProvider | undefined;
  return {
    async ask(prompt, screenshot) {
      provider ??= new ClaudeProvider({
        maxTokens: 512,
        apiKey: env.ANTHROPIC_API_KEY || '',
        ...scenarioModelConfig(env),
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

export type AskMode = 'do' | 'expect' | 'predict' | 'proof';

const TASKS: Record<AskMode, (nextStep?: string) => string> = {
  do: () =>
    'Return the next single action. Set "final": true on the action that completes the step.',
  expect: () =>
    'Return one "expect" action for an element that proves the expectation is met now. ' +
    'Pick the specific thing the expectation names (a row, a value, a message), never a generic container, scroll view, button or tab.',
  predict: () =>
    'This expectation will be checked right after the previous action, which has NOT happened yet. ' +
    'Return one "expect" action for an element that will appear only once it is met. ' +
    'It must NOT already be on the current screen, because its appearance is what gets timed.',
  proof: (nextStep) =>
    'The actions above were just performed for this step. Check the current screen. ' +
    'If the step\'s intended effect is visible, return {"action":{"type":"expect","locator":L,"textPattern":"..."(optional)},"final":true} ' +
    'for a specific element that proves it and that was NOT on the screen before the step started ' +
    '(not a generic container, scroll view, button or tab; use testID, text or label, not nativeXPath; ' +
    'prefer elements whose text does not depend on balances or prices). ' +
    'Apps often move on by themselves once a step is done: after Confirm or Submit the app may open the Activity list or a status screen, after Continue the next form appears. ' +
    'Arriving at such a natural next screen IS the effect of the step: prove it with a specific element of that new screen. ' +
    (nextStep
      ? `The next scenario step is "${nextStep}", so the screen it needs counts too. `
      : '') +
    'If the step did not take effect (wrong screen, nothing changed, an error), reply {"done":false,"reason":"..."}.',
};

const SATISFIED_OFFER =
  ' If, before you do anything, the screen ALREADY shows what this step is meant to reach (for example the step opens a screen or tab that is already open), reply {"satisfied":true,"action":{"type":"expect","locator":L}} with a specific element of that screen instead of acting. Never use this for a step whose action has simply not happened yet.';

export function buildPrompt(input: {
  platform: string;
  step: { number: number; text: string };
  mode: AskMode;
  /** "do" only: the model may reply that the step is already satisfied. */
  offerSatisfied: boolean;
  nextStep?: string;
  note: string;
  history: AgentAction[];
  hints: string[];
  pageSource: string;
}): string {
  return [
    `You drive the MetaMask mobile app (${input.platform}) through Appium.`,
    `Step ${input.step.number}: "${input.step.text}"`,
    TASKS[input.mode](input.nextStep) +
      (input.mode === 'do' && input.offerSatisfied ? SATISFIED_OFFER : ''),
    input.note,
    `Actions already done for this step: ${JSON.stringify(input.history)}`,
    `testIDs used by the existing Page Objects (prefer them when they fit): ${input.hints.join(', ')}`,
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
    `Page source:\n${input.pageSource}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function isLocator(value: unknown): value is Locator {
  const v = value as Locator | undefined;
  return (
    typeof v?.value === 'string' &&
    ['testID', 'label', 'text', 'nativeXPath'].includes(v.strategy)
  );
}

/** `{"blocked": "..."}`: the model saw an alert that stops the step. */
export const blockedReason = (raw: string): string | undefined =>
  /"blocked"\s*:\s*"([^"]*)"/.exec(raw)?.[1];

/** `{"done": false, "reason": "..."}` on a proof call, or undefined. */
export const notDoneReason = (raw: string): string | undefined =>
  /"done"\s*:\s*false/.test(raw)
    ? (/"reason"\s*:\s*"([^"]*)"/.exec(raw)?.[1] ?? 'no reason given')
    : undefined;

export function parseReply(raw: string): {
  action: AgentAction;
  final: boolean;
  satisfied: boolean;
} {
  const json = raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1');
  const reply = JSON.parse(json) as {
    action?: AgentAction;
    type?: string;
    final?: boolean;
    satisfied?: boolean;
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
  return {
    action,
    final: reply.final === true,
    satisfied: reply.satisfied === true,
  };
}
