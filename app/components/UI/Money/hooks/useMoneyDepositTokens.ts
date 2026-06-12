import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';
import { useTransactionPayBlockedTokens } from '../../../Views/confirmations/hooks/pay/useTransactionPayBlockedTokens';
import { isTokenBlocked } from '../../../Views/confirmations/utils/transaction-pay';
import { isTokenInWildcardList } from '../../Earn/utils/wildcardTokenList';
import {
  selectMoneyDepositTokensBlocklist,
  selectMoneyNoFeeTokens,
  selectMoneyTokensSortMode,
  selectMoneyDepositMinBalance,
  MoneyTokensSortMode,
} from '../selectors/featureFlags';
import {
  AssetType,
  TokenStandard,
} from '../../../Views/confirmations/types/token';
import { TokenI } from '../../Tokens/types';
import { safeFormatChainIdToHex } from '../../Card/util/safeFormatChainIdToHex';

/**
 * The source of truth for tokens that are eligible for deposit into the Money account.
 *
 * Filtering pipeline:
 * 1. useAccountTokens({ includeNoBalance: false }) — zero-balance tokens excluded
 * 2. MM Pay default blocklist — inherit MM Pay team's remote-config default blocklist
 * 3. Money-scoped blocklist — Money team's per-token/chain blocklist
 * 4. Minimum fiat balance — dust tokens below `earnMoneyDepositMinAssetBalance` excluded
 *
 * Sorting is controlled remotely via `earnMoneyTokensSortMode`:
 * - `fiatBalanceDesc` (default): all tokens sorted by fiat balance descending
 * - `noFeePriority`: no-fee tokens (from `earnMoneyDepositNoFeeTokens` remote flag) rendered first,
 * each bucket sorted by fiat balance descending
 *
 * An explicit `sortModeOverride` param takes precedence over the remote flag value.
 */
export const useMoneyDepositTokens = ({
  sortModeOverride,
}: {
  sortModeOverride?: MoneyTokensSortMode;
} = {}) => {
  const mmPayBlockedTokens = useTransactionPayBlockedTokens();
  const moneyBlocklist = useSelector(selectMoneyDepositTokensBlocklist);
  const noFeeTokens = useSelector(selectMoneyNoFeeTokens);
  const remoteSortMode = useSelector(selectMoneyTokensSortMode);
  const minBalance = useSelector(selectMoneyDepositMinBalance);

  const sortMode: MoneyTokensSortMode = sortModeOverride ?? remoteSortMode;

  const allTokens = useAccountTokens({ includeNoBalance: false });

  const isEvmToken = useCallback(
    (token: AssetType) => Boolean(token.accountType?.includes('eip155')),
    [],
  );

  const isMMPayBlocked = useCallback(
    (token: AssetType) => isTokenBlocked(token, mmPayBlockedTokens),
    [mmPayBlockedTokens],
  );

  const isMoneyBlocklisted = useCallback(
    (token: AssetType) => {
      if (!token.chainId) return true;

      return isTokenInWildcardList(
        token.symbol,
        moneyBlocklist,
        safeFormatChainIdToHex(token.chainId),
      );
    },
    [moneyBlocklist],
  );

  const meetsMinBalance = useCallback(
    (token: AssetType) => {
      const fiatBalance = token?.fiat?.balance;
      if (fiatBalance === undefined || fiatBalance === null) return false;
      const balance = Number(fiatBalance);
      return Number.isFinite(balance) && balance >= minBalance;
    },
    [minBalance],
  );

  /**
   * Filters an arbitrary list of AssetType tokens through the MM Pay blocklist,
   * Money-scoped blocklist, and minimum fiat balance threshold.
   * Tokens passing all filters are eligible.
   */
  const filterAllowedTokens = useCallback(
    (tokens: AssetType[]): AssetType[] =>
      tokens.filter(
        (token) =>
          // Must run before isMMPayBlocked since MM Pay only supports EVM tokens.
          isEvmToken(token) &&
          !isMMPayBlocked(token) &&
          !isMoneyBlocklisted(token) &&
          meetsMinBalance(token),
      ),
    [isEvmToken, isMMPayBlocked, isMoneyBlocklisted, meetsMinBalance],
  );

  const byFiatDesc = useCallback(
    (a: AssetType, b: AssetType) =>
      (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0),
    [],
  );

  const isNoFeeToken = useCallback(
    (token: AssetType) => {
      if (!token.chainId) return false;

      return isTokenInWildcardList(
        token.symbol,
        noFeeTokens,
        safeFormatChainIdToHex(token.chainId),
      );
    },
    [noFeeTokens],
  );

  const tokens = useMemo(() => {
    const eligible = filterAllowedTokens(allTokens);

    if (sortMode === 'noFeePriority') {
      const noFee = eligible.filter(isNoFeeToken).sort(byFiatDesc);
      const withFee = eligible.filter((t) => !isNoFeeToken(t)).sort(byFiatDesc);
      return [...noFee, ...withFee];
    }

    return [...eligible].sort(byFiatDesc);
  }, [allTokens, filterAllowedTokens, sortMode, isNoFeeToken, byFiatDesc]);

  const isEligibleToken = useCallback(
    (token?: AssetType | TokenI): boolean => {
      if (!token) return false;
      if (!token.chainId) return false;

      const tokenChainIdHex = safeFormatChainIdToHex(token.chainId);

      return tokens.some(
        (eligible) =>
          token.address.toLowerCase() === eligible.address.toLowerCase() &&
          eligible.chainId &&
          safeFormatChainIdToHex(eligible.chainId) === tokenChainIdHex,
      );
    },
    [tokens],
  );

  return {
    tokens,
    isEligibleToken,
    isNoFeeToken,
    filterAllowedTokens,
  };
};
