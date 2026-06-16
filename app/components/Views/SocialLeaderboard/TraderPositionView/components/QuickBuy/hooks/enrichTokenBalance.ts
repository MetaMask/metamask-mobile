import type { Hex } from '@metamask/utils';
import { formatUnits } from 'ethers/lib/utils';
import {
  isNonEvmChainId,
  isSolanaChainId,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { BtcScope, TrxScope } from '@metamask/keyring-api';
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
 * non-truncated decimal amount, `balanceFiat` the formatted fiat string (left
 * `undefined` when the token's USD price can't be resolved, so the row renders
 * a dash), and `currencyExchangeRate` the USD-per-token rate the controller
 * uses to convert the entered USD amount into a token amount.
 */
export interface TokenBalanceEnrichment {
  balance: string;
  balanceFiat?: string;
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
  /**
   * Currency code used to format the fiat display string (e.g. `'usd'`,
   * `'eur'`). Defaults to USD when omitted.
   */
  fiatCurrency?: Parameters<typeof addCurrencySymbol>[1];
  solanaAccount?: { id: string };
  tronAccount?: { id: string };
  bitcoinAccount?: { id: string };
  multichainBalances?: Record<
    string,
    Record<string, { amount?: string } | undefined> | undefined
  >;
  multichainRates?: Record<string, { rate?: string } | undefined>;
}

export interface EnrichTokenBalanceOptions {
  /**
   * When `true`, tokens are still returned instead of being dropped: unheld
   * tokens come back as balance "0" / $0.00 fiat, and held-but-unpriceable
   * tokens keep their real balance with an undefined fiat (rendered as a dash).
   * Used by the "Receive" picker, which lists every stable regardless of
   * whether the user holds it.
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
  fiatCurrency: Parameters<typeof addCurrencySymbol>[1] = USD_CURRENCY,
): TokenBalanceEnrichment => ({
  balance: '0',
  balanceFiat: addCurrencySymbol('0.00', fiatCurrency),
  tokenFiatAmount: 0,
  currencyExchangeRate: undefined,
});

/**
 * Lenient result for a token the user *does* hold but whose USD price can't be
 * resolved: keeps the real on-chain `balance` so the Receive picker still shows
 * the holding, while leaving fiat `undefined` (the row renders a dash rather
 * than a misleading $0.00) and the rate undefined.
 */
const unpricedEnrichment = (balance: string): TokenBalanceEnrichment => ({
  balance,
  balanceFiat: undefined,
  tokenFiatAmount: 0,
  currencyExchangeRate: undefined,
});

const priced = (
  balance: string,
  exchangeRate: number,
  balanceNum: number,
  fiatCurrency: Parameters<typeof addCurrencySymbol>[1] = USD_CURRENCY,
): TokenBalanceEnrichment => {
  const tokenFiatAmount = balanceNum * exchangeRate;
  return {
    balance,
    balanceFiat: addCurrencySymbol(tokenFiatAmount.toFixed(2), fiatCurrency),
    tokenFiatAmount,
    currencyExchangeRate: exchangeRate,
  };
};

const enrichEvmTokenBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
  options: EnrichTokenBalanceOptions,
): TokenBalanceEnrichment | null => {
  const { includeZeroBalance } = options;
  const {
    accountAddress,
    accountsByChainId,
    tokenBalances,
    tokenMarketData,
    currencyRates,
    allNetworkConfigs,
    fiatCurrency,
  } = deps;

  const dropOrZero = () =>
    includeZeroBalance ? zeroEnrichment(fiatCurrency) : null;

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
      tokenPrice !== undefined ? tokenPrice * nativeConversionRate : 0;
  }

  if (!(exchangeRate > 0)) {
    // No resolvable USD price. Strict callers (Pay with) drop the token because
    // the fiat-first amount entry needs a real price; lenient callers (Receive)
    // keep the real held balance with a zero fiat value so the holding still
    // shows up.
    return includeZeroBalance ? unpricedEnrichment(displayBalance) : null;
  }

  return priced(displayBalance, exchangeRate, balanceNum, fiatCurrency);
};

/**
 * Resolves the non-EVM account whose multichain balances cover the candidate's
 * chain. Multichain balances/rates are keyed by account id + CAIP asset id, so
 * each non-EVM chain needs the matching account from the selected group.
 */
const getNonEvmAccount = (
  chainId: BridgeToken['chainId'],
  deps: TokenBalanceDeps,
): { id: string } | undefined => {
  if (isSolanaChainId(chainId)) return deps.solanaAccount;
  if (chainId === TrxScope.Mainnet) return deps.tronAccount;
  if (chainId === BtcScope.Mainnet) return deps.bitcoinAccount;
  return undefined;
};

const enrichNonEvmTokenBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
  options: EnrichTokenBalanceOptions,
): TokenBalanceEnrichment | null => {
  const { includeZeroBalance } = options;
  const { multichainBalances, multichainRates, fiatCurrency } = deps;

  const dropOrZero = () =>
    includeZeroBalance ? zeroEnrichment(fiatCurrency) : null;

  const nonEvmAccount = getNonEvmAccount(candidate.chainId, deps);
  if (!nonEvmAccount) return dropOrZero();

  const amountStr =
    multichainBalances?.[nonEvmAccount.id]?.[candidate.address]?.amount;
  if (!amountStr) return dropOrZero();

  const balanceNum = parseFloat(amountStr);
  if (isNaN(balanceNum) || balanceNum <= 0) return dropOrZero();

  const rateStr = multichainRates?.[candidate.address]?.rate;
  const rateNum = rateStr ? parseFloat(rateStr) : NaN;

  if (isNaN(rateNum) || rateNum <= 0) {
    // Held but no resolvable rate: keep the real balance when lenient (Receive),
    // drop it when strict (Pay with).
    return includeZeroBalance ? unpricedEnrichment(amountStr) : null;
  }

  return priced(amountStr, rateNum, balanceNum, fiatCurrency);
};

/**
 * Prices a single token candidate from cached Redux balances, returning the
 * shared balance fields (or `null` when the token should be omitted). Handles
 * EVM natives, EVM ERC-20s, and non-EVM assets (Solana, Tron, Bitcoin) via the
 * multichain balance/rate controllers, keeping the USD exchange-rate semantics
 * QuickBuy's amount math depends on.
 */
export const enrichTokenBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
  options: EnrichTokenBalanceOptions = {},
): TokenBalanceEnrichment | null =>
  isNonEvmChainId(candidate.chainId)
    ? enrichNonEvmTokenBalance(candidate, deps, options)
    : enrichEvmTokenBalance(candidate, deps, options);
