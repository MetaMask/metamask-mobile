jest.mock('./v2AllowanceRequirements', () => ({
  getActiveV2AllowanceRequirements: jest.fn(),
}));

jest.mock('./inspectMissingRequirements', () => ({
  inspectMissingRequirements: jest.fn(),
}));

jest.mock('./compileRequirementTransactions', () => ({
  compileRequirementTransactions: jest.fn(),
}));

import { PERMIT2_ADDRESS } from '../safe/constants';
import { OperationType, type SafeTransaction } from '../safe/types';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { planDepositWalletPreflight } from './depositWallet';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
  getActiveV2AllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

const walletAddress = '0x1111111111111111111111111111111111111111';
const activeRequirement: V2AllowanceRequirement = {
  type: 'erc20-allowance',
  tokenAddress: '0x2222222222222222222222222222222222222222',
  spender: '0x3333333333333333333333333333333333333333',
};
const permit2Requirement: V2AllowanceRequirement = {
  type: 'erc20-allowance',
  tokenAddress: '0x2222222222222222222222222222222222222222',
  spender: PERMIT2_ADDRESS,
};
const activeRequirements: V2AllowanceRequirement[] = [
  activeRequirement,
  permit2Requirement,
];
const depositWalletRequirements: V2AllowanceRequirement[] = [activeRequirement];
const missingRequirements: V2AllowanceRequirement[] = [activeRequirement];
const compiledTransactions: SafeTransaction[] = [
  {
    to: '0x2222222222222222222222222222222222222222',
    data: '0xapprove',
    operation: OperationType.Call,
    value: '0',
  },
];

const mockGetActiveV2AllowanceRequirements = jest.mocked(
  getActiveV2AllowanceRequirements,
);
const mockInspectMissingRequirements = jest.mocked(inspectMissingRequirements);
const mockCompileRequirementTransactions = jest.mocked(
  compileRequirementTransactions,
);

describe('planDepositWalletPreflight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveV2AllowanceRequirements.mockReturnValue(activeRequirements);
    mockInspectMissingRequirements.mockResolvedValue(missingRequirements);
    mockCompileRequirementTransactions.mockReturnValue(compiledTransactions);
  });

  it('uses active V2 requirements without Permit2 for the deposit wallet and compiles missing repairs', async () => {
    const plan = await planDepositWalletPreflight({ walletAddress });

    expect(mockGetActiveV2AllowanceRequirements).toHaveBeenCalledTimes(1);
    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: walletAddress,
      requirements: depositWalletRequirements,
    });
    expect(mockCompileRequirementTransactions).toHaveBeenCalledWith(
      missingRequirements,
    );
    expect(plan).toEqual({
      missingRequirements,
      transactions: compiledTransactions,
    });
  });

  it('returns no transactions when no requirements are missing', async () => {
    mockInspectMissingRequirements.mockResolvedValue([]);
    mockCompileRequirementTransactions.mockReturnValue([]);

    const plan = await planDepositWalletPreflight({ walletAddress });

    expect(mockCompileRequirementTransactions).toHaveBeenCalledWith([]);
    expect(plan).toEqual({ missingRequirements: [], transactions: [] });
  });
});
