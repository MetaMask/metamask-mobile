import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { BRIDGE_API_BASE_URL } from '../../../../../../constants/bridge';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { getBaseSemVerVersion } from '../../../../../../util/version';
import { limitOrdersQueries } from '../../../queries/limitOrders';
import { parseCancelLimitOrderResponse } from './validators';
import type { CancelLimitOrderResponse } from './schema';
import { LimitOrderNotOpenError } from './errors';
import { CancelLimitOrderOutcome } from './constants';

export interface CancelLimitOrderParams {
  /**
   * The id the API assigned to the order (`order.id`), not the
   * `clientOrderId` it was created with.
   */
  orderId: string;
  /**
   * CAIP-10 account id that owns the order, e.g. the order's own `account`.
   * The API matches the wallet alone and ignores the chain reference.
   */
  accountAddress: string;
}

export const cancelLimitOrder = async ({
  orderId,
  accountAddress,
}: CancelLimitOrderParams): Promise<CancelLimitOrderResponse> => {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();

  const searchParams = new URLSearchParams({ accountAddress });

  const response = await fetch(
    `${BRIDGE_API_BASE_URL}/v2/orders/limit/${encodeURIComponent(
      orderId,
    )}?${searchParams.toString()}`,
    {
      method: 'DELETE',
      headers: {
        ...getClientHeaders({
          clientId: BridgeClientId.MOBILE,
          clientVersion: getBaseSemVerVersion(),
          jwt: bearerToken ?? '',
        }),
      },
    },
  );

  if (response.status === 409) {
    throw new LimitOrderNotOpenError();
  }

  if (!response.ok) {
    throw new Error(
      `cancelLimitOrder: Request failed with status ${response.status}`,
    );
  }

  return parseCancelLimitOrderResponse(await response.json());
};

/**
 * Refetches every limit orders list, open and history alike, in the UI and in
 * `LimitOrdersDataService`, whose own cache would otherwise keep serving the
 * lists as they were for up to an hour. The lists being shown are refetched
 * right away; the others as soon as they are shown.
 *
 * @param queryClient - The UI query client.
 */
async function refreshLimitOrders(queryClient: QueryClient) {
  try {
    await queryClient.invalidateQueries({
      queryKey: limitOrdersQueries.allOrdersKey(),
    });
  } catch (error) {
    // The order has been dealt with either way, so failing to refresh the
    // lists must not read as a failed cancellation.
    Logger.error(
      error as Error,
      'useCancelLimitOrder: Failed to refresh the limit orders',
    );
  }
}

export const useCancelLimitOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<CancelLimitOrderOutcome, Error, CancelLimitOrderParams>({
    mutationFn: async (params) => {
      try {
        await cancelLimitOrder(params);
      } catch (error) {
        if (error instanceof LimitOrderNotOpenError) {
          return CancelLimitOrderOutcome.NotOpen;
        }
        throw error;
      }

      return CancelLimitOrderOutcome.Cancelled;
    },
    onSuccess: () => refreshLimitOrders(queryClient),
  });
};
