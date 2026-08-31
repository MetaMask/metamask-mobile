const TEST_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';

export default TEST_ADDRESS;

/**
 * List of known burn addresses that should be rejected when adding contacts.
 * These addresses are commonly used for token burning and should not be saved as contacts.
 */
export const BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dEaD',
] as const;

/**
 * Lower-cased version of burn addresses for case-insensitive comparisons.
 */
export const LOWER_CASED_BURN_ADDRESSES = BURN_ADDRESSES.map((addr) =>
  addr.toLowerCase(),
) as readonly string[];
