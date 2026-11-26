import type { VaultApyHistoryResponse } from '../types/moneyHistoricalVaultApys';
import { fetchMoneyAccountApi } from './moneyAccountApi';

/**
 * Fetches historical APYs for a Money vault.
 *
 * @param vaultAddress - The Money vault address.
 * @param chainId - The chain containing the Money vault.
 * @returns The vault APY history response.
 */
// TODO: Replace with a money-account-api-data-service messenger call when core is updated.
export const fetchMoneyHistoricalVaultApys = async (
  vaultAddress: string,
  chainId: number,
): Promise<VaultApyHistoryResponse> => {
  const normalizedAddress = vaultAddress.toLowerCase();
  return await fetchMoneyAccountApi<VaultApyHistoryResponse>(
    '/v1/vaults/apy-history',
    { chain_id: chainId, vault_address: normalizedAddress },
    'vault APY history',
    { includeStatus: true },
  );
};
