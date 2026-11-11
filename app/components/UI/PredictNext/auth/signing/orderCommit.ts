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

/** How far below the quoted average price a sell may sign its limit, in
 * ten-thousandths of a dollar: a 10¢ slippage bound. The quote's limit is
 * the worst bid its walk reached; a limit further below the average than
 * this is refused rather than signed. */
const SELL_SLIPPAGE_TEN_THOUSANDTHS = 1_000;

/** The lowest outcome price a sell may sign, four decimal places: the
 * quoted average less the slippage bound, never below the 1¢ floor. */
const sellFloor = (averagePrice: PredictDecimal): string | undefined => {
  const match = /^0(?:\.(\d{1,4}))?$|^1(?:\.0{1,4})?$/u.exec(averagePrice);
  if (!match) {
    return undefined;
  }
  const tenThousandths = averagePrice.startsWith('1')
    ? 10_000
    : Number((match[1] ?? '').padEnd(4, '0') || '0');
  const floor = Math.max(100, tenThousandths - SELL_SLIPPAGE_TEN_THOUSANDTHS);
  return `0.${String(floor).padStart(4, '0')}`;
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
 * A sell also signs a price floor, so a limit the quote's own average does
 * not support is refused by the invariant. Undefined when the quote cannot
 * be signed.
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
  const floor = sellFloor(preview.averagePrice);
  if (!pinned.contracts || !floor) {
    return undefined;
  }
  return {
    inputs: { ...shared, contracts: pinned.contracts, minOutcomePrice: floor },
    values,
    confirmed: true,
  };
};
