import { Hex } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';

export function buildApproveTransactionData(
  address: string,
  amountOrTokenId: number,
): Hex {
  return new Interface([
    'function approve(address spender, uint256 amountOrTokenId)',
  ]).encodeFunctionData('approve', [address, amountOrTokenId]) as Hex;
}

export function buildPermit2ApproveTransactionData(
  token: string,
  spender: string,
  amount: number,
  expiration: number,
): Hex {
  return new Interface([
    'function approve(address token, address spender, uint160 amount, uint48 nonce)',
  ]).encodeFunctionData('approve', [token, spender, amount, expiration]) as Hex;
}

export function buildDecreaseAllowanceTransactionData(
  address: string,
  amount: number,
): Hex {
  return new Interface([
    'function decreaseAllowance(address spender, uint256 subtractedValue)',
  ]).encodeFunctionData('decreaseAllowance', [address, amount]) as Hex;
}

export function buildIncreaseAllowanceTransactionData(
  address: string,
  amount: number,
): Hex {
  return new Interface([
    'function increaseAllowance(address spender, uint256 addedValue)',
  ]).encodeFunctionData('increaseAllowance', [address, amount]) as Hex;
}

export function buildSetApproveForAllTransactionData(
  address: string,
  approved: boolean,
): Hex {
  return new Interface([
    'function setApprovalForAll(address operator, bool approved)',
  ]).encodeFunctionData('setApprovalForAll', [address, approved]) as Hex;
}
