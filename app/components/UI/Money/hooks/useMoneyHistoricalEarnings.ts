/* eslint-disable @typescript-eslint/naming-convention */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ApiEnv, getApiEnv } from '../../../../core/apiEnv';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';

const MONEY_ACCOUNT_API_URL_BY_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://money.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://money.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://money.api.cx.metamask.io',
};

export interface InterestHistoryEntry {
  timestamp: string;
  interest_earned_usd: string;
}

export interface InterestHistoryResponse {
  address: string;
  chain_id: number;
  history: InterestHistoryEntry[];
}

const getMoneyAccountApiBaseUrl = (): string =>
  MONEY_ACCOUNT_API_URL_BY_ENV[getApiEnv()];

/**
 * Temporary local fetcher for the historical interest endpoint.
 *
 * TODO: Replace with a MoneyAccountApiDataService call once
 * `money-account-api` supports `/interest-history`.
 *
 * @param address - The primary Money account address.
 * @param chainId - The Money vault chain ID.
 * @returns The historical interest response.
 */
export const fetchInterestHistory = async (
  address: string,
  chainId: number,
): Promise<InterestHistoryResponse> => {
  const normalizedAddress = address.toLowerCase();
  const url = new URL(
    `/v1/positions/${normalizedAddress}/interest-history`,
    getMoneyAccountApiBaseUrl(),
  );
  url.searchParams.set('chain_id', String(chainId));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Money Account API interest history request failed with status '${response.status}'`,
    );
  }

  return (await response.json()) as InterestHistoryResponse;
};

/**
 * Fetches historical earnings for the primary Money account.
 *
 * @returns The TanStack Query result for historical earnings.
 */
export const useMoneyHistoricalEarnings =
  (): UseQueryResult<InterestHistoryResponse> => {
    const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
    const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
    const normalizedAddress = primaryMoneyAccount?.address?.toLowerCase();
    const configuredChainId = vaultConfig?.chainId;
    const chainId =
      configuredChainId === undefined ? undefined : Number(configuredChainId);
    const isValidChainId =
      chainId !== undefined && Number.isSafeInteger(chainId);
    const isEnabled = Boolean(normalizedAddress && isValidChainId);

    return useQuery({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST_HISTORY,
        normalizedAddress,
        chainId,
      ],
      queryFn: async () => {
        if (!normalizedAddress || !isValidChainId || chainId === undefined) {
          throw new Error(
            'Cannot fetch Money historical earnings without an account address and valid chain ID',
          );
        }

        return await fetchInterestHistory(normalizedAddress, chainId);
      },
      enabled: isEnabled,
    });
  };

export default useMoneyHistoricalEarnings;
