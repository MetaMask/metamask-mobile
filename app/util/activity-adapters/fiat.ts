/*
 * Vendored from metamask-extension shared/lib/activity/fiat.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 *
 * Extension imports replaced with Mobile equivalents:
 *  - shared/lib/unit#formatUnits → shims#formatUnits (inline pure bigint impl)
 *  - shared/constants/transaction#NATIVE_TOKEN_ADDRESS → shims
 */
import {
  isCaipAssetType,
  parseCaipAssetType,
  type CaipAssetType,
  type Hex,
} from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS, formatUnits } from './adapters/shims';
import type { TokenAmount } from './types';

const TOKEN_QUANTITY_MAX_FRACTION_DIGITS = 4;
const MIN_DISPLAYABLE_TOKEN_QUANTITY = 0.00001;
const MIN_DISPLAYABLE_TOKEN_QUANTITY_LABEL = '0.00001';

/** Minimal token descriptor used for market-rate lookups. */
export interface MarketRateLookupToken {
  address: string;
  symbol: string;
  decimals: number;
  chainId: Hex;
}

export function calculateFiatFromMarketRates(
  amount: string | undefined,
  token: MarketRateLookupToken | undefined,
  marketRates: Record<number, Record<string, number>>,
) {
  if (amount === undefined || !token) {
    return undefined;
  }

  const parsed = Number.parseFloat(amount);
  const rate = marketRates[Number.parseInt(token.chainId, 16)]?.[token.address];
  return rate === undefined ? undefined : parsed * rate;
}

export function getDisplaySignPrefix(
  direction: TokenAmount['direction'],
  { showPlus }: { showPlus: boolean },
): string {
  if (direction === 'out') {
    return '-';
  }

  if (direction === 'in' && showPlus) {
    return '+';
  }

  return '';
}

// Converts TokenAmount to unsigned human-readable numeric string (e.g. "1", "1.5")
export function getHumanReadableTokenAmount(
  token: TokenAmount,
): string | undefined {
  if (!token.amount) {
    return undefined;
  }

  let value: string;
  try {
    value = formatUnits(BigInt(token.amount), token.decimals ?? 0);
  } catch {
    value = token.amount;
  }

  return value.startsWith('-') ? value.slice(1) : value;
}

export function formatTokenQuantity(amount: string): string {
  const value = Number(amount);
  const absoluteValue = Math.abs(value);

  if (!Number.isFinite(value)) return amount;
  if (value === 0) return '0';

  if (absoluteValue < MIN_DISPLAYABLE_TOKEN_QUANTITY) {
    return `<${MIN_DISPLAYABLE_TOKEN_QUANTITY_LABEL}`;
  }

  if (absoluteValue < 1) {
    return new Intl.NumberFormat(undefined, {
      minimumSignificantDigits: 1,
      maximumSignificantDigits: 4,
    }).format(value);
  }

  if (absoluteValue < 1000000) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: TOKEN_QUANTITY_MAX_FRACTION_DIGITS,
    }).format(value);
  }

  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// Applies display + or - sign to a formatted display value
export function applyDisplaySign(
  formattedDisplay: string,
  signPrefix: string,
): string {
  if (
    signPrefix === '+' &&
    !formattedDisplay.startsWith('+') &&
    !formattedDisplay.startsWith('-')
  ) {
    return `+${formattedDisplay}`;
  }

  if (
    signPrefix === '-' &&
    !formattedDisplay.startsWith('-') &&
    !formattedDisplay.startsWith('+')
  ) {
    return `-${formattedDisplay}`;
  }

  return formattedDisplay;
}

export function getTokenAddressForMarketRates(
  assetId: CaipAssetType | undefined,
): string | undefined {
  if (!assetId) {
    return undefined;
  }

  if (assetId.includes('/slip44:') || assetId.includes('/native:')) {
    return NATIVE_TOKEN_ADDRESS;
  }

  try {
    const { assetNamespace, assetReference } = parseCaipAssetType(assetId);

    if (assetNamespace === 'erc20' && typeof assetReference === 'string') {
      return assetReference.toLowerCase();
    }

    if (assetNamespace === 'slip44' || assetNamespace === 'native') {
      return NATIVE_TOKEN_ADDRESS;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function toMarketRateLookupToken(
  token: TokenAmount,
  hexChainId: Hex,
): MarketRateLookupToken | undefined {
  const assetId = isCaipAssetType(token.assetId) ? token.assetId : undefined;
  const address = getTokenAddressForMarketRates(assetId);

  if (!address) {
    return undefined;
  }

  return {
    address,
    symbol: token.symbol ?? '',
    decimals: token.decimals ?? 0,
    chainId: hexChainId,
  };
}
