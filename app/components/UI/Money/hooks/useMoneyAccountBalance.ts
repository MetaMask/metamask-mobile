import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useMemo, useCallback } from 'react';
import {
  type MoneyAccountBalanceResponse,
  type NormalizedVaultApyResponse,
} from '@metamask/money-account-balance-service';
import { useQuery } from '@metamask/react-data-query';
import type { UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { moneyFormatFiat } from '../utils/moneyFormatFiat';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_DECIMALS,
} from '../../Earn/constants/musd';
import { toChecksumAddress } from '../../../../util/address';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
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

const useMoneyAccountBalance = (
  refetchInterval: number = DEFAULT_REFETCH_INTERVAL,
) => {
  const dispatch = useDispatch();
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const moneyAccountAddress = primaryMoneyAccount?.address;

  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const lastKnownBalance = useSelector(selectLastKnownMoneyBalance);
  const { vaultApyFallback, vaultApyOverride } = useSelector(
    selectMoneyVaultApyRemoteConfig,
  );

  const moneyBalanceQuery = useQuery({
    queryKey: [
      MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
      moneyAccountAddress as string,
    ],
    enabled: Boolean(moneyAccountAddress),
    refetchInterval,
  }) as UseQueryResult<MoneyAccountBalanceResponse>;

  const vaultApyQuery = useQuery({
    queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY],
    refetchInterval: FIVE_MINUTES_MS,
  }) as UseQueryResult<NormalizedVaultApyResponse>;

  const musdFiatRate = useMemo(() => {
    const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];
    if (!musdAddress) return undefined;

    const checksumAddress = toChecksumAddress(musdAddress);
    const chainConfig = networkConfigurations?.[CHAIN_IDS.MAINNET];
    const nativeCurrency = chainConfig?.nativeCurrency;
    const conversionRate = nativeCurrency
      ? currencyRates?.[nativeCurrency]?.conversionRate
      : undefined;

    const priceInNativeCurrency =
      tokenMarketData?.[CHAIN_IDS.MAINNET]?.[checksumAddress]?.price ??
      tokenMarketData?.[CHAIN_IDS.MAINNET]?.[musdAddress]?.price;

    if (!conversionRate || priceInNativeCurrency === undefined)
      return undefined;

    return new BigNumber(priceInNativeCurrency).times(conversionRate);
  }, [tokenMarketData, currencyRates, networkConfigurations]);

  /**
   * True while the balance query is loading with no cached data (even if stale).
   */
  const isBalanceLoading = moneyBalanceQuery.isLoading;

  /** Any balance fetch failure → full error state. */
  const isBalanceFetchError = moneyBalanceQuery.isError;

  /**
   * True while a refetch is in flight. Combined with isError, lets callers
   * distinguish retry-in-flight (show skeleton) from silent auto-refetch.
   */
  const isBalanceFetching = moneyBalanceQuery.isFetching;

  const refetchBalance = useCallback(
    () =>
      ReactQueryService.queryClient.invalidateQueries({
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
          moneyAccountAddress,
        ],
        refetchType: 'all',
      }),
    [moneyAccountAddress],
  );

  const { tokenTotal, totalFiat, withdrawableMusd } = useMemo(() => {
    // Total balance (mUSD + vmUSD) from the service's Multicall3 response.
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

    if (!musdFiatRate) {
      // Undefined during loading or error so callers can distinguish from a genuine zero.
      const settledTokenTotal =
        isBalanceLoading || isBalanceFetchError ? undefined : totalDecimal;

      return {
        musdFiat: undefined,
        musdSHFvdFiat: undefined,
        tokenTotal: settledTokenTotal,
        // A zero balance is $0.00 regardless of the missing rate — 0 tokens
        // convert to 0 fiat without one. Only a non-zero balance is genuinely
        // unavailable when there's no rate to convert it.
        totalFiat: settledTokenTotal?.isZero() ? new BigNumber(0) : undefined,
        withdrawableMusd: computedWithdrawableMusd,
      };
    }

    return {
      tokenTotal: computedTokenTotal,
      totalFiat: isBalanceFetchError
        ? undefined
        : totalDecimal.times(musdFiatRate),
      withdrawableMusd: computedWithdrawableMusd,
    };
  }, [
    isBalanceLoading,
    isBalanceFetchError,
    moneyBalanceQuery.data,
    musdFiatRate,
  ]);

  const totalFiatFormatted =
    !isBalanceFetchError && totalFiat
      ? moneyFormatFiat(totalFiat, currentCurrency)
      : undefined;

  const totalFiatRaw =
    !isBalanceFetchError && totalFiat ? totalFiat.toString() : undefined;

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

  // True whenever there is no fresh balance to show — still loading, a fetch
  // error, or a missing formatting dependency (e.g. rate not ready).
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

  const apyPercent = apyDecimal !== undefined ? apyDecimal * 100 : undefined;
  const apyPercentFormatted =
    apyPercent !== undefined ? `${apyPercent}%` : undefined;

  return {
    moneyBalanceQuery,
    vaultApyQuery,
    isBalanceLoading,
    isBalanceFetchError,
    isBalanceFetching,
    isBalanceUnavailable,
    lastKnownTotalFiatFormatted,
    refetchBalance,
    tokenTotal,
    totalFiatFormatted,
    totalFiatRaw,
    withdrawableMusd,
    apyDecimal,
    apyPercent,
    apyPercentFormatted,
  };
};

export default useMoneyAccountBalance;
