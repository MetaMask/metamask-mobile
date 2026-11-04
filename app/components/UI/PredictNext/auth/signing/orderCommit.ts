import { KALSHI_DEMO_SIGNING_PROFILE } from '../venueSigningProfiles';
import {
  renderStep,
  TemplateError,
  type InvariantDisplay,
  type TemplateInputs,
  type TemplateValues,
} from './venueTemplates';

/** Whole cents from a dollar amount the user typed, or undefined. */
export const amountToCents = (amount: string): number | undefined => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/u.exec(amount);
  if (!match?.[1]) {
    return undefined;
  }
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : undefined;
};

/**
 * Renders the order the commit would sign and returns the invariant's
 * display. Throws `TemplateError` when the profile refuses the order, which
 * is what keeps Confirm disabled.
 */
export const readOrderCommitDisplay = (
  inputs: TemplateInputs,
  values: TemplateValues,
  nowMs = Date.now(),
): InvariantDisplay => {
  const rendered = renderStep(
    KALSHI_DEMO_SIGNING_PROFILE,
    'orders.commit',
    'submit',
    { inputs, values, nowMs },
  );
  const order = rendered.find((request) => request.name === 'order_create');
  if (!order?.display) {
    throw new TemplateError('invariant', 'binary-limit-order-v1');
  }
  return order.display;
};
