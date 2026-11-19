import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyVaultComposition } from '../services/moneyVaultComposition';
import type { VaultCompositionResponse } from '../types/moneyVaultComposition';

const VAULT_COMPOSITION_STALE_TIME = 15 * 60 * 1000; // 15 minutes

export interface UseMoneyVaultCompositionOptions {
  vaultType: VaultCompositionResponse['vault_key'];
  enabled?: boolean;
}

/**
 * Fetches the latest published composition snapshot for a Money vault.
 *
 * @param options - Vault variant and optional query enablement.
 * @returns The TanStack Query result for vault composition.
 */
export const useMoneyVaultComposition = ({
  vaultType,
  enabled = true,
}: UseMoneyVaultCompositionOptions): UseQueryResult<VaultCompositionResponse> => {
  const standardVaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const premiumVaultConfig = useSelector(selectMoneyAccountPremiumVaultConfig);
  const vaultConfig =
    vaultType === 'premium' ? premiumVaultConfig : standardVaultConfig;
  const boringVault = vaultConfig?.boringVault;
  const normalizedBoringVault =
    typeof boringVault === 'string' && boringVault.length > 0
      ? boringVault.toLowerCase()
      : undefined;
  const configuredChainId = vaultConfig?.chainId;
  const chainId =
    typeof configuredChainId === 'string'
      ? Number(configuredChainId)
      : undefined;
  const isValidChainId = chainId !== undefined && Number.isSafeInteger(chainId);
  const hasValidConfig = Boolean(
    normalizedBoringVault && isValidChainId && chainId !== undefined,
  );

  return useQuery({
    queryKey: [
      MoneyQueryKeys.FETCH_VAULT_COMPOSITION,
      vaultType,
      normalizedBoringVault,
      chainId,
    ],
    queryFn: async () => {
      if (!normalizedBoringVault || !isValidChainId || chainId === undefined) {
        throw new Error(
          'Cannot fetch Money vault composition without a vault address and valid chain ID',
        );
      }

      return await fetchMoneyVaultComposition(normalizedBoringVault, chainId);
    },
    staleTime: VAULT_COMPOSITION_STALE_TIME,
    enabled: enabled && hasValidConfig,
  });
};
