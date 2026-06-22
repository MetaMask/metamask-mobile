import type { Hex } from '@metamask/utils';
import { formatUnits } from 'ethers/lib/utils';
import {
  isNonEvmChainId,
  isNativeAddress,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { BtcScope, TrxScope } from '@metamask/keyring-api';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { formatCurrency } from '../../../../../../UI/Bridge/utils/currencyUtils';
import { calcTokenFiatRate } from '../../../../../../UI/Bridge/utils/exchange-rates';
import { safeToChecksumAddress } from '../../../../../../../util/address';
import type { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import type { selectCurrencyRates } from '../../../../../../../selectors/currencyRateController';
import {
  hasNonZeroHexBalance,
  getCachedNativeBalance,
  getCachedErc20Balance,
  type TokenBalances,
  type AccountsByChainId,
} from './tokenBalanceUtils';

/**
 * The priced balance fields shared by every QuickBuy token row. `balance` is a
 * non-truncated decimal amount, `balanceFiat` the formatted fiat string in the
 * user's display currency (left `undefined` when the token's price can't be
 * resolved, so the row renders a dash), and `currencyExchangeRate` the
 * user-currency-per-token rate the controller uses to convert the entered fiat
 * amount into a token amount.
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
  /** The user's selected display currency (e.g. "usd", "eur"). */
  currentCurrency: string;
  allNetworkConfigs?: Record<string, { nativeCurrency?: string } | undefined>;
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
   * tokens come back as balance "0" / zero fiat, and held-but-unpriceable
   * tokens keep their real balance with an undefined fiat (rendered as a dash).
   * Used by the "Receive" picker, which lists every stable regardless of
   * whether the user holds it.
   */
  includeZeroBalance?: boolean;
}

const zeroEnrichment = (currentCurrency: string): TokenBalanceEnrichment => ({
  balance: '0',
  balanceFiat: formatCurrency(0, currentCurrency),
  tokenFiatAmount: 0,
  currencyExchangeRate: undefined,
});

/**
 * Lenient result for a token the user *does* hold but whose price can't be
 * resolved: keeps the real on-chain `balance` so the Receive picker still shows
 * the holding, while leaving fiat `undefined` (the row renders a dash rather
 * than a misleading zero) and the rate undefined.
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
  currentCurrency: string,
): TokenBalanceEnrichment => {
  const tokenFiatAmount = balanceNum * exchangeRate;
  return {
    balance,
    balanceFiat: formatCurrency(tokenFiatAmount, currentCurrency),
    tokenFiatAmount,
    currencyExchangeRate: exchangeRate,
  };
};

/**
 * Reads the user's cached on-chain balance of an EVM token, returning a
 * non-truncated decimal string, or `null` when the user holds none (or the
 * balance can't be parsed). Pricing is handled separately by the canonical
 * `calcTokenFiatRate`.
 */
const readEvmBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
): string | null => {
  const { accountAddress, accountsByChainId, tokenBalances } = deps;
  if (!accountAddress) return null;

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

  if (!hasNonZeroHexBalance(rawBalance)) return null;

  try {
    return formatUnits(rawBalance, candidate.decimals);
  } catch {
    return null;
  }
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

/**
 * Reads the user's non-EVM (Solana, Tron, Bitcoin) balance of a token from the
 * multichain balances controller, returning a decimal string or `null`.
 */
const readNonEvmBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
): string | null => {
  const nonEvmAccount = getNonEvmAccount(candidate.chainId, deps);
  if (!nonEvmAccount) return null;

  const amountStr =
    deps.multichainBalances?.[nonEvmAccount.id]?.[candidate.address]?.amount;
  return amountStr ?? null;
};

/**
 * Returns a copy of the candidate whose EVM ERC-20 address is checksummed so it
 * matches the keys `calcTokenFiatRate` uses to look up `tokenMarketData` (which
 * is keyed by checksummed addresses). Pay-with candidates carry lowercase
 * addresses, so without this normalization held ERC-20s with valid prices
 * resolve to no rate and get dropped from the strict (Pay with) picker.
 * Non-EVM (CAIP asset id) and native addresses are left untouched.
 */
const toPricedCandidate = (candidate: BridgeToken): BridgeToken => {
  if (
    isNonEvmChainId(candidate.chainId) ||
    isNativeAddress(candidate.address)
  ) {
    return candidate;
  }

  const checksummedAddress = safeToChecksumAddress(candidate.address);
  return checksummedAddress
    ? { ...candidate, address: checksummedAddress }
    : candidate;
};

/**
 * Prices a single token candidate from cached Redux balances, returning the
 * shared balance fields (or `null` when the token should be omitted). Balance
 * reading is QuickBuy-specific (EVM natives / ERC-20s via cached balances,
 * non-EVM assets via the multichain controllers); the fiat rate is delegated to
 * the canonical `calcTokenFiatRate` so QuickBuy shares the wallet-wide
 * user-currency exchange-rate semantics (no bespoke USD math).
 */
export const enrichTokenBalance = (
  candidate: BridgeToken,
  deps: TokenBalanceDeps,
  options: EnrichTokenBalanceOptions = {},
): TokenBalanceEnrichment | null => {
  const { includeZeroBalance } = options;
  const dropOrZero = () =>
    includeZeroBalance ? zeroEnrichment(deps.currentCurrency) : null;

  const balance = isNonEvmChainId(candidate.chainId)
    ? readNonEvmBalance(candidate, deps)
    : readEvmBalance(candidate, deps);

  if (balance === null) return dropOrZero();

  const balanceNum = parseFloat(balance);
  if (isNaN(balanceNum) || balanceNum <= 0) return dropOrZero();

  const exchangeRate = calcTokenFiatRate({
    token: toPricedCandidate(candidate),
    evmMultiChainMarketData: deps.tokenMarketData,
    networkConfigurationsByChainId: (deps.allNetworkConfigs ?? {}) as Record<
      Hex,
      { nativeCurrency: string }
    >,
    evmMultiChainCurrencyRates: deps.currencyRates,
    nonEvmMultichainAssetRates: deps.multichainRates as Parameters<
      typeof calcTokenFiatRate
    >[0]['nonEvmMultichainAssetRates'],
  });

  if (!exchangeRate || exchangeRate <= 0) {
    // No resolvable price. Strict callers (Pay with) drop the token because the
    // fiat-first amount entry needs a real price; lenient callers (Receive)
    // keep the real held balance with an undefined fiat so the holding shows up.
    return includeZeroBalance ? unpricedEnrichment(balance) : null;
  }

  return priced(balance, exchangeRate, balanceNum, deps.currentCurrency);
};
