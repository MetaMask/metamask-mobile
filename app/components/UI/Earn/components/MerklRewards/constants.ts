import { Hex } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';

export const MERKL_API_BASE_URL = 'https://api.merkl.xyz/v4';

/**
 * mUSD token decimals
 */
export const MUSD_DECIMALS = 6;

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

/**
 * Decode the claim amount from a Merkl claim transaction data.
 * The claim function signature is: claim(address[] users, address[] tokens, uint256[] amounts, bytes32[][] proofs)
 *
 * @param data - The transaction data hex string
 * @returns The first claim amount as a string (raw value, not adjusted for decimals), or null if decoding fails
 */
export function decodeMerklClaimAmount(
  data: string | undefined,
): string | null {
  if (!data || typeof data !== 'string') {
    return null;
  }

  try {
    const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);
    const decoded = contractInterface.decodeFunctionData('claim', data);
    // amounts is the 3rd parameter (index 2)
    const amounts = decoded[2];
    if (!amounts || amounts.length === 0) {
      return null;
    }
    return amounts[0].toString();
  } catch {
    return null;
  }
}
