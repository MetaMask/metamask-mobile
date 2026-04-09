/**
 * Parsed pay-with token shape used by PerpsController (matches PerpsSelectedPaymentToken).
 */
export interface ParsedPayWithToken {
  address: string;
  chainId: string;
  description?: string;
}

/**
 * Parses an unknown value as a pay-with token object.
 * Valid shape: { address: string, chainId: string, description?: string }.
 *
 * @param value - Value from state or UI (e.g. AssetType or controller payload).
 * @returns Parsed object or null if invalid.
 */
export function parsePayWithToken(value: unknown): ParsedPayWithToken | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  const address = obj.address;
  const chainId = obj.chainId;
  const description = obj.description;
  if (typeof address !== 'string' || typeof chainId !== 'string') {
    return null;
  }
  if (description !== undefined && typeof description !== 'string') {
    return null;
  }
  return {
    address,
    chainId,
    ...(description !== undefined && { description }),
  };
}
