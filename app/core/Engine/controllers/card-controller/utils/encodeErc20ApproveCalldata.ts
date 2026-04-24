import { ethers } from 'ethers';

/**
 * ERC-20 approve calldata (same encoding as CardSDK.encodeApproveTransaction).
 */
export function encodeErc20ApproveCalldata(
  spender: string,
  value: string,
): string {
  const approvalInterface = new ethers.utils.Interface([
    'function approve(address spender, uint256 value)',
  ]);
  return approvalInterface.encodeFunctionData('approve', [spender, value]);
}
