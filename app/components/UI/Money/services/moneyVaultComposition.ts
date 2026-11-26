import type { VaultCompositionResponse } from '../types/moneyVaultComposition';
import { fetchMoneyAccountApi } from './moneyAccountApi';

/**
 * Fetches the latest published composition snapshot for a Money vault.
 *
 * @param address - The Money vault address.
 * @param chainId - The chain containing the Money vault.
 * @returns The vault composition response.
 */
// TODO: Replace with money-account-api-data-service call when core is updated
export const fetchMoneyVaultComposition = async (
  address: string,
  chainId: number,
): Promise<VaultCompositionResponse> => {
  const normalizedAddress = address.toLowerCase();
  return await fetchMoneyAccountApi<VaultCompositionResponse>(
    `/v1/vaults/${normalizedAddress}/composition`,
    { chain_id: chainId },
    'vault composition',
    { includeStatus: true },
  );
};
