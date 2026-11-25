import { ApiEnv, getApiEnv } from '../../../../core/apiEnv';
import type { InterestHistoryResponse } from '../types/moneyInterestHistory';

const MONEY_ACCOUNT_API_URL_BY_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://money.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://money.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://money.api.cx.metamask.io',
};

const getMoneyAccountApiBaseUrl = (): string =>
  MONEY_ACCOUNT_API_URL_BY_ENV[getApiEnv()];

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
  const url = new URL(
    `/v1/positions/${normalizedAddress}/interest-history`,
    getMoneyAccountApiBaseUrl(),
  );
  url.searchParams.set('chain_id', String(chainId));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Money Account API interest history request failed with status '${response.status}'`,
    );
  }

  return (await response.json()) as InterestHistoryResponse;
};
