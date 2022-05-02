import { BN } from 'ethereumjs-util';

// Transaction Status
export const TX_UNAPPROVED = 'unapproved';
export const TX_SUBMITTED = 'submitted';
export const TX_SIGNED = 'signed';
export const TX_PENDING = 'pending';
export const TX_CONFIRMED = 'confirmed';

// Values
export const UINT256_BN_MAX_VALUE = new BN(2).pow(new BN(256)).sub(new BN(1));
export const UINT256_HEX_MAX_VALUE =
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
