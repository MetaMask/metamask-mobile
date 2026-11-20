import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyVaultComposition } from '../services/moneyVaultComposition';
import type { VaultCompositionResponse } from '../types/moneyVaultComposition';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';

const VAULT_COMPOSITION_STALE_TIME = 15 * 60 * 1000; // 15 minutes
// TODO: Remove after testing.
const DEBUG_VAULT_ADDRESS = '0x1c8a336051d2024e318a229d01f9f6cf96efd316';

export interface UseMoneyVaultCompositionOptions {
  enabled?: boolean;
}

/**
 * Fetches the latest published composition snapshot for a Money vault.
 *
 * @param options - Vault variant and optional query enablement.
 * @returns The TanStack Query result for vault composition.
 */
// TODO: Add support for premium vault.
export const useMoneyVaultComposition = ({
  enabled = true,
}: UseMoneyVaultCompositionOptions = {}): UseQueryResult<VaultCompositionResponse> => {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  // const vaultAddress = vaultConfig?.boringVault;
  const vaultAddress = DEBUG_VAULT_ADDRESS;
  const chainId = vaultConfig?.chainId;

  const hasValidConfig = Boolean(vaultAddress && chainId);

  return useQuery({
    queryKey: [MoneyQueryKeys.FETCH_VAULT_COMPOSITION, vaultAddress, chainId],
    queryFn: async () => {
      if (!vaultAddress || !chainId) {
        throw new Error(
          'Cannot fetch Money vault composition without a vault address and valid chain ID',
        );
      }

      return await fetchMoneyVaultComposition(
        vaultAddress,
        parseInt(chainId, 16),
      );
    },
    staleTime: VAULT_COMPOSITION_STALE_TIME,
    enabled: enabled && hasValidConfig,
  });
};
