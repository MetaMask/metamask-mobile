import BigNumber from 'bignumber.js';

export type TradeAmountType = 'exact' | 'fiat' | 'percent' | 'unspecified';

export interface TradeTokenCandidate {
  assetId: string;
  symbol: string;
}

export interface TradeTokenResolution<T extends TradeTokenCandidate> {
  asset: T | undefined;
  isAmbiguous: boolean;
}

export interface TradeAmountIntent {
  amountType: TradeAmountType;
  amountValue: string;
  sourceAmount?: string;
}

export interface TradeSourceToken {
  balance?: string;
  currencyExchangeRate?: number | string | null;
  decimals: number;
}

export type TradeAmountResolution =
  | {
      amount: string;
      status: 'resolved';
    }
  | {
      amount: undefined;
      status: 'invalid' | 'missing-data' | 'unspecified';
    };

const NETWORK_ASSET_PREFIXES: Record<string, string> = {
  arbitrum: 'eip155:42161/',
  base: 'eip155:8453/',
  bnb: 'eip155:56/',
  bsc: 'eip155:56/',
  ethereum: 'eip155:1/',
  mainnet: 'eip155:1/',
  optimism: 'eip155:10/',
  polygon: 'eip155:137/',
  robinhood: 'eip155:4663/',
  'robinhood chain': 'eip155:4663/',
  solana: 'solana:mainnet/',
};

export const getTradeNetworkChainId = (network: string): string | undefined => {
  const prefix = NETWORK_ASSET_PREFIXES[network.trim().toLowerCase()];
  return prefix?.replace(/\/$/, '');
};

const getActiveNetworkPrefix = (activeChainId: string): string | undefined => {
  const normalizedChainId = activeChainId.trim().toLowerCase();
  if (!normalizedChainId) return undefined;

  if (normalizedChainId.startsWith('eip155:')) {
    return `${normalizedChainId.replace(/\/$/, '')}/`;
  }

  if (normalizedChainId.startsWith('solana:')) {
    return normalizedChainId;
  }

  const numericChainId = normalizedChainId.startsWith('0x')
    ? Number.parseInt(normalizedChainId.slice(2), 16)
    : Number.parseInt(normalizedChainId, 10);

  return Number.isSafeInteger(numericChainId) && numericChainId > 0
    ? `eip155:${numericChainId}/`
    : undefined;
};

/**
 * Resolves a ticker only when it identifies exactly one asset on the requested
 * network. Ambiguous symbols intentionally remain unresolved.
 */
export const resolveTradeToken = <T extends TradeTokenCandidate>(
  results: T[],
  symbol: string,
  network: string,
  activeChainId: string,
  preferredAssetId = '',
): TradeTokenResolution<T> => {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) {
    return { asset: undefined, isAmbiguous: false };
  }

  const exactMatches = results.filter(
    (token) => token.symbol.trim().toUpperCase() === normalizedSymbol,
  );
  const hasExplicitNetwork = network.trim().length > 0;
  const explicitChainId = getTradeNetworkChainId(network);
  const networkPrefix = hasExplicitNetwork
    ? explicitChainId
      ? `${explicitChainId}/`
      : undefined
    : getActiveNetworkPrefix(activeChainId);

  // Never silently substitute the active network for an unknown network name.
  if (hasExplicitNetwork && !networkPrefix) {
    return { asset: undefined, isAmbiguous: false };
  }

  const networkMatches = networkPrefix
    ? exactMatches.filter((token) => token.assetId.startsWith(networkPrefix))
    : exactMatches;
  const preferredAsset = preferredAssetId
    ? networkMatches.find(
        ({ assetId }) =>
          assetId.toLowerCase() === preferredAssetId.toLowerCase(),
      )
    : undefined;

  return {
    asset:
      preferredAsset ??
      (networkMatches.length === 1 ? networkMatches[0] : undefined),
    isAmbiguous: !preferredAsset && networkMatches.length > 1,
  };
};

const resolvedAmount = (
  value: BigNumber,
  decimals: number,
): TradeAmountResolution => {
  if (!Number.isSafeInteger(decimals) || decimals < 0) {
    return { amount: undefined, status: 'invalid' };
  }

  const amount = value.decimalPlaces(decimals, BigNumber.ROUND_DOWN).toFixed();

  return new BigNumber(amount).gt(0)
    ? { amount, status: 'resolved' }
    : { amount: undefined, status: 'invalid' };
};

/**
 * Converts a conversational amount into source-token units. Percentage and
 * fiat conversions always round down to the token's supported decimals.
 */
export const resolveTradeSourceAmount = (
  intent: TradeAmountIntent,
  sourceToken: TradeSourceToken | undefined,
): TradeAmountResolution => {
  if (intent.amountType === 'unspecified') {
    return { amount: undefined, status: 'unspecified' };
  }

  const rawAmount =
    intent.amountType === 'exact'
      ? intent.sourceAmount || intent.amountValue
      : intent.amountValue;
  const requestedValue = new BigNumber(rawAmount);

  if (!requestedValue.isFinite() || requestedValue.lte(0)) {
    return { amount: undefined, status: 'invalid' };
  }

  if (intent.amountType === 'exact') {
    if (!sourceToken) {
      return { amount: undefined, status: 'missing-data' };
    }
    return resolvedAmount(requestedValue, sourceToken.decimals);
  }

  if (!sourceToken) {
    return { amount: undefined, status: 'missing-data' };
  }

  if (intent.amountType === 'percent') {
    const percentage = requestedValue;
    const balance = new BigNumber(sourceToken.balance ?? '');
    if (percentage.gt(100) || !balance.isFinite() || balance.lte(0)) {
      return { amount: undefined, status: 'invalid' };
    }

    return resolvedAmount(
      balance.multipliedBy(percentage).dividedBy(100),
      sourceToken.decimals,
    );
  }

  const exchangeRate = new BigNumber(sourceToken.currencyExchangeRate ?? '');
  if (!exchangeRate.isFinite() || exchangeRate.lte(0)) {
    return { amount: undefined, status: 'missing-data' };
  }

  return resolvedAmount(
    requestedValue.dividedBy(exchangeRate),
    sourceToken.decimals,
  );
};
