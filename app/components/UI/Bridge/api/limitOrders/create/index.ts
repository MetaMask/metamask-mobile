import { useMutation } from '@tanstack/react-query';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { BRIDGE_API_BASE_URL } from '../../../../../../constants/bridge';
import Engine from '../../../../../../core/Engine';
import { getBaseSemVerVersion } from '../../../../../../util/version';
import { parseCreateLimitOrderResponse } from './validators';
import type {
  CreateLimitOrderResponse,
  SignedLimitOrderDelegation,
} from './schema';

export interface CreateLimitOrderParams {
  /**
   * The same UUID used for `GET /v2/limit-orders/delegations`. Repeated
   * requests with this id are idempotent.
   */
  clientOrderId: string;
  /**
   * Decimal chain id the order executes on, e.g. `56`.
   */
  chainId: number;
  trigger: {
    /**
     * src_price - price limit is set on the source asset USD price
     * dest_price - price limit is set on the dest asset USD price
     * ratio - price limit is set on the token prices (i.e. when ETH is equal 0.04 BTC).
     * This also includes all the supported stablecoins.
     */
    kind: 'src_price' | 'dest_price' | 'ratio';
    /**
     * Which side of `price` fills the order.
     */
    threshold: 'above' | 'below';
    /**
     * The trigger price, as a decimal string.
     * It's either the token value (eg `0.001` for ETH) or the USD equivalent $`2700`.
     * In case of non-USD fiat values like EUR, we need to convert and pass the USD equivalent.
     * Backend does not support fiat outside of USD.
     */
    price: string;
  };
  /**
   * The `destAmount` requested from `GET /v2/limit-orders/delegations`, before
   * the price tolerance was applied, in minimal units. Bookkeeping only: the
   * enforceable floor is the one in the signed caveat.
   */
  requestedDestAmount: string;
  /**
   * The `priceTolerance` used on `GET /v2/limit-orders/delegations`, as a
   * percent with at most 2 decimal places (`2.5` means 2.5%). It must match
   * that request, since it sets the slippage budget of the fill quote.
   */
  priceTolerance: number;
  /**
   * The delegations from `GET /v2/limit-orders/delegations`, each with the
   * delegator's signature filled in. `tokenIn`, `tokenOut`, `amountIn`,
   * `minAmountOut` and the deadline are all derived from their caveats, so
   * they are never sent explicitly.
   */
  delegations: SignedLimitOrderDelegation[];
}

export const createLimitOrder = async (
  params: CreateLimitOrderParams,
): Promise<CreateLimitOrderResponse> => {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();

  const response = await fetch(`${BRIDGE_API_BASE_URL}/v2/limit-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getClientHeaders({
        clientId: BridgeClientId.MOBILE,
        clientVersion: getBaseSemVerVersion(),
        jwt: bearerToken ?? '',
      }),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(
      `createLimitOrder: Request failed with status ${response.status}`,
    );
  }

  return parseCreateLimitOrderResponse(await response.json());
};

export const useCreateLimitOrder = () =>
  useMutation<CreateLimitOrderResponse, Error, CreateLimitOrderParams>({
    mutationFn: createLimitOrder,
  }).mutateAsync;
