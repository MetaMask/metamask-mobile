import type { Result } from '../../../types';
import { getPolymarketEndpoints } from '../utils';
import type { ClobHeaders, OrderResponse } from '../types';
import type {
  Permit2FeeAuthorization,
  SafeFeeAuthorization,
} from '../safe/types';
import type { PolymarketProtocolDefinition } from './definitions';
import type { ProtocolRelayerOrder } from './orderCodec';

function normalizeRelayerHeaders(headers: ClobHeaders): Record<string, string> {
  return {
    ...headers,
    ...Object.entries(headers)
      .map(([key, value]) => ({
        [key.replace(/_/gu, '-')]: value,
      }))
      .reduce((acc, curr) => ({ ...acc, ...curr }), {}),
  };
}

export async function submitProtocolClobOrder({
  protocol,
  headers,
  clobOrder,
  feeAuthorization,
  executor,
  allowancesTx,
}: {
  protocol: Pick<PolymarketProtocolDefinition, 'transport'>;
  headers: ClobHeaders;
  clobOrder: ProtocolRelayerOrder;
  feeAuthorization?: SafeFeeAuthorization | Permit2FeeAuthorization;
  executor?: string;
  allowancesTx?: { to: string; data: string };
}): Promise<Result<OrderResponse>> {
  const { CLOB_RELAYER } = getPolymarketEndpoints();
  const url = `${CLOB_RELAYER}/order`;
  const requestHeaders = normalizeRelayerHeaders(headers);

  if (protocol.transport.clobVersionHeader) {
    requestHeaders['X-Clob-Version'] = protocol.transport.clobVersionHeader;
  }

  const body = {
    ...clobOrder,
    ...(feeAuthorization ? { feeAuthorization } : {}),
    ...(executor ? { executor } : {}),
    ...(allowancesTx ? { allowancesTx } : {}),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
    });

    if (response.status === 403) {
      return {
        success: false,
        error: 'You are unable to access this provider.',
      };
    }

    let responseData: OrderResponse | undefined;

    try {
      responseData = (await response.json()) as OrderResponse;
    } catch {
      responseData = undefined;
    }

    if (!response.ok || !responseData || responseData.success === false) {
      return {
        success: false,
        error: responseData?.errorMsg ?? response.statusText,
      };
    }

    return {
      success: true,
      response: responseData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: `Failed to submit CLOB order: ${message}`,
    };
  }
}
