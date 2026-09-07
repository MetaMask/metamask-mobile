const TEST_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';

export default TEST_ADDRESS;

/**
 * The zero address — sending to this address is always blocked.
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * The dead address — sending to this address raises a warning but is not blocked.
 */
export const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

/**
 * List of known burn addresses that should be rejected when adding contacts.
 * These addresses are commonly used for token burning and should not be saved as contacts.
 */
export const BURN_ADDRESSES = [ZERO_ADDRESS, DEAD_ADDRESS] as const;

/**
 * Lower-cased version of burn addresses for case-insensitive comparisons.
 */
export const LOWER_CASED_BURN_ADDRESSES = BURN_ADDRESSES.map((addr) =>
  addr.toLowerCase(),
) as readonly string[];
