import type { PredictPosition } from '../../../types';
import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
import { PERMIT2_ADDRESS } from '../safe/constants';
import { planDepositWalletClaim } from './claim';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';

jest.mock('./inspectMissingRequirements', () => ({
  inspectMissingRequirements: jest.fn(),
}));

jest.mock('./compileRequirementTransactions', () => ({
  compileRequirementTransactions: jest.fn((requirements) =>
    requirements.map(
      (requirement: { tokenAddress: string }, index: number) => ({
        to: requirement.tokenAddress,
        data: `0x${String(index + 1).padStart(64, '0')}`,
        operation: 0,
        value: '0',
      }),
    ),
  ),
}));

const mockInspectMissingRequirements = jest.mocked(inspectMissingRequirements);
const mockCompileRequirementTransactions = jest.mocked(
  compileRequirementTransactions,
);

const walletAddress = '0x1111111111111111111111111111111111111111';

function createPosition(
  overrides: Partial<PredictPosition> = {},
): PredictPosition {
  return {
    id: 'position-1',
    providerId: 'polymarket',
    marketId: 'market-1',
    outcomeId:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    outcome: 'Yes',
    outcomeTokenId: 'token-1',
    currentValue: 1,
    title: 'Market',
    icon: '',
    amount: 1,
    price: 1,
    status: 'open',
    size: 1,
    outcomeIndex: 0,
    percentPnl: 0,
    cashPnl: 0,
    claimable: true,
    initialValue: 1,
    avgPrice: 1,
    endDate: new Date(0).toISOString(),
    negRisk: false,
    ...overrides,
  } as PredictPosition;
}

describe('planDepositWalletClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInspectMissingRequirements.mockResolvedValue([]);
  });

  it('throws for empty positions', async () => {
    await expect(
      planDepositWalletClaim({ positions: [], walletAddress }),
    ).rejects.toThrow('No positions provided for deposit wallet claim');

    expect(mockInspectMissingRequirements).not.toHaveBeenCalled();
  });

  it('inspects active claim requirements without legacy sweep requirements', async () => {
    await planDepositWalletClaim({
      positions: [createPosition()],
      walletAddress,
    });

    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: walletAddress,
      requirements: expect.not.arrayContaining([
        expect.objectContaining({
          tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
        }),
      ]),
    });
  });

  it('filters Permit2 while preserving allowed deposit-wallet claim requirements', async () => {
    await planDepositWalletClaim({
      positions: [createPosition()],
      walletAddress,
    });

    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: walletAddress,
      requirements: expect.not.arrayContaining([
        expect.objectContaining({
          type: 'erc20-allowance',
          spender: PERMIT2_ADDRESS,
        }),
      ]),
    });
    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: walletAddress,
      requirements: expect.arrayContaining([
        expect.objectContaining({
          type: 'erc20-allowance',
          spender: POLYMARKET_V2_PROTOCOL.contracts.exchange,
        }),
        expect.objectContaining({
          type: 'erc1155-operator',
          operator: POLYMARKET_V2_PROTOCOL.claim.standardTarget,
        }),
      ]),
    });
  });

  it('includes missing requirement calls before redeem calls', async () => {
    const missingRequirement = {
      type: 'erc20-allowance' as const,
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
      spender: POLYMARKET_V2_PROTOCOL.contracts.exchange,
    };
    mockInspectMissingRequirements.mockResolvedValue([missingRequirement]);

    const calls = await planDepositWalletClaim({
      positions: [createPosition()],
      walletAddress,
    });

    expect(mockCompileRequirementTransactions).toHaveBeenCalledWith([
      missingRequirement,
    ]);
    expect(calls[0]).toEqual({
      target: missingRequirement.tokenAddress,
      value: '0',
      data: '0x0000000000000000000000000000000000000000000000000000000000000001',
    });
    expect(calls[1]).toEqual(
      expect.objectContaining({
        target: POLYMARKET_V2_PROTOCOL.claim.standardTarget,
        value: '0',
      }),
    );
  });

  it('uses the neg-risk redeem target for neg-risk positions', async () => {
    const calls = await planDepositWalletClaim({
      positions: [createPosition({ negRisk: true })],
      walletAddress,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        target: POLYMARKET_V2_PROTOCOL.claim.negRiskTarget,
        value: '0',
      }),
    );
  });

  it('preserves redeem call order for multiple positions', async () => {
    const calls = await planDepositWalletClaim({
      positions: [
        createPosition({ id: 'standard', negRisk: false }),
        createPosition({
          id: 'neg-risk',
          outcomeId:
            '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          negRisk: true,
        }),
      ],
      walletAddress,
    });

    expect(calls.map((call) => call.target)).toEqual([
      POLYMARKET_V2_PROTOCOL.claim.standardTarget,
      POLYMARKET_V2_PROTOCOL.claim.negRiskTarget,
    ]);
  });
});
