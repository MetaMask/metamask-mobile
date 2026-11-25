import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyHistoricalVaultApys } from '../services/moneyHistoricalVaultApys';
import type { VaultApyHistoryResponse } from '../types/moneyHistoricalVaultApys';

const HISTORICAL_VAULT_APYS_STALE_TIME = 15 * 60 * 1000; // 15 minutes

export interface UseHistoricalVaultApysOptions {
  enabled?: boolean;
}

/**
 * Fetches historical APYs for the configured Money vault.
 *
 * @param options - Optional query enablement.
 * @returns The TanStack Query result for vault APY history.
 */
export const useHistoricalVaultApys = ({
  enabled = true,
}: UseHistoricalVaultApysOptions = {}): UseQueryResult<VaultApyHistoryResponse> => {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const normalizedVaultAddress = vaultConfig?.boringVault?.toLowerCase();
  const configuredChainId = vaultConfig?.chainId;
  const chainId =
    configuredChainId === undefined ? undefined : Number(configuredChainId);
  const isValidChainId = chainId !== undefined && Number.isSafeInteger(chainId);
  const isEnabled =
    enabled && Boolean(normalizedVaultAddress && isValidChainId);

  return useQuery({
    queryKey: [
      MoneyQueryKeys.FETCH_VAULT_APY_HISTORY,
      normalizedVaultAddress,
      chainId,
    ],
    queryFn: async () => {
      if (!normalizedVaultAddress || !isValidChainId || chainId === undefined) {
        throw new Error(
          'Cannot fetch Money historical vault APYs without a vault address and valid chain ID',
        );
      }

      return await fetchMoneyHistoricalVaultApys(
        normalizedVaultAddress,
        chainId,
      );
    },
    staleTime: HISTORICAL_VAULT_APYS_STALE_TIME,
    enabled: isEnabled,
  });
};
