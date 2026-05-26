import { useSelector } from 'react-redux';
import { useMemo, useCallback } from 'react';
import {
  type MusdEquivalentValueResponse,
  NormalizedVaultApyResponse,
} from '@metamask/money-account-balance-service';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { fromTokenMinimalUnitString } from '../../../../util/number';
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
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';

const DEFAULT_REFETCH_INTERVAL = 30 * 1000; // 30 seconds

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
  const moneyAccountAddress = useSelector(selectPrimaryMoneyAccount)?.address;

  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const [musdBalanceQuery, vaultApyQuery, musdEquivalentBalanceQuery] =
    useQueries({
      queries: [
        {
          queryKey: [
            MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE,
            moneyAccountAddress,
          ],
          enabled: Boolean(moneyAccountAddress),
          refetchInterval,
        },
        {
          queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY],
        },
        {
          queryKey: [
            MoneyAccountBalanceServiceQueryKeys.GET_MUSD_EQUIVALENT_VALUE,
            moneyAccountAddress,
          ],
          enabled: Boolean(moneyAccountAddress),
          refetchInterval,
        },
      ],
    }) as [
      UseQueryResult<{ balance: string }>,
      UseQueryResult<NormalizedVaultApyResponse>,
      UseQueryResult<MusdEquivalentValueResponse>,
    ];

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
   * True while any query that feeds into the aggregated balance is still fetching.
   * isLoading is only true when there is no cached data even if it's stale.
   */
  const isAggregatedBalanceLoading = useMemo(
    () => musdBalanceQuery.isLoading || musdEquivalentBalanceQuery.isLoading,
    [musdBalanceQuery.isLoading, musdEquivalentBalanceQuery.isLoading],
  );

  /** True when either balance query has errored. Any failure → full error state. */
  const isBalanceFetchError = useMemo(
    () => musdBalanceQuery.isError || musdEquivalentBalanceQuery.isError,
    [musdBalanceQuery.isError, musdEquivalentBalanceQuery.isError],
  );

  /**
   * True while a user-initiated refetch is in flight (has isError + isFetching).
   * Distinguishes retry-in-flight (show skeleton) from auto-refetch (has cache,
   * update silently).
   */
  const isBalanceFetching = useMemo(
    () => musdBalanceQuery.isFetching || musdEquivalentBalanceQuery.isFetching,
    [musdBalanceQuery.isFetching, musdEquivalentBalanceQuery.isFetching],
  );

  const refetchBalance = useCallback(
    () =>
      Promise.all([
        musdBalanceQuery.refetch(),
        musdEquivalentBalanceQuery.refetch(),
      ]),
    [musdBalanceQuery, musdEquivalentBalanceQuery],
  );

  const { musdFiat, musdSHFvdFiat, tokenTotal, totalFiat, withdrawableMusd } =
    useMemo(() => {
      // mUSD balance: raw uint256 (6 decimals) → decimal BigNumber
      const musdDecimal = musdBalanceQuery.data?.balance
        ? new BigNumber(
            fromTokenMinimalUnitString(
              musdBalanceQuery.data.balance,
              MUSD_DECIMALS,
            ),
          )
        : new BigNumber(0);

      // musdSHFvd balance expressed in mUSD.
      const musdSHFvdDecimal = musdEquivalentBalanceQuery.data
        ?.balanceOfInAssets
        ? new BigNumber(
            fromTokenMinimalUnitString(
              musdEquivalentBalanceQuery.data.balanceOfInAssets,
              MUSD_DECIMALS,
            ),
          )
        : new BigNumber(0);

      // vmUSD shares expressed in mUSD via the vault rate — this is the withdrawable amount.
      // Undefined while loading or on error so callers can distinguish from a genuine zero.
      const computedWithdrawableMusd =
        isAggregatedBalanceLoading || isBalanceFetchError
          ? undefined
          : musdSHFvdDecimal;

      if (!musdFiatRate) {
        return {
          musdFiat: undefined,
          musdSHFvdFiat: undefined,
          // Undefined during loading or error so callers can distinguish from a genuine zero.
          tokenTotal:
            isAggregatedBalanceLoading || isBalanceFetchError
              ? undefined
              : musdDecimal.plus(musdSHFvdDecimal),
          totalFiat: undefined,
          withdrawableMusd: computedWithdrawableMusd,
        };
      }

      const computedMusdFiat = musdDecimal.times(musdFiatRate);
      const computedMusdSHFvdFiat = musdSHFvdDecimal.times(musdFiatRate);

      return {
        musdFiat: computedMusdFiat,
        musdSHFvdFiat: computedMusdSHFvdFiat,
        // Undefined during loading or error so callers can distinguish from a genuine zero.
        tokenTotal:
          isAggregatedBalanceLoading || isBalanceFetchError
            ? undefined
            : musdDecimal.plus(musdSHFvdDecimal),
        // Both fiat values share musdFiatRate as their sole dependency — computing
        // them inside this guard means no null assertions are needed.
        totalFiat: isBalanceFetchError
          ? undefined
          : computedMusdFiat.plus(computedMusdSHFvdFiat),
        withdrawableMusd: computedWithdrawableMusd,
      };
    }, [
      isAggregatedBalanceLoading,
      isBalanceFetchError,
      musdBalanceQuery.data,
      musdEquivalentBalanceQuery.data,
      musdFiatRate,
    ]);

  const musdFiatFormatted =
    !isBalanceFetchError && musdFiat
      ? moneyFormatFiat(musdFiat, currentCurrency)
      : undefined;
  const musdSHFvdFiatFormatted =
    !isBalanceFetchError && musdSHFvdFiat
      ? moneyFormatFiat(musdSHFvdFiat, currentCurrency)
      : undefined;
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
    musdBalanceQuery,
    vaultApyQuery,
    musdEquivalentBalanceQuery,
    isAggregatedBalanceLoading,
    isBalanceFetchError,
    isBalanceFetching,
    refetchBalance,
    musdFiatFormatted,
    musdSHFvdFiatFormatted,
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
