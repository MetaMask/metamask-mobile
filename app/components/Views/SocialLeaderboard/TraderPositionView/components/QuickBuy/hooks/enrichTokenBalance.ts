import type { Hex } from '@metamask/utils';
import { formatUnits } from 'ethers/lib/utils';
import { isSolanaChainId, isNativeAddress } from '@metamask/bridge-controller';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { addCurrencySymbol } from '../../../../../../../util/number/bigint';
import type { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import type { selectCurrencyRates } from '../../../../../../../selectors/currencyRateController';
import {
  hasNonZeroHexBalance,
  getCachedNativeBalance,
  getCachedErc20Balance,
  getTokenPrice,
  type TokenBalances,
  type AccountsByChainId,
} from './tokenBalanceUtils';

/**
 * The priced balance fields shared by every QuickBuy token row. `balance` is a
 * non-truncated decimal amount, `balanceFiat` the formatted fiat string, and
 * `currencyExchangeRate` the USD-per-token rate the controller uses to convert
 * the entered USD amount into a token amount.
 */
export interface TokenBalanceEnrichment {
  balance: string;
  balanceFiat: string;
  tokenFiatAmount: number;
  currencyExchangeRate?: number;
}

/**
 * Resolved Redux slices needed to price a token. Passed in (rather than read
 * via hooks) so the enrichment stays a pure function reusable by both the
 * "Pay with" and "Receive" hooks.
 */
export interface TokenBalanceDeps {
  accountAddress?: string;
  accountsByChainId: AccountsByChainId;
  tokenBalances: TokenBalances;
  tokenMarketData: ReturnType<typeof selectTokenMarketData>;
  currencyRates: ReturnType<typeof selectCurrencyRates>;
  allNetworkConfigs?: Record<string, { nativeCurrency?: string } | undefined>;
  solanaAccount?: { id: string };
  multichainBalances?: Record<
    string,
    Record<string, { amount?: string } | undefined> | undefined
  >;
  multichainRates?: Record<string, { rate?: string } | undefined>;
}

export interface EnrichTokenBalanceOptions {
  /**
   * USD-per-token rate to assume when the token has no market price (e.g.
   * stablecoins). When omitted, a token without a resolvable positive rate is
   * dropped (the function returns `null`).
   */
  fallbackExchangeRate?: number;
  /**
   * When `true`, tokens with no/zero balance are still returned (balance "0",
   * $0.00 fiat) instead of being dropped. Used by the "Receive" picker, which
   * lists every stable regardless of whether the user holds it.
   */
  includeZeroBalance?: boolean;
}

/**
 * QuickBuy prices everything in USD: `currencyExchangeRate` is a USD-per-token
 * rate and the amount-entry flow is USD-first (see `QuickBuyAmountSection`).
 * The fiat fields are therefore always USD-denominated, so they must be
 * formatted as USD — formatting a USD value with the user's selected currency
 * (e.g. "€2000.00" for a $2000 value) would be wrong.
 */
const USD_CURRENCY = 'usd' as Parameters<typeof addCurrencySymbol>[1];

const zeroEnrichment = (
  fallbackExchangeRate?: number,
): TokenBalanceEnrichment => ({
  balance: '0',
  balanceFiat: addCurrencySymbol('0.00', USD_CURRENCY),
  tokenFiatAmount: 0,
  currencyExchangeRate: fallbackExchangeRate,
});

const priced = (
  balance: string,
  exchangeRate: number,
  balanceNum: number,
): TokenBalanceEnrichment => {
  const tokenFiatAmount = balanceNum * exchangeRate;
  return {
    balance,
    balanceFiat: addCurrencySymbol(tokenFiatAmount.toFixed(2), USD_CURRENCY),
    tokenFiatAmount,
    currencyExchangeRate: exchangeRate,
  };
};

const enrichEvmTokenBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
  options: EnrichTokenBalanceOptions,
): TokenBalanceEnrichment | null => {
  const { fallbackExchangeRate, includeZeroBalance } = options;
  const {
    accountAddress,
    accountsByChainId,
    tokenBalances,
    tokenMarketData,
    currencyRates,
    allNetworkConfigs,
  } = deps;

  const dropOrZero = () =>
    includeZeroBalance ? zeroEnrichment(fallbackExchangeRate) : null;

  if (!accountAddress) return dropOrZero();

  const chainId = candidate.chainId as Hex;
  const isNative = isNativeAddress(candidate.address);
  const rawBalance = isNative
    ? getCachedNativeBalance(accountsByChainId, chainId, accountAddress)
    : getCachedErc20Balance(
        tokenBalances,
        accountAddress,
        chainId,
        candidate.address,
      );

  if (!hasNonZeroHexBalance(rawBalance)) return dropOrZero();

  let displayBalance: string;
  try {
    displayBalance = formatUnits(rawBalance, candidate.decimals);
  } catch {
    return dropOrZero();
  }

  const balanceNum = parseFloat(displayBalance);
  if (isNaN(balanceNum) || balanceNum <= 0) return dropOrZero();

  const nativeTicker = allNetworkConfigs?.[chainId]?.nativeCurrency;
  const nativeConversionRate = nativeTicker
    ? (currencyRates?.[nativeTicker]?.usdConversionRate ?? 0)
    : 0;

  let exchangeRate: number;
  if (isNative) {
    exchangeRate = nativeConversionRate;
  } else {
    const tokenPrice = getTokenPrice(
      tokenMarketData,
      chainId,
      candidate.address,
    );
    exchangeRate =
      tokenPrice !== undefined
        ? tokenPrice * nativeConversionRate
        : (fallbackExchangeRate ?? 0);
  }

  if (!(exchangeRate > 0)) {
    // No positive USD rate. Lenient callers (Receive) fall back to the stable
    // rate so the held balance still shows; strict callers (Pay with) drop the
    // token because the fiat-first amount entry needs a real price.
    if (includeZeroBalance && (fallbackExchangeRate ?? 0) > 0) {
      return priced(displayBalance, fallbackExchangeRate as number, balanceNum);
    }
    return includeZeroBalance ? zeroEnrichment(fallbackExchangeRate) : null;
  }

  return priced(displayBalance, exchangeRate, balanceNum);
};

const enrichSolanaTokenBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
  options: EnrichTokenBalanceOptions,
): TokenBalanceEnrichment | null => {
  const { fallbackExchangeRate, includeZeroBalance } = options;
  const { solanaAccount, multichainBalances, multichainRates } = deps;

  const dropOrZero = () =>
    includeZeroBalance ? zeroEnrichment(fallbackExchangeRate) : null;

  if (!solanaAccount) return dropOrZero();

  const amountStr =
    multichainBalances?.[solanaAccount.id]?.[candidate.address]?.amount;
  if (!amountStr) return dropOrZero();

  const balanceNum = parseFloat(amountStr);
  if (isNaN(balanceNum) || balanceNum <= 0) return dropOrZero();

  const rateStr = multichainRates?.[candidate.address]?.rate;
  const rateNum = rateStr ? parseFloat(rateStr) : NaN;

  if (isNaN(rateNum) || rateNum <= 0) {
    if (includeZeroBalance && (fallbackExchangeRate ?? 0) > 0) {
      return priced(amountStr, fallbackExchangeRate as number, balanceNum);
    }
    return null;
  }

  return priced(amountStr, rateNum, balanceNum);
};

/**
 * Prices a single token candidate from cached Redux balances, returning the
 * shared balance fields (or `null` when the token should be omitted). Handles
 * EVM natives, EVM ERC-20s, and Solana assets, keeping the USD exchange-rate
 * semantics QuickBuy's amount math depends on.
 */
export const enrichTokenBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
  options: EnrichTokenBalanceOptions = {},
): TokenBalanceEnrichment | null =>
  isSolanaChainId(candidate.chainId)
    ? enrichSolanaTokenBalance(candidate, deps, options)
    : enrichEvmTokenBalance(candidate, deps, options);
