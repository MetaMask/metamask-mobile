import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../Earn/constants/networks';
import { useMemo } from 'react';
import { MoneyAccountBalanceService } from '@metamask/money-account-controller';
import { useQueries } from '@tanstack/react-query';

const useMoneyAccountBalance = () => {
  // TODO: Replace with selector for actual money account.
  const selectedEvmAddress = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  )?.address;

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
    // vaultApyResult,
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
      //   { queryKey: queryKeys.GET_VAULT_APY },
      {
        queryKey: queryKeys.GET_MUSD_EQUIVALENT_VALUE,
        enabled: Boolean(selectedEvmAddress),
        cacheTime: 1000,
      },
    ],
  });

  return {
    musdBalanceResult,
    musdShfvdBalanceResult,
    exchangeRateResult,
    // vaultApyResult,
    musdEquivalentBalanceResult,
  };
};

export default useMoneyAccountBalance;
