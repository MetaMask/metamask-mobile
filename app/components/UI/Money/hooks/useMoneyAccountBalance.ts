import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useMemo, useCallback } from 'react';
import type { PositionResponse } from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import type { UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { moneyFormatUsd } from '../utils/moneyFormatFiat';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { MUSD_DECIMALS } from '../../Earn/constants/musd';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
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

/**
 * Extended position response that includes the top-level `balance` object.
 * The API will return raw uint256 strings in smallest units (6-decimal mUSD).
 *
 * TODO: Remove once the package type includes the `balance` field
 * (pending va-mmcx-money-account-api PR #25).
 */
type PositionResponseWithBalance = PositionResponse & {
  balance?: {
    musd_balance: string;
    total_balance: string;
    vmusd_value_in_musd: string;
  };
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

interface UseMoneyAccountBalanceResult {
  positionsQuery: UseQueryResult<PositionResponseWithBalance>;
  isBalanceLoading: boolean;
  isBalanceFetchError: boolean;
  isBalanceFetching: boolean;
  isBalanceUnavailable: boolean;
  lastKnownTotalFiatFormatted: string | undefined;
  refetchBalance: () => void;
  /** Total balance (mUSD + vmUSD valued in mUSD) */
  tokenTotal: BigNumber | undefined;
  /** Bare mUSD balance not deposited into the vault */
  musdBalance: BigNumber | undefined;
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

  // Single query replaces both balance + APY queries — the API returns
  // positions with balance data, APY, and exchange rate all in one call.
  const positionsQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
      moneyAccountAddress as string,
    ],
    enabled: Boolean(moneyAccountAddress),
    refetchInterval,
  }) as UseQueryResult<PositionResponseWithBalance>;

  const isBalanceLoading = positionsQuery.isLoading;
  const isBalanceFetchError = positionsQuery.isError;
  const isBalanceFetching = positionsQuery.isFetching;

  const refetchBalance = useCallback(
    () =>
      ReactQueryService.queryClient.invalidateQueries({
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
          moneyAccountAddress,
        ],
        refetchType: 'all',
      }),
    [moneyAccountAddress],
  );

  const {
    tokenTotal,
    musdBalance,
    totalFiat,
    withdrawableFiat,
    withdrawableMusd,
  } = useMemo(() => {
    if (isBalanceLoading || isBalanceFetchError) {
      return {
        tokenTotal: undefined,
        musdBalance: undefined,
        totalFiat: undefined,
        withdrawableFiat: undefined,
        withdrawableMusd: undefined,
      };
    }

    const { balance, positions } = positionsQuery.data ?? {};

    if (balance) {
      // `balance` values are raw uint256 strings in smallest units (6-decimal mUSD).
      const totalBalanceMusd = new BigNumber(balance.total_balance).shiftedBy(
        -MUSD_DECIMALS,
      );
      const vmusdValueInMusd = new BigNumber(
        balance.vmusd_value_in_musd,
      ).shiftedBy(-MUSD_DECIMALS);
      const bareMusd = new BigNumber(balance.musd_balance).shiftedBy(
        -MUSD_DECIMALS,
      );

      return {
        tokenTotal: totalBalanceMusd,
        musdBalance: bareMusd,
        totalFiat: totalBalanceMusd,
        withdrawableFiat: vmusdValueInMusd,
        withdrawableMusd: vmusdValueInMusd,
      };
    }

    // Fallback: derive from positions when `balance` field is not yet available.
    // Positions only cover vmUSD; bare mUSD is unknown without the balance field.
    const totalUsd =
      positions?.reduce(
        (sum, pos) => sum.plus(new BigNumber(pos.current_value_usd)),
        new BigNumber(0),
      ) ?? new BigNumber(0);

    const totalAssets =
      positions?.reduce(
        (sum, pos) => sum.plus(new BigNumber(pos.current_value_assets)),
        new BigNumber(0),
      ) ?? new BigNumber(0);

    return {
      tokenTotal: totalAssets,
      musdBalance: undefined,
      totalFiat: totalUsd,
      withdrawableFiat: totalAssets,
      withdrawableMusd: totalAssets,
    };
  }, [isBalanceLoading, isBalanceFetchError, positionsQuery.data]);

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

  const isBalanceUnavailable = totalFiatFormatted === undefined;

  const lastKnownTotalFiatFormatted = isPersistedMoneyBalanceUsable(
    lastKnownBalance,
    { address: moneyAccountAddress, currency: currentCurrency },
  )
    ? lastKnownBalance.value
    : undefined;

  // APY is now derived from the positions response — each vault position
  // includes `current_apy` as a decimal string (e.g. "0.045" = 4.5%).
  const firstPosition = positionsQuery.data?.positions?.[0];
  const serviceApy = firstPosition
    ? Number(firstPosition.current_apy)
    : undefined;

  const shouldUseFallback =
    !positionsQuery.isLoading &&
    (positionsQuery.isError || serviceApy === undefined);

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
    positionsQuery,
    isBalanceLoading,
    isBalanceFetchError,
    isBalanceFetching,
    isBalanceUnavailable,
    lastKnownTotalFiatFormatted,
    refetchBalance,
    tokenTotal,
    musdBalance,
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
