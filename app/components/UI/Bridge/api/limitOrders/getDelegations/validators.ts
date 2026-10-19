import { create, is, StructError } from '@metamask/superstruct';
import {
  LimitOrderDelegationsResponseSchema,
  type LimitOrderDelegationsResponse,
} from './schema';

/**
 * Validates and parses a `GET /v2/limit/orders/delegations` response body.
 *
 * @param value - The raw, unknown response payload to validate.
 * @returns The validated response, narrowed to `LimitOrderDelegationsResponse`.
 * @throws If `value` does not match the expected response shape.
 */
export function parseLimitOrderDelegationsResponse(
  value: unknown,
): LimitOrderDelegationsResponse {
  try {
    return create(value, LimitOrderDelegationsResponseSchema);
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(
        `Invalid limit order delegations response: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Type guard for a `GET /v2/limit/orders/delegations` response body.
 *
 * @param value - The raw, unknown response payload to check.
 * @returns Whether `value` matches the expected response shape.
 */
export function isLimitOrderDelegationsResponse(
  value: unknown,
): value is LimitOrderDelegationsResponse {
  return is(value, LimitOrderDelegationsResponseSchema);
}
