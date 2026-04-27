import { ethers } from 'ethers';

/**
 * Encodes calldata for ERC-20 `approve(address spender, uint256 value)`.
 *
 * @param spender - Spender address (checksum not required; passed through to ABI encoder).
 * @param value - Allowance as decimal string (minimal units), e.g. `"1000000"` for 6 decimals.
 * @returns Hex string `0x`-prefixed transaction `data` field.
 */
export function encodeErc20ApproveCalldata(
  spender: string,
  value: string,
): string {
  const iface = new ethers.utils.Interface([
    'function approve(address spender, uint256 value)',
  ]);
  return iface.encodeFunctionData('approve', [spender, value]);
}
