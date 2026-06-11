import { useSelector } from 'react-redux';
import { useMemo, useCallback } from 'react';
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

const DEFAULT_REFETCH_INTERVAL = 30 * 1000; // 30 seconds
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// TODO: Remove __DEV__ values before launch. This is temporary to circumvent the Vault's current 0% APY.
const DEV_APY = {
  decimal: 0.04,
  percent: 4,
  percentFormatted: '4%',
};

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
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const moneyAccountAddress = primaryMoneyAccount?.address;

  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentCurrency = useSelector(selectCurrentCurrency);

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
      return {
        tokenTotal: computedTokenTotal,
        totalFiat: undefined,
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

  const rawApy = vaultApyQuery.data?.apy;

  const apyDecimal = rawApy;
  const apyPercent = rawApy !== undefined ? rawApy * 100 : undefined;
  const apyPercentFormatted =
    apyPercent !== undefined ? `${apyPercent}%` : undefined;

  return {
    moneyBalanceQuery,
    vaultApyQuery,
    isBalanceLoading,
    isBalanceFetchError,
    isBalanceFetching,
    refetchBalance,
    tokenTotal,
    totalFiatFormatted,
    totalFiatRaw,
    withdrawableMusd,
    // TODO: Remove __DEV__ values before launch. This is temporary to circumvent the Vault's current 0% APY.
    apyDecimal: __DEV__ ? DEV_APY.decimal : apyDecimal,
    apyPercent: __DEV__ ? DEV_APY.percent : apyPercent,
    apyPercentFormatted: __DEV__
      ? DEV_APY.percentFormatted
      : apyPercentFormatted,
  };
};

export default useMoneyAccountBalance;
