import type { VaultApyHistoryResponse } from '../types/moneyHistoricalVaultApys';
import { getMoneyAccountApiBaseUrl } from './moneyAccountApi';

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
  const url = new URL('/v1/vaults/apy-history', getMoneyAccountApiBaseUrl());
  url.searchParams.set('chain_id', String(chainId));
  url.searchParams.set('vault_address', normalizedAddress);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw Object.assign(
      new Error(
        `Money Account API vault APY history request failed with status '${response.status}'`,
      ),
      { status: response.status },
    );
  }

  return (await response.json()) as VaultApyHistoryResponse;
};
