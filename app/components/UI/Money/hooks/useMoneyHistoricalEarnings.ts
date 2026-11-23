import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyInterestHistory } from '../services/moneyInterestHistory';
import type { InterestHistoryResponse } from '../types/moneyInterestHistory';

export interface UseMoneyHistoricalEarningsOptions {
  enabled?: boolean;
}

/**
 * Fetches historical earnings for the primary Money account.
 *
 * @returns The TanStack Query result for historical earnings.
 */
export const useMoneyHistoricalEarnings = ({
  enabled = true,
}: UseMoneyHistoricalEarningsOptions = {}): UseQueryResult<InterestHistoryResponse> => {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  // const normalizedAddress = primaryMoneyAccount?.address?.toLowerCase();
  const normalizedAddress = '0x0A5360656589BC9272F9aA1FF773255052D6D068';
  const configuredChainId = vaultConfig?.chainId;
  const chainId =
    configuredChainId === undefined ? undefined : Number(configuredChainId);
  const isValidChainId = chainId !== undefined && Number.isSafeInteger(chainId);
  const isEnabled = enabled && Boolean(normalizedAddress && isValidChainId);

  return useQuery({
    queryKey: [
      MoneyQueryKeys.FETCH_INTEREST_HISTORY,
      normalizedAddress,
      chainId,
    ],
    queryFn: async () => {
      if (!normalizedAddress || !isValidChainId || chainId === undefined) {
        throw new Error(
          'Cannot fetch Money historical earnings without an account address and valid chain ID',
        );
      }

      return await fetchMoneyInterestHistory(normalizedAddress, chainId);
    },
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    enabled: isEnabled,
  });
};

export default useMoneyHistoricalEarnings;
