import { create, StructError } from '@metamask/superstruct';
import {
  GetLimitOrderResponseSchema,
  type GetLimitOrderResponse,
} from './schema';

/**
 * Validates and parses a `GET /v2/orders/limit?id={id}` response body.
 *
 * @param value - The raw, unknown response payload to validate.
 * @returns The validated response, narrowed to `GetLimitOrderResponse`.
 * @throws If `value` does not match the expected response shape.
 */
export function parseGetLimitOrderResponse(
  value: unknown,
): GetLimitOrderResponse {
  try {
    return create(value, GetLimitOrderResponseSchema);
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid limit order response: ${error.message}`);
    }
    throw error;
  }
}
