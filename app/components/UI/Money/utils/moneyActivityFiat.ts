import type { TransactionMeta } from '@metamask/transaction-controller';
import type { CurrencyRateState } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { safeToChecksumAddress } from '../../../../util/address';
import { moneyFormatFiat } from './moneyFormatFiat';
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
function getTokenToEthPrice(
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
 * ETH → user's selected fiat rate from {@link CurrencyRateController} (same denominator as token→ETH `price`).
 */
function getEthToFiatConversionRate(
  currencyRates: CurrencyRatesMap | undefined,
): number | undefined {
  return resolveCurrencyRateEntry(currencyRates, ETH_TICKER)?.conversionRate;
}

/**
 * Secondary fiat line for a Money activity row: prefix (+/-) + localized currency (2 decimals).
 * Converts **token → fiat** via {@link balanceToFiatNumber}: human token amount × ETH→fiat
 * × token→ETH `price` from market data, matching {@link balanceToFiat} / TransactionElement
 * ERC-20 handling.
 *
 * When market `price` is missing (common before rates load), mUSD-like tokens use the same
 * `balanceToFiatNumber` path with a **synthetic** token→ETH price from a 1:1 USD peg
 * (`1 / usdConversionRate` on the resolved ETH rate entry), so the pipeline stays token→fiat.
 */
export function buildMoneyActivityFiatLine(
  tx: TransactionMeta,
  currencyRates: CurrencyRatesMap | undefined,
  currentCurrency: string | undefined,
  tokenMarketData: TokenMarketDataMap | undefined,
): string {
  const meta = resolveMusdTransferMeta(tx);
  if (!meta) {
    return '';
  }
  if (!currentCurrency) {
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
  const tokenToEthRate = getTokenToEthPrice(
    tokenMarketData,
    chainId,
    meta.contractAddress,
  );
  const ethToFiatRate = getEthToFiatConversionRate(currencyRates);

  let fiatNumber: number | undefined;

  // mUSD is pegged 1:1 to USD by design — `tokenMarketData` has been observed
  // to report wildly wrong prices for it on some chains, so we always derive
  // fiat from the peg and never trust the market-rate path for mUSD.
  if (isMusdLike) {
    const rateEntry = resolveCurrencyRateEntry(currencyRates, ETH_TICKER);
    if (rateEntry !== undefined && rateEntry.usdConversionRate !== 0) {
      const tokenToEthPricePeg = 1 / rateEntry.usdConversionRate;
      fiatNumber = balanceToFiatNumber(
        absAmount,
        rateEntry.conversionRate,
        tokenToEthPricePeg,
        2,
      );
    }
  } else if (
    tokenToEthRate !== undefined &&
    tokenToEthRate !== null &&
    tokenToEthRate !== 0 &&
    ethToFiatRate !== undefined
  ) {
    fiatNumber = balanceToFiatNumber(
      absAmount,
      ethToFiatRate,
      tokenToEthRate,
      2,
    );
  }

  if (fiatNumber === undefined) {
    return '';
  }

  return `${prefix}${moneyFormatFiat(new BigNumber(fiatNumber), currentCurrency)}`;
}
