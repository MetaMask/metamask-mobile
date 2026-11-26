import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyVaultComposition } from '../services/moneyVaultComposition';
import type { VaultCompositionResponse } from '../types/moneyVaultComposition';
import { getMoneyVaultChainId } from '../utils/getMoneyVaultChainId';

const VAULT_COMPOSITION_STALE_TIME = 15 * 60 * 1000; // 15 minutes

export interface UseMoneyVaultCompositionOptions {
  enabled?: boolean;
}

/**
 * Fetches the latest published composition snapshot for a Money vault.
 *
 * @param options - Vault variant and optional query enablement.
 * @returns The TanStack Query result for vault composition.
 */
export const useMoneyVaultComposition = ({
  enabled = true,
}: UseMoneyVaultCompositionOptions = {}): UseQueryResult<VaultCompositionResponse> => {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const normalizedVaultAddress = vaultConfig?.boringVault?.toLowerCase();
  const chainId = getMoneyVaultChainId(vaultConfig);
  const hasValidConfig = Boolean(
    normalizedVaultAddress && chainId !== undefined,
  );

  return useQuery({
    queryKey: [
      MoneyQueryKeys.FETCH_VAULT_COMPOSITION,
      normalizedVaultAddress,
      chainId,
    ],
    queryFn: async () => {
      if (!normalizedVaultAddress || chainId === undefined) {
        throw new Error(
          'Cannot fetch Money vault composition without a vault address and valid chain ID',
        );
      }

      return await fetchMoneyVaultComposition(normalizedVaultAddress, chainId);
    },
    staleTime: VAULT_COMPOSITION_STALE_TIME,
    enabled: enabled && hasValidConfig,
  });
};
