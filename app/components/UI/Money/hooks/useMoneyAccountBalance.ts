import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../Earn/constants/networks';
import { useMemo } from 'react';
import {
  MoneyAccountBalanceService,
  type Erc20BalanceResponse,
  type MusdEquivalentValueResponse,
  type ExchangeRateResponse,
  VaultApyResponse,
} from '@metamask/money-account-controller';
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

// Placeholder hook to unblock work needing balances.
const useMoneyAccountBalance = () => {
  // TODO: Replace with selector for actual money account.
  const selectedEvmAddress = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  )?.address;

  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const formatFiat = useFiatFormatter();

  // Query Key Factory.
  const queryKeys = useMemo(
    () => ({
      GET_MUSD_BALANCE: [
        `${MoneyAccountBalanceService.name}:getMusdBalance`,
        selectedEvmAddress,
      ],
      GET_MUSDSHFVD_BALANCE: [
        `${MoneyAccountBalanceService.name}:getMusdSHFvdBalance`,
        selectedEvmAddress,
      ],
      GET_EXCHANGE_RATE: [`${MoneyAccountBalanceService.name}:getExchangeRate`],
      GET_VAULT_APY: [`${MoneyAccountBalanceService.name}:getVaultApy`],
      GET_MUSD_EQUIVALENT_VALUE: [
        `${MoneyAccountBalanceService.name}:getMusdEquivalentValue`,
        selectedEvmAddress,
      ],
    }),
    [selectedEvmAddress],
  );

  const [
    musdBalanceResult,
    musdShfvdBalanceResult,
    exchangeRateResult,
    vaultApyResult,
    musdEquivalentBalanceResult,
  ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.GET_MUSD_BALANCE,
        enabled: Boolean(selectedEvmAddress),
      },
      {
        queryKey: queryKeys.GET_MUSDSHFVD_BALANCE,
        enabled: Boolean(selectedEvmAddress),
      },
      { queryKey: queryKeys.GET_EXCHANGE_RATE },
      //   TEMP: Schema validation is failing in core. Keep commented out until new @metamask/money-account-controller preview release is available.
      { queryKey: queryKeys.GET_VAULT_APY },
      {
        queryKey: queryKeys.GET_MUSD_EQUIVALENT_VALUE,
        enabled: Boolean(selectedEvmAddress),
      },
    ],
  }) as [
    UseQueryResult<Erc20BalanceResponse>,
    UseQueryResult<Erc20BalanceResponse>,
    UseQueryResult<ExchangeRateResponse>,
    UseQueryResult<VaultApyResponse>,
    UseQueryResult<MusdEquivalentValueResponse>,
  ];

  // TODO: Review this logic.
  // Compute the per-mUSD fiat rate from Mainnet market data.
  // mUSD is a USD-pegged stablecoin so Mainnet market data is reliable even
  // when the service is temporarily configured against a different chain.
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

    const computedMusdFiat = musdFiatRate
      ? musdDecimal.times(musdFiatRate)
      : undefined;

    const computedMusdSHFvdFiat = musdFiatRate
      ? musdSHFvdDecimal.times(musdFiatRate)
      : undefined;

    return {
      musdFiat: computedMusdFiat,
      musdSHFvdFiat: computedMusdSHFvdFiat,
      tokenTotal: musdDecimal.plus(musdSHFvdDecimal),
      totalFiat:
        computedMusdFiat && computedMusdSHFvdFiat
          ? computedMusdFiat.plus(computedMusdSHFvdFiat)
          : undefined,
    };
  }, [musdBalanceResult.data, musdEquivalentBalanceResult.data, musdFiatRate]);

  const musdFiatFormatted = musdFiat ? formatFiat(musdFiat) : undefined;
  const musdSHFvdFiatFormatted = musdSHFvdFiat
    ? formatFiat(musdSHFvdFiat)
    : undefined;
  const totalFiatFormatted = totalFiat ? formatFiat(totalFiat) : undefined;

  return {
    musdBalanceResult,
    musdShfvdBalanceResult,
    exchangeRateResult,
    vaultApyResult,
    musdEquivalentBalanceResult,
    musdFiatFormatted,
    musdSHFvdFiatFormatted,
    tokenTotal,
    totalFiatFormatted,
  };
};

export default useMoneyAccountBalance;
