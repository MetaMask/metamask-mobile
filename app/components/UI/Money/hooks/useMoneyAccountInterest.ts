import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { UseQueryResult } from '@tanstack/react-query';
import type {
  InterestOptions,
  InterestResponse,
  InterestWindow,
} from '@metamask/money-account-api-data-service';
import { useQuery } from '@metamask/react-data-query';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import useMoneyAccountInfo from './useMoneyAccountInfo';

const LAST_30_DAYS_WINDOW: InterestWindow = '30d';
const SINCE_INCEPTION_WINDOW: InterestWindow = 'since_inception';

interface UseMoneyAccountInterestResult {
  last30DaysQuery: UseQueryResult<InterestResponse>;
  sinceInceptionQuery: UseQueryResult<InterestResponse>;
  refetchInterest: () => Promise<void>;
}

const useMoneyAccountInterest = (): UseMoneyAccountInterestResult => {
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const address = primaryMoneyAccount?.address;
  const vaultAddress = vaultConfig?.boringVault;
  const chainId = vaultConfig ? Number(vaultConfig.chainId) : undefined;
  const isEnabled = Boolean(
    address &&
      vaultAddress &&
      chainId !== undefined &&
      Number.isSafeInteger(chainId),
  );

  const commonOptions = useMemo<Omit<InterestOptions, 'window'> | undefined>(
    () =>
      vaultAddress && chainId !== undefined && Number.isSafeInteger(chainId)
        ? { vaultAddress, chainId }
        : undefined,
    [chainId, vaultAddress],
  );

  const last30DaysQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
      address as string,
      {
        ...commonOptions,
        window: LAST_30_DAYS_WINDOW,
      },
    ],
    enabled: isEnabled,
  }) as UseQueryResult<InterestResponse>;

  const sinceInceptionQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
      address as string,
      {
        ...commonOptions,
        window: SINCE_INCEPTION_WINDOW,
      },
    ],
    enabled: isEnabled,
  }) as UseQueryResult<InterestResponse>;

  const refetchInterest = useCallback(async () => {
    if (!isEnabled || !address || !vaultAddress) {
      return;
    }

    await Engine.controllerMessenger.call(
      'MoneyAccountApiDataService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
          address.toLowerCase(),
          vaultAddress.toLowerCase(),
        ],
      },
    );

    await ReactQueryService.queryClient.invalidateQueries({
      queryKey: [MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST, address],
      refetchType: 'all',
    });
  }, [address, isEnabled, vaultAddress]);

  return {
    last30DaysQuery,
    sinceInceptionQuery,
    refetchInterest,
  };
};

export default useMoneyAccountInterest;
