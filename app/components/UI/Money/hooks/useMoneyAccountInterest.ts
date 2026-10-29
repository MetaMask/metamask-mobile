import { useCallback, useEffect, useMemo } from 'react';
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
import {
  clearReportedMoneyInterestError,
  reportMoneyInterestError,
} from '../utils/reportMoneyInterestError';
import useMoneyAccountInfo from './useMoneyAccountInfo';

const LAST_30_DAYS_WINDOW: InterestWindow = '30d';
const SINCE_INCEPTION_WINDOW: InterestWindow = 'since_inception';

interface UseMoneyAccountInterestResult {
  last30DaysQuery: UseQueryResult<InterestResponse>;
  sinceInceptionQuery: UseQueryResult<InterestResponse>;
  refetchInterest: () => Promise<void>;
}

interface BaseVaultInterestTarget {
  address: string | undefined;
  vaultAddress: string | undefined;
  isEnabled: boolean;
  interestOptions: Omit<InterestOptions, 'window'> | undefined;
}

/**
 * Address and base-vault coordinates shared by the Money interest queries.
 *
 * @returns The account address, vault address, and query options.
 */
const useBaseVaultInterestTarget = (): BaseVaultInterestTarget => {
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
  const interestOptions = useMemo<Omit<InterestOptions, 'window'> | undefined>(
    () =>
      vaultAddress && chainId !== undefined && Number.isSafeInteger(chainId)
        ? { vaultAddress, chainId }
        : undefined,
    [chainId, vaultAddress],
  );

  return { address, vaultAddress, isEnabled, interestOptions };
};

/**
 * Since-inception interest for the base Money vault.
 *
 * This is the lifetime amount Money Home shows. Pro Hub reads it on its own
 * so opening that screen does not also fetch the 30-day window.
 *
 * @returns The since-inception interest query.
 */
export const useMoneyAccountSinceInceptionInterest =
  (): UseQueryResult<InterestResponse> => {
    const { address, isEnabled, interestOptions } =
      useBaseVaultInterestTarget();

    const sinceInceptionQuery = useQuery({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
        address as string,
        {
          ...interestOptions,
          window: SINCE_INCEPTION_WINDOW,
        },
      ],
      enabled: isEnabled,
    }) as UseQueryResult<InterestResponse>;

    useEffect(() => {
      if (!sinceInceptionQuery.isError) {
        clearReportedMoneyInterestError(SINCE_INCEPTION_WINDOW);
        return;
      }
      reportMoneyInterestError(
        SINCE_INCEPTION_WINDOW,
        sinceInceptionQuery.error,
      );
    }, [sinceInceptionQuery.error, sinceInceptionQuery.isError]);

    return sinceInceptionQuery;
  };

const useMoneyAccountInterest = (): UseMoneyAccountInterestResult => {
  const { address, vaultAddress, isEnabled, interestOptions } =
    useBaseVaultInterestTarget();

  const last30DaysQuery = useQuery({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
      address as string,
      {
        ...interestOptions,
        window: LAST_30_DAYS_WINDOW,
      },
    ],
    enabled: isEnabled,
  }) as UseQueryResult<InterestResponse>;

  useEffect(() => {
    if (!last30DaysQuery.isError) {
      clearReportedMoneyInterestError(LAST_30_DAYS_WINDOW);
      return;
    }
    reportMoneyInterestError(LAST_30_DAYS_WINDOW, last30DaysQuery.error);
  }, [last30DaysQuery.error, last30DaysQuery.isError]);

  const sinceInceptionQuery = useMoneyAccountSinceInceptionInterest();

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
