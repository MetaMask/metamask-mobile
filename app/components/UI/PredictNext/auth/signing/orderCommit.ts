import type {
  PredictDecimal,
  PredictOrderPreview,
  PredictOutcomeSide,
} from '../../types';
import type { TemplateInputs, TemplateValues } from './profileTemplates';

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

/** The YES-leg price at four decimal places. The worst price the preview
 * quotes is the outcome leg's; a NO order prices its YES complement,
 * `1 − limit`, in exact decimal math (never a binary float). A YES-leg
 * price of exactly `1` is outside the template's range, so the whole part
 * is always `0` on the wire. */
const yesLegPrice = (
  side: PredictOutcomeSide,
  limitPrice: PredictDecimal | undefined,
): string | undefined => {
  if (limitPrice === undefined) {
    return undefined;
  }
  const match = /^0(?:\.(\d{1,4}))?$/u.exec(limitPrice);
  if (!match) {
    return undefined;
  }
  const [, fraction = ''] = limitPrice.split('.');
  const tenThousandths = Number(fraction.padEnd(4, '0') || '0');
  const yesPrice = side === 'yes' ? tenThousandths : 10_000 - tenThousandths;
  return `0.${String(yesPrice).padStart(4, '0')}`;
};

/** The exact create_order values the venue order carries: `count` at two
 * decimal places and the YES-leg `price` at four. Both come from the
 * server-quoted Preview the user approved — never from user input — so the
 * signed body describes precisely what was quoted. A sell signs the
 * contracts it offered; a buy signs the quoted count. Undefined when the
 * preview lacks the figures (a malformed or foreign preview), which the
 * caller treats as an unsignable quote rather than a signing failure. */
export const venueOrderValues = (
  action: 'buy' | 'sell',
  side: PredictOutcomeSide,
  preview: PredictOrderPreview,
): { count: string; price: string } | undefined => {
  const contracts =
    preview.action === 'sell'
      ? preview.requestedContracts
      : preview.estimatedContracts;
  const countText =
    typeof contracts === 'number' &&
    Number.isSafeInteger(contracts) &&
    contracts > 0
      ? contracts.toFixed(2)
      : undefined;
  const priceText = yesLegPrice(side, preview.limitPrice);
  return countText && priceText
    ? { count: countText, price: priceText }
    : undefined;
};

/** What the Commit of one quoted intent signs. */
export interface CommitSigning {
  inputs: TemplateInputs;
  values: TemplateValues;
  confirmed: true;
}

/**
 * The commit signing for a quoted Preview: the inputs pinned when it was
 * quoted (never what is typed now) and the venue values from the quote.
 * The invariant's figures for these, shown on the approval screen, are the
 * user's bound on the price. Undefined when the quote cannot be signed.
 */
export const commitSigningFor = (
  intent: {
    marketId: string;
    action: 'buy' | 'sell';
    side: PredictOutcomeSide;
  },
  pinned: { idempotencyKey: string; amount?: string; contracts?: string },
  preview: PredictOrderPreview,
): CommitSigning | undefined => {
  const values = venueOrderValues(intent.action, intent.side, preview);
  if (!values) {
    return undefined;
  }
  const shared = {
    marketId: intent.marketId,
    idempotencyKey: pinned.idempotencyKey,
    action: intent.action,
    outcome: intent.side,
  };
  if (intent.action === 'buy') {
    const cents = amountToCents(pinned.amount ?? '');
    return cents === undefined
      ? undefined
      : { inputs: { ...shared, amountCents: cents }, values, confirmed: true };
  }
  if (!pinned.contracts) {
    return undefined;
  }
  return {
    inputs: { ...shared, contracts: pinned.contracts },
    values,
    confirmed: true,
  };
};
