import { create, is, StructError } from '@metamask/superstruct';
import {
  CreateLimitOrderResponseSchema,
  type CreateLimitOrderResponse,
} from './schema';

/**
 * Validates and parses a `POST /v2/limit-orders` response body.
 *
 * @param value - The raw, unknown response payload to validate.
 * @returns The validated response, narrowed to `CreateLimitOrderResponse`.
 * @throws If `value` does not match the expected response shape.
 */
export function parseCreateLimitOrderResponse(
  value: unknown,
): CreateLimitOrderResponse {
  try {
    return create(value, CreateLimitOrderResponseSchema);
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid create limit order response: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Type guard for a `POST /v2/limit-orders` response body.
 *
 * @param value - The raw, unknown response payload to check.
 * @returns Whether `value` matches the expected response shape.
 */
export function isCreateLimitOrderResponse(
  value: unknown,
): value is CreateLimitOrderResponse {
  return is(value, CreateLimitOrderResponseSchema);
}
