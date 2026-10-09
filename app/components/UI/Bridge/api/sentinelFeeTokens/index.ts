import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { getBaseSemVerVersion } from '../../../../../util/version';
import { getLimitOrdersBaseUrl } from '../limitOrders/getLimitOrdersBaseUrl';
import type { SentinelFeeTokensByChain } from './types';
import { parseSentinelFeeTokensResponse } from './validators';

/**
 * Fetches Sentinel fee tokens from the Bridge orders API.
 *
 * @returns Sentinel fee tokens grouped by CAIP-2 chain ID.
 */
export async function fetchSentinelFeeTokens(): Promise<SentinelFeeTokensByChain> {
  const response = await fetch(
    `${getLimitOrdersBaseUrl()}/getSentinelFeeTokens`,
    {
      method: 'GET',
      headers: getClientHeaders({
        clientId: BridgeClientId.MOBILE,
        clientVersion: getBaseSemVerVersion(),
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `fetchSentinelFeeTokens: Request failed with status ${response.status}`,
    );
  }

  return parseSentinelFeeTokensResponse(await response.json());
}

export type { SentinelFeeToken, SentinelFeeTokensByChain } from './types';
