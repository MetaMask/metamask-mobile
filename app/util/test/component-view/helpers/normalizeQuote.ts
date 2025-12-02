// Types and helper to normalize Bridge quote shape for component-view tests
// Keep this file test-only and framework-agnostic.

export interface AmountObject {
  amount: string;
  value: string;
  usd: unknown | null;
  valueInCurrency: unknown | null;
}

export interface GasFeeObject {
  effective: AmountObject;
  max: AmountObject;
  total: AmountObject;
}

export interface FeeAmounts {
  amount: AmountObject;
}

export interface FeeData {
  metabridge: FeeAmounts & { quoteBpsFee?: number | null };
  relayer: FeeAmounts;
  partner: FeeAmounts;
}

export interface QuoteInner {
  feeData?: FeeData;
  srcChainId?: string | number;
  destChainId?: string | number;
  gasIncluded?: boolean;
}

export interface NormalizedQuote {
  totalNetworkFee: AmountObject;
  totalMaxNetworkFee: AmountObject;
  gasFee: GasFeeObject;
  quote?: QuoteInner;
  trade?: string;
}

const ensureAmountObj = (val: unknown): AmountObject => {
  if (typeof val === 'string' || val == null) {
    const v = (val ?? '0') as string;
    return { value: v, usd: null, amount: v, valueInCurrency: null };
  }
  const obj = val as Record<string, unknown>;
  return {
    value: typeof obj.value === 'string' ? (obj.value as string) : '0',
    usd: obj.usd ?? null,
    amount: typeof obj.amount === 'string' ? (obj.amount as string) : '0',
    valueInCurrency: obj.valueInCurrency ?? null,
  };
};

export function normalizeQuote(input: unknown): NormalizedQuote {
  const out = JSON.parse(JSON.stringify(input ?? {})) as Record<
    string,
    unknown
  >;

  const tnf =
    (out as { totalNetworkFee?: Record<string, unknown> }).totalNetworkFee ??
    {};
  const tmnf =
    (out as { totalMaxNetworkFee?: Record<string, unknown> })
      .totalMaxNetworkFee ?? {};
  const gasFeeRaw =
    (
      out as {
        gasFee?: { effective?: unknown; max?: unknown; total?: unknown };
      }
    ).gasFee ?? {};
  const quoteRaw = (out as { quote?: Record<string, unknown> }).quote ?? {};

  const totalNetworkFee: AmountObject = {
    amount: typeof tnf.amount === 'string' ? (tnf.amount as string) : '0',
    value: typeof tnf.value === 'string' ? (tnf.value as string) : '0',
    usd: tnf.usd ?? null,
    valueInCurrency:
      tnf.valueInCurrency ??
      (typeof tnf.value === 'string' ? (tnf.value as string) : null),
  };

  const totalMaxNetworkFee: AmountObject = {
    amount: typeof tmnf.amount === 'string' ? (tmnf.amount as string) : '0',
    value: typeof tmnf.value === 'string' ? (tmnf.value as string) : '0',
    usd: tmnf.usd ?? null,
    valueInCurrency:
      tmnf.valueInCurrency ??
      (typeof tmnf.value === 'string' ? (tmnf.value as string) : null),
  };

  const gasFee: GasFeeObject = {
    effective: ensureAmountObj(gasFeeRaw.effective),
    max: ensureAmountObj(gasFeeRaw.max),
    total: ensureAmountObj(gasFeeRaw.total),
  };

  const feeDataRaw = (quoteRaw.feeData ?? {}) as Record<string, unknown> & {
    metabridge?: { amount?: unknown; quoteBpsFee?: unknown } & Record<
      string,
      unknown
    >;
    relayer?: { amount?: unknown } & Record<string, unknown>;
    partner?: { amount?: unknown } & Record<string, unknown>;
  };

  const normalizedFeeData: Record<string, unknown> & {
    metabridge?: FeeAmounts & { quoteBpsFee?: number | null } & Record<
        string,
        unknown
      >;
    relayer?: FeeAmounts & Record<string, unknown>;
    partner?: FeeAmounts & Record<string, unknown>;
  } = {
    ...feeDataRaw,
    metabridge: feeDataRaw.metabridge
      ? {
          ...feeDataRaw.metabridge,
          amount: ensureAmountObj(feeDataRaw.metabridge.amount),
          quoteBpsFee:
            typeof feeDataRaw.metabridge.quoteBpsFee === 'number'
              ? (feeDataRaw.metabridge.quoteBpsFee as number)
              : (feeDataRaw.metabridge.quoteBpsFee as
                  | number
                  | null
                  | undefined),
        }
      : undefined,
    relayer: feeDataRaw.relayer
      ? {
          ...feeDataRaw.relayer,
          amount: ensureAmountObj(feeDataRaw.relayer.amount),
        }
      : undefined,
    partner: feeDataRaw.partner
      ? {
          ...feeDataRaw.partner,
          amount: ensureAmountObj(feeDataRaw.partner.amount),
        }
      : undefined,
  };

  const quote: QuoteInner = {
    ...(quoteRaw as QuoteInner),
    feeData: normalizedFeeData as unknown as FeeData,
    srcChainId:
      typeof quoteRaw.srcChainId === 'string' ||
      typeof quoteRaw.srcChainId === 'number'
        ? (quoteRaw.srcChainId as string | number)
        : undefined,
    destChainId:
      typeof quoteRaw.destChainId === 'string' ||
      typeof quoteRaw.destChainId === 'number'
        ? (quoteRaw.destChainId as string | number)
        : undefined,
    gasIncluded:
      typeof quoteRaw.gasIncluded === 'boolean'
        ? (quoteRaw.gasIncluded as boolean)
        : undefined,
  };

  // Mutate the cloned object to preserve all original properties while normalizing expected fields
  (out as { totalNetworkFee: AmountObject }).totalNetworkFee = totalNetworkFee;
  (out as { totalMaxNetworkFee: AmountObject }).totalMaxNetworkFee =
    totalMaxNetworkFee;
  (out as { gasFee: GasFeeObject }).gasFee = gasFee;
  (out as { quote: QuoteInner }).quote = quote;
  (out as { trade?: string }).trade =
    typeof (out as { trade?: unknown }).trade === 'string'
      ? (out as { trade?: string }).trade
      : undefined;

  return out as unknown as NormalizedQuote;
}
