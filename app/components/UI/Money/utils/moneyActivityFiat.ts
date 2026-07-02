import type { TransactionMeta } from '@metamask/transaction-controller';
import type { CurrencyRateState } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { safeToChecksumAddress } from '../../../../util/address';
import { moneyFormatUsd } from './moneyFormatFiat';
import { balanceToFiatNumber } from '../../../../util/number';
import { fromTokenMinimalUnit } from '../../../../util/number/bigint';
import { isMusdToken } from '../../Earn/constants/musd';
import {
  getMoneyAmountPrefixForTransactionMeta,
  resolveMusdTransferMeta,
} from '../constants/activityStyles';
import { ETH_TICKER } from '../constants/moneyTokens';

export type CurrencyRatesMap = NonNullable<CurrencyRateState['currencyRates']>;

/**
 * Token market data keyed by chain ID then token contract address (checksummed).
 * Matches {@link TokenRatesController} `marketData` shape.
 */
export type TokenMarketDataMap = Record<
  string,
  Record<string, { price?: number } | undefined>
>;

function getMarketDataRowForChain(
  tokenMarketData: TokenMarketDataMap | undefined,
  chainId: Hex,
): Record<string, { price?: number } | undefined> | undefined {
  if (!tokenMarketData) {
    return undefined;
  }
  const direct = tokenMarketData[chainId];
  if (direct) {
    return direct;
  }
  const key = Object.keys(tokenMarketData).find(
    (k) => k.toLowerCase() === chainId.toLowerCase(),
  );
  return key !== undefined ? tokenMarketData[key] : undefined;
}

/**
 * Token→ETH `price` for {@link balanceToFiatNumber}, with checksum + case-insensitive address keys.
 */
export function getTokenToEthPrice(
  tokenMarketData: TokenMarketDataMap | undefined,
  chainId: Hex,
  contractAddress: string,
): number | undefined {
  const byChain = getMarketDataRowForChain(tokenMarketData, chainId);
  if (!byChain) {
    return undefined;
  }
  const checksum = safeToChecksumAddress(contractAddress as Hex);
  if (checksum) {
    const fromChecksum = byChain[checksum]?.price;
    if (fromChecksum !== undefined && fromChecksum !== null) {
      return fromChecksum;
    }
  }
  const lower = contractAddress.toLowerCase();
  const addressKey = Object.keys(byChain).find(
    (k) => k.toLowerCase() === lower,
  );
  if (addressKey === undefined) {
    return undefined;
  }
  const p = byChain[addressKey]?.price;
  return p === undefined || p === null ? undefined : p;
}

function isMusdLikeForFiatFallback(
  contractAddress: string | undefined,
  symbol: string | undefined,
): boolean {
  return isMusdToken(contractAddress) || symbol?.toUpperCase() === 'MUSD';
}

interface CurrencyRateEntryLike {
  conversionRate?: number | null;
  usdConversionRate?: number | null;
}

interface ResolvedFiatConversionRateEntry {
  conversionRate: number;
  usdConversionRate: number;
}

/**
 * Picks a rate entry for fiat conversion: prefers `preferredTicker` when both
 * `conversionRate` and `usdConversionRate` are present, otherwise falls back to
 * the first map entry that has both.
 */
function resolveCurrencyRateEntry(
  currencyRates: CurrencyRatesMap | undefined,
  preferredTicker: string,
): ResolvedFiatConversionRateEntry | undefined {
  if (!currencyRates) {
    return undefined;
  }
  const preferredEntry: CurrencyRateEntryLike | undefined =
    currencyRates[preferredTicker];
  const hasValidRates = (e: CurrencyRateEntryLike | undefined) =>
    Boolean(e?.conversionRate && e?.usdConversionRate);

  const rateEntry = hasValidRates(preferredEntry)
    ? preferredEntry
    : Object.values(currencyRates).find(hasValidRates);

  if (
    rateEntry?.conversionRate == null ||
    rateEntry.usdConversionRate == null
  ) {
    return undefined;
  }

  return {
    conversionRate: rateEntry.conversionRate,
    usdConversionRate: rateEntry.usdConversionRate,
  };
}

