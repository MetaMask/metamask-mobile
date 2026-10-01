import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import Engine from '../../../../../../core/Engine';
import { getBaseSemVerVersion } from '../../../../../../util/version';
import { parseGetLimitOrderResponse } from './validators';
import type { GetLimitOrderResponse } from './schema';
import { getLimitOrdersBaseUrl } from '../getLimitOrdersBaseUrl';

export interface GetLimitOrderParams {
  /**
   * The id the API assigned to the order (`order.id`), not the
   * `clientOrderId` it was created with.
   */
  orderId: string;
  /**
   * CAIP-10 account id that owns the order, e.g. the order's own `account`.
   */
  accountAddress: string;
}

/**
 * Fetches a single limit order, along with the fill attempts made against it.
 *
 * @param params - The order to fetch and the account that owns it.
 * @returns The order and its transactions.
 */
export async function getLimitOrder({
  orderId,
  accountAddress,
}: GetLimitOrderParams): Promise<GetLimitOrderResponse> {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();

  const searchParams = new URLSearchParams({ id: orderId, accountAddress });

  const response = await fetch(
    `${getLimitOrdersBaseUrl()}/v2/orders/limit?${searchParams.toString()}`,
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
      `getLimitOrder: Request failed with status ${response.status}`,
    );
  }

  return parseGetLimitOrderResponse(await response.json());
}
