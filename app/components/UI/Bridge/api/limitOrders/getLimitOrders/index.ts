import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { KnownCaipNamespace, toCaipAccountId } from '@metamask/utils';
import { BRIDGE_API_BASE_URL } from '../../../../../../constants/bridge';
import Engine from '../../../../../../core/Engine';
import { getBaseSemVerVersion } from '../../../../../../util/version';
import type { GetLimitOrdersQuery, GetLimitOrdersResponse } from './types';
import { parseLimitOrderPageResponse } from './validators';

/**
 * Fetches one page of the wallet's limit orders, newest first. Pass the
 * `nextCursor` of a page as `cursor` to fetch the page after it.
 *
 * @param query - The orders to fetch.
 * @returns One page of orders, and the cursor of the next page if there is one.
 */
export async function getLimitOrders({
  walletAddress,
  states,
  chainId,
  limit,
  cursor,
}: GetLimitOrdersQuery): Promise<GetLimitOrdersResponse> {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();

  const searchParams = new URLSearchParams({
    // Orders are matched on the wallet alone: the API ignores the chain of the
    // account id, so any EVM chain will do.
    accountAddress: toCaipAccountId(
      KnownCaipNamespace.Eip155,
      '1',
      walletAddress,
    ),
  });

  if (states?.length) {
    searchParams.set('states', states.join(','));
  }

  if (chainId) {
    searchParams.set('chainIds', chainId);
  }

  if (limit !== undefined) {
    searchParams.set('limit', String(limit));
  }

  if (cursor) {
    searchParams.set('after', cursor);
  }

  const response = await fetch(
    `${BRIDGE_API_BASE_URL}/v2/orders/limit?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getClientHeaders({
          clientId: BridgeClientId.MOBILE,
          clientVersion: getBaseSemVerVersion(),
          jwt: bearerToken ?? '',
        }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `getLimitOrders: Request failed with status ${response.status}`,
    );
  }

  const { orders, endCursor, hasNextPage } = parseLimitOrderPageResponse(
    await response.json(),
  );

  return {
    orders,
    ...(hasNextPage && endCursor ? { nextCursor: endCursor } : {}),
  };
}
