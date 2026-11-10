import { create, StructError } from '@metamask/superstruct';
import {
  SentinelFeeTokensResponseSchema,
  type SentinelFeeTokensByChain,
} from './schema';

/**
 * Validates and parses a `GET /getSentinelFeeTokens` response body.
 *
 * @param value - The raw, unknown response payload to validate.
 * @returns Sentinel fee tokens grouped by CAIP-2 chain ID.
 * @throws If `value` does not match the expected response shape.
 */
export function parseSentinelFeeTokensResponse(
  value: unknown,
): SentinelFeeTokensByChain {
  try {
    return create(value, SentinelFeeTokensResponseSchema);
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid Sentinel fee tokens response: ${error.message}`);
    }
    throw error;
  }
}
