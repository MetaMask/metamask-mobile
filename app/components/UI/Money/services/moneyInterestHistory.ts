import type { InterestHistoryResponse } from '../types/moneyInterestHistory';
import { fetchMoneyAccountApi } from './moneyAccountApi';

/**
 * Fetches historical interest for a Money account position.
 *
 * @param address - The primary Money account address.
 * @param chainId - The Money vault chain ID.
 * @returns The historical interest response.
 */
// TODO: This function is a stop-gap until core is updated.
export const fetchMoneyInterestHistory = async (
  address: string,
  chainId: number,
): Promise<InterestHistoryResponse> => {
  const normalizedAddress = address.toLowerCase();
  return await fetchMoneyAccountApi<InterestHistoryResponse>(
    `/v1/positions/${normalizedAddress}/interest-history`,
    { chain_id: chainId },
    'interest history',
  );
};
