import { BigNumber } from 'bignumber.js';
import { Hex, add0x } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';

import {
  APPROVALS_LIST,
  APPROVAL_TYPES,
  SIGNATURE_INCREASE_ALLOWANCE,
  SIGNATURE_LEGACY,
  SIGNATURE_PERMIT2,
} from '../constants/approvals';
import { parseStandardTokenTransactionData } from './transaction';

export interface ParsedApprovalTransactionData {
  amountOrTokenId?: BigNumber;
  isApproveAll?: boolean;
  isRevokeAll?: boolean;
  name: string;
  tokenAddress?: Hex;
}

export function parseApprovalTransactionData(
  data: Hex,
): ParsedApprovalTransactionData | undefined {
  const transactionDescription = parseStandardTokenTransactionData(data);
  const { args, name } = transactionDescription ?? { name: '' };

  if (!APPROVALS_LIST.includes(name)) {
    return undefined;
  }

  const rawAmountOrTokenId =
    args?._value ?? // ERC-20 - approve
    args?.increment ?? // Fiat Token V2 - increaseAllowance
    args?.amount; // Permit2 - approve

  const amountOrTokenId = rawAmountOrTokenId
    ? new BigNumber(rawAmountOrTokenId?.toString())
    : undefined;

  const isApproveAll =
    name === APPROVAL_TYPES.setApprovalForAll && args?._approved === true;
  const isRevokeAll =
    name === APPROVAL_TYPES.setApprovalForAll && args?._approved === false;
  const tokenAddress =
    name === APPROVAL_TYPES.approve ? args?.token : undefined;

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

  if (name === APPROVAL_TYPES.increaseAllowance) {
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
