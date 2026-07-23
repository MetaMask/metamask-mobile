import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useMemo, useCallback } from 'react';
import {
  type CanonicalMoneyAccountBalanceResponse,
  type NormalizedVaultApyResponse,
} from '@metamask/money-account-balance-service';
import { useQuery } from '@metamask/react-data-query';
import type { UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { moneyFormatUsd } from '../utils/moneyFormatFiat';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { MUSD_DECIMALS } from '../../Earn/constants/musd';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import Engine from '../../../../core/Engine';
import { invalidateMoneyAccountBalanceCaches } from '../utils/invalidateMoneyAccountBalanceCaches';
import useMoneyAccountInfo from './useMoneyAccountInfo';
import {
  isPersistedMoneyBalanceUsable,
  selectLastKnownMoneyBalance,
  setLastKnownMoneyBalance,
} from '../../../../core/redux/slices/moneyBalance';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';

const DEFAULT_REFETCH_INTERVAL = 30 * 1000; // 30 seconds
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Fetches the live exchange rate for the mUSD token.
 * This is necessary when we need the most current rate at runtime (e.g. Money account withdrawal).
 * @returns The live exchange rate for the mUSD token.
 */
export const getLiveVedaVaultExchangeRate = async () =>
  Engine.controllerMessenger
    .call('MoneyAccountBalanceService:getExchangeRate', { staleTime: 0 })
    .then(({ rate }) => rate);

interface UseMoneyAccountBalanceResult {
  moneyBalanceQuery: UseQueryResult<CanonicalMoneyAccountBalanceResponse>;
  vaultApyQuery: UseQueryResult<NormalizedVaultApyResponse>;
  isBalanceLoading: boolean;
  isBalanceFetchError: boolean;
  isBalanceUnavailable: boolean;
  /**
   * True when the canonical balance was served from the fallback source
   * (primary source failed and failover succeeded).
   */
  isBalanceDegraded: boolean;
  /** Provenance of the last successful balance: Money API or RPC. */
  balanceSource: 'api' | 'rpc' | undefined;
  /** Whether the last successful balance used the secondary source. */
  usedFallback: boolean;
  lastKnownTotalFiatFormatted: string | undefined;
  refetchBalance: () => void;
  tokenTotal: BigNumber | undefined;
  totalFiatFormatted: string | undefined;
  totalFiatRaw: string | undefined;
  withdrawableFiatFormatted: string | undefined;
  withdrawableFiatRaw: string | undefined;
  withdrawableMusd: BigNumber | undefined;
  apyDecimal: number | undefined;
  apyPercent: number | undefined;
  apyPercentFormatted: string | undefined;
}

const useMoneyAccountBalance = (
  refetchInterval: number = DEFAULT_REFETCH_INTERVAL,
): UseMoneyAccountBalanceResult => {
  const dispatch = useDispatch();
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const moneyAccountAddress = primaryMoneyAccount?.address;

  const currentCurrency = useSelector(selectCurrentCurrency);
  const lastKnownBalance = useSelector(selectLastKnownMoneyBalance);
  const { vaultApyFallback, vaultApyOverride } = useSelector(
    selectMoneyVaultApyRemoteConfig,
  );

  const moneyBalanceQuery = useQuery({
    queryKey: [
      MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
      moneyAccountAddress as string,
    ],
    enabled: Boolean(moneyAccountAddress),
    refetchInterval,
  }) as UseQueryResult<CanonicalMoneyAccountBalanceResponse>;

  const vaultApyQuery = useQuery({
    queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY],
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<NormalizedVaultApyResponse>;

  /**
   * True while the balance query is loading with no cached data (even if stale).
   */
  const isBalanceLoading = moneyBalanceQuery.isLoading;

  /** Any balance fetch failure → full error state. */
  const isBalanceFetchError = moneyBalanceQuery.isError;

  const balanceSource = moneyBalanceQuery.data?.source;
  const usedFallback = moneyBalanceQuery.data?.usedFallback === true;
  const isBalanceDegraded = usedFallback;

  const refetchBalance = useCallback(
    () =>
      moneyAccountAddress
        ? invalidateMoneyAccountBalanceCaches(moneyAccountAddress)
        : Promise.resolve(),
    [moneyAccountAddress],
  );

  const { tokenTotal, totalFiat, withdrawableFiat, withdrawableMusd } =
    useMemo(() => {
      // Total balance (mUSD + vmUSD) from the canonical facade response.
      const totalDecimal = moneyBalanceQuery.data?.totalBalance
        ? new BigNumber(moneyBalanceQuery.data.totalBalance).shiftedBy(
            -MUSD_DECIMALS,
          )
        : new BigNumber(0);

      // the withdrawable amount.
      const vmusdDecimal = moneyBalanceQuery.data?.vmusdValueInMusd
        ? new BigNumber(moneyBalanceQuery.data.vmusdValueInMusd).shiftedBy(
            -MUSD_DECIMALS,
          )
        : new BigNumber(0);

      // Undefined while loading or on error so callers can distinguish from a genuine zero.
      const computedWithdrawableMusd =
        isBalanceLoading || isBalanceFetchError ? undefined : vmusdDecimal;

      const computedTokenTotal =
        isBalanceLoading || isBalanceFetchError ? undefined : totalDecimal;

      // mUSD is USD-pegged 1:1, so the dollar value equals the token amount —
      // no conversion rate is needed to show the balance in dollars.
      return {
        tokenTotal: computedTokenTotal,
        totalFiat: computedTokenTotal,
        withdrawableFiat: computedWithdrawableMusd,
        withdrawableMusd: computedWithdrawableMusd,
      };
    }, [isBalanceLoading, isBalanceFetchError, moneyBalanceQuery.data]);

  const totalFiatFormatted =
    !isBalanceFetchError && totalFiat ? moneyFormatUsd(totalFiat) : undefined;

  const totalFiatRaw =
    !isBalanceFetchError && totalFiat ? totalFiat.toString() : undefined;

  const withdrawableFiatFormatted =
    !isBalanceFetchError && withdrawableFiat
      ? moneyFormatUsd(withdrawableFiat)
      : undefined;

  const withdrawableFiatRaw =
    !isBalanceFetchError && withdrawableFiat
      ? withdrawableFiat.toString()
      : undefined;

  // Persist every successful balance so it can be shown as the "last known"
  // figure (for the current account/currency) the next time the live balance
  // is unavailable — including after an app restart.
  useEffect(() => {
    if (
      moneyAccountAddress &&
      !isBalanceFetchError &&
      !isBalanceLoading &&
      totalFiatFormatted !== undefined
    ) {
      dispatch(
        setLastKnownMoneyBalance({
          address: moneyAccountAddress,
          value: totalFiatFormatted,
          currency: currentCurrency,
          updatedAt: Date.now(),
        }),
      );
    }
  }, [
    dispatch,
    moneyAccountAddress,
    isBalanceFetchError,
    totalFiatFormatted,
    currentCurrency,
    isBalanceLoading,
  ]);

  // True whenever there is no fresh balance to show — still loading or a fetch
  // error.
  const isBalanceUnavailable = totalFiatFormatted === undefined;

  // Last successfully fetched balance, but only when it still matches the
  // account and currency in view; otherwise it would be misleading.
  const lastKnownTotalFiatFormatted = isPersistedMoneyBalanceUsable(
    lastKnownBalance,
    { address: moneyAccountAddress, currency: currentCurrency },
  )
    ? lastKnownBalance.value
    : undefined;

  const serviceApy = vaultApyQuery.data?.apy;

  // During first load with no cache, do not show fallback to avoid flicker.
  // Show fallback on explicit APY query errors (service outage path) or when
  // a settled query still yields no APY value.
  const shouldUseFallback =
    !vaultApyQuery.isLoading &&
    (vaultApyQuery.isError || serviceApy === undefined);

  // Override always wins when set; otherwise use live service value; then use
  // fallback only when the APY query is settled/error and no live APY exists.
  const apyDecimal =
    vaultApyOverride !== undefined
      ? vaultApyOverride
      : (serviceApy ?? (shouldUseFallback ? vaultApyFallback : undefined));

  const apyPercent =
    apyDecimal !== undefined
      ? new BigNumber(apyDecimal)
          .multipliedBy(100)
          .dp(1, BigNumber.ROUND_HALF_UP)
          .toNumber()
      : undefined;

  const apyPercentFormatted =
    apyPercent !== undefined ? `${apyPercent}%` : undefined;

  return {
    moneyBalanceQuery,
    vaultApyQuery,
    isBalanceLoading,
    isBalanceFetchError,
    isBalanceUnavailable,
    isBalanceDegraded,
    balanceSource,
    usedFallback,
    lastKnownTotalFiatFormatted,
    refetchBalance,
    tokenTotal,
    totalFiatFormatted,
    totalFiatRaw,
    withdrawableFiatFormatted,
    withdrawableFiatRaw,
    withdrawableMusd,
    apyDecimal,
    apyPercent,
    apyPercentFormatted,
  };
};

export default useMoneyAccountBalance;
