import { create, StructError } from '@metamask/superstruct';
import {
  LimitOrderPageResponseSchema,
  type LimitOrderPageResponse,
} from './schema';

/**
 * Validates and parses a `GET /v2/orders/limit` response body.
 *
 * @param value - The raw, unknown response payload to validate.
 * @returns The validated response, narrowed to `LimitOrderPageResponse`.
 * @throws If `value` does not match the expected response shape.
 */
export function parseLimitOrderPageResponse(
  value: unknown,
): LimitOrderPageResponse {
  try {
    return create(value, LimitOrderPageResponseSchema);
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid limit orders response: ${error.message}`);
    }
    throw error;
  }
}
