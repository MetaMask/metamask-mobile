import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../Earn/constants/networks';
import { useMemo } from 'react';
import {
  type MusdEquivalentValueResponse,
  NormalizedVaultApyResponse,
} from '@metamask/money-account-balance-service';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import useFiatFormatter from '../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_DECIMALS,
} from '../../Earn/constants/musd';
import { fromTokenMinimalUnitString } from '../../../../util/number';
import { toChecksumAddress } from '../../../../util/address';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';

const DEFAULT_REFETCH_INTERVAL = 30 * 1000; // 30 seconds

const useMoneyAccountBalance = (
  refetchInterval: number = DEFAULT_REFETCH_INTERVAL,
) => {
  // TODO: Replace with selector for actual money account.
  const selectedEvmAddress = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  )?.address;

  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const formatFiat = useFiatFormatter();

  const [musdBalanceResult, vaultApyResult, musdEquivalentBalanceResult] =
    useQueries({
      queries: [
        {
          queryKey: [
            MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE,
            selectedEvmAddress,
          ],
          enabled: Boolean(selectedEvmAddress),
          refetchInterval,
        },
        {
          queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY],
        },
        {
          queryKey: [
            MoneyAccountBalanceServiceQueryKeys.GET_MUSD_EQUIVALENT_VALUE,
            selectedEvmAddress,
          ],
          enabled: Boolean(selectedEvmAddress),
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
    () => musdBalanceResult.isLoading || musdEquivalentBalanceResult.isLoading,
    [musdBalanceResult.isLoading, musdEquivalentBalanceResult.isLoading],
  );

  const { musdFiat, musdSHFvdFiat, tokenTotal, totalFiat } = useMemo(() => {
    // mUSD balance: raw uint256 (6 decimals) → decimal BigNumber
    const musdDecimal = musdBalanceResult.data?.balance
      ? new BigNumber(
          fromTokenMinimalUnitString(
            musdBalanceResult.data.balance,
            MUSD_DECIMALS,
          ),
        )
      : new BigNumber(0);

    // musdSHFvd balance expressed in mUSD: pre-computed by the service as
    // musdSHFvdBalance * exchangeRate / 10^6, returned as a raw uint256 string.
    const musdSHFvdDecimal = musdEquivalentBalanceResult.data
      ?.musdEquivalentValue
      ? new BigNumber(
          fromTokenMinimalUnitString(
            musdEquivalentBalanceResult.data.musdEquivalentValue,
            MUSD_DECIMALS,
          ),
        )
      : new BigNumber(0);

    if (!musdFiatRate) {
      return {
        musdFiat: undefined,
        musdSHFvdFiat: undefined,
        // Undefined during loading so callers can distinguish "loading" from a genuine zero balance.
        tokenTotal: isAggregatedBalanceLoading
          ? undefined
          : musdDecimal.plus(musdSHFvdDecimal),
        totalFiat: undefined,
      };
    }

    const computedMusdFiat = musdDecimal.times(musdFiatRate);
    const computedMusdSHFvdFiat = musdSHFvdDecimal.times(musdFiatRate);

    return {
      musdFiat: computedMusdFiat,
      musdSHFvdFiat: computedMusdSHFvdFiat,
      // Undefined during loading so callers can distinguish "loading" from a genuine zero balance.
      tokenTotal: isAggregatedBalanceLoading
        ? undefined
        : musdDecimal.plus(musdSHFvdDecimal),
      // Both fiat values share musdFiatRate as their sole dependency — computing
      // them inside this guard means no null assertions are needed.
      totalFiat: computedMusdFiat.plus(computedMusdSHFvdFiat),
    };
  }, [
    isAggregatedBalanceLoading,
    musdBalanceResult.data,
    musdEquivalentBalanceResult.data,
    musdFiatRate,
  ]);

  const musdFiatFormatted = musdFiat ? formatFiat(musdFiat) : undefined;
  const musdSHFvdFiatFormatted = musdSHFvdFiat
    ? formatFiat(musdSHFvdFiat)
    : undefined;
  const totalFiatFormatted = totalFiat ? formatFiat(totalFiat) : undefined;
  const totalFiatRaw = totalFiat ? totalFiat.toString() : undefined;

  return {
    musdBalanceResult,
    vaultApyResult,
    musdEquivalentBalanceResult,
    isAggregatedBalanceLoading,
    musdFiatFormatted,
    musdSHFvdFiatFormatted,
    tokenTotal,
    totalFiatFormatted,
    totalFiatRaw,
  };
};

export default useMoneyAccountBalance;
