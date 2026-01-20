export const MERKL_API_BASE_URL = 'https://api.merkl.xyz/v4';
export const AGLAMERKL_ADDRESS = '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898'; // Used for test campaigns

export const MERKL_DISTRIBUTOR_ADDRESS =
  '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae' as const;

// ABI for the claimed mapping
export const DISTRIBUTOR_CLAIMED_ABI = [
  'function claimed(address user, address token) external view returns (uint208 amount, uint48 timestamp, bytes32 merkleRoot)',
];

// ABI for the claim method
export const DISTRIBUTOR_CLAIM_ABI = [
  'function claim(address[] calldata users, address[] calldata tokens, uint256[] calldata amounts, bytes32[][] calldata proofs)',
];
