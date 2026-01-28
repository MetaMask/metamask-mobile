import { Hex } from '@metamask/utils';

export const MERKL_API_BASE_URL = 'https://api.merkl.xyz/v4';

// Origin identifier for Merkl claim transactions (used for toast monitoring)
export const MERKL_CLAIM_ORIGIN = 'merkl-claim' as const;
export const AGLAMERKL_ADDRESS_MAINNET =
  '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898'; // Used for test campaigns
export const AGLAMERKL_ADDRESS_LINEA =
  '0x03C2d2014795EE8cA78B62738433B457AB19F4b3'; // Used for test campaigns

export const MERKL_DISTRIBUTOR_ADDRESS =
  '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae' as const;

/**
 * The chain where Merkl rewards are claimed (Linea mainnet = 0xe708 = 59144).
 * Even if a user holds mUSD on mainnet, rewards are always claimed on Linea.
 */
export const MERKL_CLAIM_CHAIN_ID = '0xe708' as Hex;

// ABI for the claimed mapping
export const DISTRIBUTOR_CLAIMED_ABI = [
  'function claimed(address user, address token) external view returns (uint208 amount, uint48 timestamp, bytes32 merkleRoot)',
];

// ABI for the claim method
export const DISTRIBUTOR_CLAIM_ABI = [
  'function claim(address[] calldata users, address[] calldata tokens, uint256[] calldata amounts, bytes32[][] calldata proofs)',
];
