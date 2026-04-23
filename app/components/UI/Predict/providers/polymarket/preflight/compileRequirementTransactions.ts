import { ethers } from 'ethers';
import { OperationType, type SafeTransaction } from '../safe/types';
import { encodeApprove, encodeErc1155Approve } from '../utils';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

export function compileRequirementTransactions(
  requirements: V2AllowanceRequirement[],
): SafeTransaction[] {
  return requirements.map((requirement) => {
    if (requirement.type === 'erc20-allowance') {
      return {
        to: requirement.tokenAddress,
        data: encodeApprove({
          spender: requirement.spender,
          amount: ethers.constants.MaxUint256.toBigInt(),
        }),
        operation: OperationType.Call,
        value: '0',
      };
    }

    return {
      to: requirement.tokenAddress,
      data: encodeErc1155Approve({
        spender: requirement.operator,
        approved: true,
      }),
      operation: OperationType.Call,
      value: '0',
    };
  });
}
