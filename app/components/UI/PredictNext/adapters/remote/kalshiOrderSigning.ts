import type {
  PredictOrderPreview,
  PredictOrderPreviewParams,
} from '../../types';
import type {
  TemplateInputs,
  TemplateValues,
} from '../../auth/signing/profileTemplates';
import { loadVenueProfile } from '../../auth/venueSigningProfiles';

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

/** The outcome price in ten-thousandths of a dollar, including the canonical
 * 0 and 1 endpoints. */
const outcomePriceUnits = (limitPrice: string): number | undefined => {
  const match = /^(0)(?:\.(\d{1,4}))?$|^(1)(?:\.0{1,4})?$/u.exec(limitPrice);
  if (!match) {
    return undefined;
  }
  return match[3] === '1' ? 10_000 : Number((match[2] ?? '').padEnd(4, '0'));
};

/** Fixed-point yes-leg price. The Engine's verified profile separately
 * decides which prices it allows. */
const yesLegPrice = (side: 'yes' | 'no', outcomePrice: number): string => {
  const price = side === 'yes' ? outcomePrice : 10_000 - outcomePrice;
  return `${Math.floor(price / 10_000)}.${String(price % 10_000).padStart(4, '0')}`;
};

/** The fee ceiling the verified `order.place` profile signs under, in cents
 * per contract. Undefined when the profile is unavailable or does not carry a
 * usable ceiling, so no buy is sized against a guess. */
export const loadFeeCeilingCentsPerContract = async (): Promise<
  number | undefined
> => {
  let profile: Awaited<ReturnType<typeof loadVenueProfile>>;
  try {
    profile = await loadVenueProfile();
  } catch {
    return undefined;
  }
  const payload = profile?.payloads.create_order;
  if (payload?.kind !== 'http-rfc9421') {
    return undefined;
  }
  const ceiling = payload.invariants?.find(
    ({ implementation }) => implementation === 'binary-limit-order-v1',
  )?.params?.feeCeilingCentsPerContract;
  return typeof ceiling === 'number' &&
    Number.isSafeInteger(ceiling) &&
    ceiling >= 0
    ? ceiling
    : undefined;
};

/** The whole contracts a buy may sign. The profile requires the worst case,
 * every contract at the signed limit plus the fee ceiling, to fit the typed
 * spend. The quote sizes `estimatedContracts` from the average price, which
 * is lower than the limit, so the quoted count alone can exceed that bound.
 * Never more than the quote offered. */
const affordableBuyContracts = (
  amountCents: number,
  outcomePrice: number,
  feeCeilingCentsPerContract: number,
  quotedContracts: number,
): number => {
  // One cent is 100 ten-thousandths of a dollar.
  const perContract = outcomePrice + feeCeilingCentsPerContract * 100;
  if (perContract <= 0) {
    return 0;
  }
  return Math.min(
    quotedContracts,
    Math.floor((amountCents * 100) / perContract),
  );
};

/** Converts only the quote and input snapshot held by Kalshi's adapter.
 * Review never grants confirmation; the actual approval event does that.
 * A buy signs the most contracts the typed spend covers at the limit price
 * plus the profile's fee ceiling, so `feeCeilingCentsPerContract` is required
 * to sign one. A sell signs the offered contracts. */
export const kalshiOrderSigningInput = (
  params: Readonly<PredictOrderPreviewParams>,
  preview: Readonly<PredictOrderPreview>,
  feeCeilingCentsPerContract?: number,
): KalshiOrderSigningInput | undefined => {
  if (
    params.marketId !== preview.marketId ||
    params.action !== preview.action ||
    params.side !== preview.side
  ) {
    return undefined;
  }
  const quotedContracts =
    preview.action === 'sell'
      ? preview.requestedContracts
      : preview.estimatedContracts;
  if (!Number.isSafeInteger(quotedContracts) || quotedContracts <= 0) {
    return undefined;
  }
  const outcomePrice = outcomePriceUnits(preview.limitPrice);
  if (outcomePrice === undefined) {
    return undefined;
  }
  const price = yesLegPrice(preview.side, outcomePrice);
  const inputs = {
    marketId: params.marketId,
    idempotencyKey: params.idempotencyKey,
    action: params.action,
    outcome: params.side,
  };
  if (params.action === 'buy' && preview.action === 'buy') {
    const amountCents = amountToCents(params.amount);
    if (
      amountCents === undefined ||
      feeCeilingCentsPerContract === undefined ||
      amountCents !== amountToCents(preview.requestedAmount)
    ) {
      return undefined;
    }
    const contracts = affordableBuyContracts(
      amountCents,
      outcomePrice,
      feeCeilingCentsPerContract,
      quotedContracts,
    );
    if (contracts <= 0) {
      return undefined;
    }
    return {
      inputs: { ...inputs, amountCents },
      values: { count: contracts.toFixed(2), price },
    };
  }
  if (
    params.action !== 'sell' ||
    !/^[1-9]\d*$/u.test(params.contracts) ||
    Number(params.contracts) !== quotedContracts
  ) {
    return undefined;
  }
  return {
    inputs: { ...inputs, contracts: params.contracts },
    values: { count: quotedContracts.toFixed(2), price },
  };
};
