import type { ScreenNode } from './screen.ts';

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

/** Why a tap would buy or add funds the step does not ask for, or null. */
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
