import { Hex, add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { Interface } from '@ethersproject/abi';

import { parseStandardTokenTransactionData } from './transaction';

const SIGNATURE_LEGACY = 'function approve(address,uint256)';
const SIGNATURE_PERMIT2 = 'function approve(address,address,uint160,uint48)';
const SIGNATURE_INCREASE_ALLOWANCE =
  'function increaseAllowance(address,uint256)';
export function parseApprovalTransactionData(data: Hex):
  | {
      amountOrTokenId?: BigNumber;
      isApproveAll?: boolean;
      isRevokeAll?: boolean;
      name: string;
      tokenAddress?: Hex;
    }
  | undefined {
  const transactionDescription = parseStandardTokenTransactionData(data);
  const { args, name } = transactionDescription ?? {};

  if (
    !['approve', 'increaseAllowance', 'setApprovalForAll'].includes(
      name ?? '',
    ) ||
    !name
  ) {
    return undefined;
  }

  const rawAmountOrTokenId =
    args?._value ?? // ERC-20 - approve
    args?.increment ?? // Fiat Token V2 - increaseAllowance
    args?.amount; // Permit2 - approve

  const amountOrTokenId = rawAmountOrTokenId
    ? new BigNumber(rawAmountOrTokenId?.toString())
    : undefined;

  const isApproveAll = name === 'setApprovalForAll' && args?._approved === true;
  const isRevokeAll = name === 'setApprovalForAll' && args?._approved === false;
  const tokenAddress = name === 'approve' ? args?.token : undefined;

  return {
    amountOrTokenId,
    isApproveAll,
    isRevokeAll,
    name,
    tokenAddress,
  };
}

export function updateApprovalAmount(
  originalData: Hex,
  newAmount: string | number | BigNumber,
  decimals: number,
): Hex {
  const { name, tokenAddress } =
    parseApprovalTransactionData(originalData) ?? {};

  if (!name) {
    throw new Error('Invalid approval transaction data');
  }

  const multiplier = new BigNumber(10).pow(decimals);
  const value = add0x(new BigNumber(newAmount).times(multiplier).toString(16));

  let signature = tokenAddress ? SIGNATURE_PERMIT2 : SIGNATURE_LEGACY;

  if (name === 'increaseAllowance') {
    signature = SIGNATURE_INCREASE_ALLOWANCE;
  }

  const iface = new Interface([signature]);
  const decoded = iface.decodeFunctionData(name, originalData);

  if (signature === SIGNATURE_PERMIT2) {
    return iface.encodeFunctionData(name, [
      tokenAddress,
      decoded[1],
      value,
      decoded[3],
    ]) as Hex;
  }

  return iface.encodeFunctionData(name, [decoded[0], value]) as Hex;
}
