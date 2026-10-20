import { isValidAddress } from 'ethereumjs-util';

/**
 * Validates and normalizes remotely configured Iron/MoonPay sender addresses.
 * Malformed configuration fails closed as an empty allowlist.
 *
 * @param value - Untrusted remote feature-flag value.
 * @returns Lowercase, unique EVM addresses, or an empty list.
 */
export function parseMoneyVbaActivityDepositFromAddresses(
  value: unknown,
): string[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (address): address is string =>
        typeof address === 'string' &&
        address.startsWith('0x') &&
        isValidAddress(address),
    )
  ) {
    return [];
  }

  return [...new Set(value.map((address) => address.toLowerCase()))];
}
