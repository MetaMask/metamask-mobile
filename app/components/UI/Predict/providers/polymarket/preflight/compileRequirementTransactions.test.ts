jest.mock('../utils', () => ({
  encodeApprove: jest.fn(({ spender }) => `approve:${spender}`),
  encodeErc1155Approve: jest.fn(({ spender }) => `setApproval:${spender}`),
}));

import { compileRequirementTransactions } from './compileRequirementTransactions';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

describe('compileRequirementTransactions', () => {
  it('compiles erc20 approvals and erc1155 operator approvals in order', () => {
    const requirements: V2AllowanceRequirement[] = [
      {
        type: 'erc20-allowance',
        tokenAddress: '0x1000000000000000000000000000000000000000',
        spender: '0x2000000000000000000000000000000000000000',
      },
      {
        type: 'erc1155-operator',
        tokenAddress: '0x3000000000000000000000000000000000000000',
        operator: '0x4000000000000000000000000000000000000000',
      },
    ];

    expect(compileRequirementTransactions(requirements)).toEqual([
      {
        to: '0x1000000000000000000000000000000000000000',
        data: 'approve:0x2000000000000000000000000000000000000000',
        operation: 0,
        value: '0',
      },
      {
        to: '0x3000000000000000000000000000000000000000',
        data: 'setApproval:0x4000000000000000000000000000000000000000',
        operation: 0,
        value: '0',
      },
    ]);
  });
});
