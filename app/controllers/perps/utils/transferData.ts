/**
 * Portable ERC-20 transfer data generation.
 * Only the 'transfer(address,uint256)' case is needed by PerpsController.
 *
 * Uses @metamask/abi-utils (core package with proper TypeScript types)
 * and @metamask/utils for hex conversion.
 */
import { encode } from '@metamask/abi-utils';
import { bytesToHex } from '@metamask/utils';

/** ERC-20 transfer function selector: transfer(address,uint256) */
const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';

/**
 * Generate ERC-20 transfer calldata.
 *
 * @param toAddress - Recipient address (0x-prefixed hex string)
 * @param amount - Transfer amount (0x-prefixed hex string)
 * @returns Hex-encoded calldata for ERC-20 transfer
 */
export function generateERC20TransferData(
  toAddress: string,
  amount: string,
): string {
  if (!toAddress || !amount) {
    throw new Error(
      "[transferData] 'toAddress' and 'amount' must be defined for ERC-20 transfer",
    );
  }

  const encoded = encode(['address', 'uint256'], [toAddress, amount]);
  // bytesToHex returns '0x...' prefixed string; strip the '0x' prefix
  // since we prepend the function selector ourselves
  const encodedHex = bytesToHex(encoded).slice(2);

  return TRANSFER_FUNCTION_SIGNATURE + encodedHex;
}
