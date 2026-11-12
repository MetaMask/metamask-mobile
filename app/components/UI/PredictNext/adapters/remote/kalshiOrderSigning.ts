import type {
  PredictOrderPreview,
  PredictOrderPreviewParams,
} from '../../types';
import type {
  TemplateInputs,
  TemplateValues,
} from '../../auth/signing/profileTemplates';

/** Kalshi rendering values only. A user approval is supplied separately. */
export interface KalshiOrderSigningInput {
  readonly inputs: TemplateInputs;
  readonly values: TemplateValues;
}

const amountToCents = (amount: string): number | undefined => {
  const match = /^(\d+)(?:\.(\d{1,2})0*)?$/u.exec(amount);
  if (!match) {
    return undefined;
  }
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : undefined;
};

/** Fixed-point conversion, including the canonical 0 and 1 endpoints.
 * The Engine's verified profile separately decides which prices it allows. */
const yesLegPrice = (
  side: 'yes' | 'no',
  limitPrice: string,
): string | undefined => {
  const match = /^(0)(?:\.(\d{1,4}))?$|^(1)(?:\.0{1,4})?$/u.exec(limitPrice);
  if (!match) {
    return undefined;
  }
  const outcomePrice =
    match[3] === '1' ? 10_000 : Number((match[2] ?? '').padEnd(4, '0'));
  const price = side === 'yes' ? outcomePrice : 10_000 - outcomePrice;
  return `${Math.floor(price / 10_000)}.${String(price % 10_000).padStart(4, '0')}`;
};

/** Converts only the quote and input snapshot held by Kalshi's adapter.
 * Review never grants confirmation; the actual approval event does that. */
export const kalshiOrderSigningInput = (
  params: Readonly<PredictOrderPreviewParams>,
  preview: Readonly<PredictOrderPreview>,
): KalshiOrderSigningInput | undefined => {
  if (
    params.marketId !== preview.marketId ||
    params.action !== preview.action ||
    params.side !== preview.side
  ) {
    return undefined;
  }
  const contracts =
    preview.action === 'sell'
      ? preview.requestedContracts
      : preview.estimatedContracts;
  if (!Number.isSafeInteger(contracts) || contracts <= 0) {
    return undefined;
  }
  const price = yesLegPrice(preview.side, preview.limitPrice);
  if (price === undefined) {
    return undefined;
  }
  const inputs = {
    marketId: params.marketId,
    idempotencyKey: params.idempotencyKey,
    action: params.action,
    outcome: params.side,
  };
  const values = { count: contracts.toFixed(2), price };
  if (params.action === 'buy' && preview.action === 'buy') {
    const amountCents = amountToCents(params.amount);
    if (
      amountCents === undefined ||
      amountCents !== amountToCents(preview.requestedAmount)
    ) {
      return undefined;
    }
    return { inputs: { ...inputs, amountCents }, values };
  }
  if (
    params.action !== 'sell' ||
    !/^[1-9]\d*$/u.test(params.contracts) ||
    Number(params.contracts) !== contracts
  ) {
    return undefined;
  }
  return { inputs: { ...inputs, contracts: params.contracts }, values };
};
