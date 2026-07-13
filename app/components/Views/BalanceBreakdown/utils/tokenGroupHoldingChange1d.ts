import type {
  Asset,
  TokenRatesControllerState,
} from '@metamask/assets-controllers';
import { isEvmAccountType } from '@metamask/keyring-api';
import {
  getTokenPricePercentChange1d,
  type MultichainRatesForPriceChange,
} from '../../../UI/Tokens/hooks/useTokenPricePercentageChange';

/** Narrow asset shape used by token drilldown + balance-change reconstruction. */
export type AssetWithFiat = Asset & {
  fiat?: number | { balance: number };
  chainId?: string;
  image?: string;
  isNative?: boolean;
  address?: string;
  accountType?: string;
};

export function getAssetFiatBalance(asset: AssetWithFiat): number {
  const f = asset.fiat;
  if (f == null) {
    return 0;
  }
  if (typeof f === 'number') {
    return f;
  }
  if (typeof f === 'object' && typeof f.balance === 'number') {
    return f.balance;
  }
  return 0;
}

export function getTokenDrilldownGroupKey(asset: AssetWithFiat): string {
  const sym = asset.symbol?.trim();
  if (sym) {
    return sym.toUpperCase();
  }
  return asset.assetId;
}

function isNonNaNNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * One asset's 1d current/previous fiat — mirrors `sumEvmAccountChangeForPeriod` /
 * `sumNonEvmAccountChangeForPeriod` in `@metamask/assets-controllers` (`balances.mjs`).
 */
function assetBalanceChangeContribution1d(
  asset: AssetWithFiat,
  tokenRatesMarketData:
    | TokenRatesControllerState['marketData']
    | undefined
    | null,
  multichainConversionRates?: MultichainRatesForPriceChange | null,
): { current: number; previous: number } | null {
  const current = getAssetFiatBalance(asset);
  if (!isNonNaNNumber(current) || current <= 0) {
    return null;
  }

  const rateLookupAddress =
    asset.assetId ?? (asset as { address?: string }).address;
  const percentPayload: Parameters<typeof getTokenPricePercentChange1d>[0] = {
    chainId: asset.chainId,
    isNative: asset.isNative,
  };
  if (rateLookupAddress !== undefined) {
    percentPayload.address = rateLookupAddress;
  }

  const percentRaw = getTokenPricePercentChange1d(
    percentPayload,
    tokenRatesMarketData,
    multichainConversionRates,
  );

  if (!isNonNaNNumber(percentRaw)) {
    const isEvmRow =
      asset.accountType !== undefined && isEvmAccountType(asset.accountType);
    if (isEvmRow && asset.isNative) {
      return { current, previous: current };
    }
    return null;
  }

  const denom = Number((1 + percentRaw / 100).toFixed(8));
  if (denom === 0) {
    return null;
  }
  return { current, previous: current / denom };
}

/**
 * 1d % change for a symbol group — same formula as `calculateBalanceChangeForAccountGroup`
 * (`BalanceChangeResult.percentChange`, i.e. percentage *points* for `getFormattedPercentageChange`).
 */
export function getTokenGroupHoldingPercentChange1d(
  members: AssetWithFiat[],
  tokenRatesMarketData:
    | TokenRatesControllerState['marketData']
    | undefined
    | null,
  multichainConversionRates?: MultichainRatesForPriceChange | null,
): number | undefined {
  let sumCurrent = 0;
  let sumPrevious = 0;
  for (const m of members) {
    const c = assetBalanceChangeContribution1d(
      m,
      tokenRatesMarketData,
      multichainConversionRates,
    );
    if (!c) {
      continue;
    }
    sumCurrent += c.current;
    sumPrevious += c.previous;
  }
  if (sumCurrent === 0 && sumPrevious === 0) {
    return undefined;
  }
  const amountChange = sumCurrent - sumPrevious;
  const percentChange =
    sumPrevious !== 0 ? (amountChange / sumPrevious) * 100 : 0;
  return Number(percentChange.toFixed(8));
}
