import { create, is, StructError } from '@metamask/superstruct';
import {
  CancelLimitOrderResponseSchema,
  type CancelLimitOrderResponse,
} from './schema';

/**
 * Validates and parses a `DELETE /v2/orders/limit/{id}` response body.
 *
 * @param value - The raw, unknown response payload to validate.
 * @returns The validated response, narrowed to `CancelLimitOrderResponse`.
 * @throws If `value` does not match the expected response shape.
 */
export function parseCancelLimitOrderResponse(
  value: unknown,
): CancelLimitOrderResponse {
  try {
    return create(value, CancelLimitOrderResponseSchema);
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid cancel limit order response: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Type guard for a `DELETE /v2/orders/limit/{id}` response body.
 *
 * @param value - The raw, unknown response payload to check.
 * @returns Whether `value` matches the expected response shape.
 */
export function isCancelLimitOrderResponse(
  value: unknown,
): value is CancelLimitOrderResponse {
  return is(value, CancelLimitOrderResponseSchema);
}