/**
 * ETH → USD rate from {@link CurrencyRateController} (same denominator as token→ETH `price`).
 * Money amounts are always shown in dollars, so we convert token → USD directly.
 */
function getEthToUsdRate(
  currencyRates: CurrencyRatesMap | undefined,
): number | undefined {
  return resolveCurrencyRateEntry(currencyRates, ETH_TICKER)?.usdConversionRate;
}

/**
 * USD → user's selected fiat rate. For a USD-pegged token (USDC/mUSD) the USD
 * amount equals the token amount, so this is all that's needed to render its
 * fiat line. Derived as (currency per ETH) ÷ (USD per ETH); `undefined` when
 * rates aren't available (caller should then omit the fiat line). Returns `1`
 * implicitly when the selected currency already is USD (the two ETH rates match).
 */
export function getUsdToFiatConversionRate(
  currencyRates: CurrencyRatesMap | undefined,
): number | undefined {
  const entry = resolveCurrencyRateEntry(currencyRates, ETH_TICKER);
  if (!entry) {
    return undefined;
  }
  return entry.conversionRate / entry.usdConversionRate;
}

/**
 * Secondary fiat line for a Money activity row: prefix (+/-) + USD (2 decimals).
 *
 * mUSD is USD-pegged 1:1, so its dollar value is the token amount directly.
 * Any other token converts **token → USD** via {@link balanceToFiatNumber}:
 * human token amount × ETH→USD × token→ETH `price` from market data, matching
 * {@link balanceToFiat} / TransactionElement ERC-20 handling.
 */
export function buildMoneyActivityFiatLine(
  tx: TransactionMeta,
  currencyRates: CurrencyRatesMap | undefined,
  tokenMarketData: TokenMarketDataMap | undefined,
): string {
  const meta = resolveMusdTransferMeta(tx);
  if (!meta) {
    return '';
  }

  // `isRounding = false` keeps the BigInt-decoded amount precise — the default
  // `Number()` cast would lose precision for amounts above 2^53 minimal units.
  const humanReadable = fromTokenMinimalUnit(meta.amount, meta.decimals, false);
  const humanAmount = parseFloat(humanReadable);
  if (Number.isNaN(humanAmount)) {
    return '';
  }

  const chainId = tx.chainId as Hex | undefined;
  if (!chainId) {
    return '';
  }

  if (!safeToChecksumAddress(meta.contractAddress as Hex)) {
    return '';
  }

  const prefix = getMoneyAmountPrefixForTransactionMeta(tx);
  const absAmount = Math.abs(humanAmount);

  const isMusdLike = isMusdLikeForFiatFallback(
    meta.contractAddress,
    meta.symbol,
  );

  let fiatNumber: number | undefined;

  if (isMusdLike) {
    // mUSD is pegged 1:1 to USD, so its dollar value is the token amount.
    // `tokenMarketData` has been observed to report wildly wrong prices for it
    // on some chains, so we never trust the market-rate path for mUSD.
    fiatNumber = absAmount;
  } else {
    const tokenToEthRate = getTokenToEthPrice(
      tokenMarketData,
      chainId,
      meta.contractAddress,
    );
    const ethToUsdRate = getEthToUsdRate(currencyRates);
    if (
      tokenToEthRate !== undefined &&
      tokenToEthRate !== null &&
      tokenToEthRate !== 0 &&
      ethToUsdRate !== undefined
    ) {
      fiatNumber = balanceToFiatNumber(
        absAmount,
        ethToUsdRate,
        tokenToEthRate,
        2,
      );
    }
  }

  if (fiatNumber === undefined) {
    return '';
  }

  return `${prefix}${moneyFormatUsd(new BigNumber(fiatNumber))}`;
}
