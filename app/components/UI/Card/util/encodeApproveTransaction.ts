import { ethers } from 'ethers';

const APPROVE_INTERFACE = new ethers.utils.Interface([
  'function approve(address spender, uint256 value)',
]);

/**
 * ABI-encode an ERC-20 approve(spender, value) call.
 * Pure utility — no network, no SDK required.
 *
 * @param spender - The address being approved to spend tokens (delegation contract)
 * @param value   - Amount in minimal units (wei-equivalent) as a decimal string
 * @returns 0x-prefixed hex encoded calldata
 */
export function encodeApproveTransaction(
  spender: string,
  value: string,
): string {
  return APPROVE_INTERFACE.encodeFunctionData('approve', [spender, value]);
}
