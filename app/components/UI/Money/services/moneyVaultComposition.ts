import type { VaultCompositionResponse } from '../types/moneyVaultComposition';
import { getMoneyAccountApiBaseUrl } from './moneyAccountApi';
import { USE_LOCAL_MONEY_ACCOUNT_API } from '../hooks/useMoneyVaultComposition';
const DEBUG_LOCALHOST_BASE_URL = 'http://localhost:3000';

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
  const url = new URL(
    `/v1/vaults/${normalizedAddress}/composition`,
    USE_LOCAL_MONEY_ACCOUNT_API
      ? DEBUG_LOCALHOST_BASE_URL
      : getMoneyAccountApiBaseUrl(),
  );
  url.searchParams.set('chain_id', String(chainId));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw Object.assign(
      new Error(
        `Money Account API vault composition request failed with status '${response.status}'`,
      ),
      { status: response.status },
    );
  }

  return (await response.json()) as VaultCompositionResponse;
};
