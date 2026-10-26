import { Interface } from 'ethers/lib/utils';
import type { PredictPosition } from '../../../types';
import {
  POLYMARKET_POSITIONS_PROTOCOL,
  POLYMARKET_V2_PROTOCOL,
} from '../protocol/definitions';
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

const redeemInterface = new Interface([
  'function redeem(bytes31 conditionId, uint256 outcomeIndex, uint256 amount)',
]);

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

  it('routes v2 positions to Router redeems with the share size in base units', async () => {
    const calls = await planDepositWalletClaim({
      positions: [
        createPosition({
          outcomeId: `0x${'ab'.repeat(31)}00`,
          size: 2,
          outcomeIndex: 1,
        }),
      ],
      walletAddress,
      marketVersions: { [`0x${'ab'.repeat(31)}00`]: 'v2' },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        target: POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
        value: '0',
      }),
    );

    const [decodedConditionId, outcomeIndex, amount] =
      redeemInterface.decodeFunctionData('redeem', calls[0].data);

    expect(decodedConditionId).toBe(`0x${'ab'.repeat(31)}`);
    expect(String(outcomeIndex)).toBe('1');
    expect(String(amount)).toBe('2000000');
  });

  it('keeps the Router operator requirement for deposit-wallet v2 claims', async () => {
    await planDepositWalletClaim({
      positions: [createPosition({ outcomeId: `0x${'ab'.repeat(31)}00` })],
      walletAddress,
      marketVersions: { [`0x${'ab'.repeat(31)}00`]: 'v2' },
    });

    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: walletAddress,
      requirements: expect.arrayContaining([
        expect.objectContaining({
          type: 'erc1155-operator',
          tokenAddress: POLYMARKET_POSITIONS_PROTOCOL.contracts.positionManager,
          operator: POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
        }),
      ]),
    });
  });

  it('keeps CTF and Router redeems in order for a mixed deposit-wallet batch', async () => {
    const calls = await planDepositWalletClaim({
      positions: [
        createPosition({ id: 'ctf-position', marketId: 'market-ctf' }),
        createPosition({
          id: 'v2-position',
          outcomeId: `0x${'cd'.repeat(31)}`,
          size: 3,
        }),
      ],
      walletAddress,
      marketVersions: { [`0x${'cd'.repeat(31)}`]: 'v2' },
    });

    expect(calls.map((call) => call.target)).toEqual([
      POLYMARKET_V2_PROTOCOL.claim.standardTarget,
      POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
    ]);
  });

  it('falls back to the CTF claim for an unknown market version', async () => {
    const calls = await planDepositWalletClaim({
      positions: [createPosition()],
      walletAddress,
      marketVersions: { [createPosition().outcomeId]: 'v3' },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].target).toBe(POLYMARKET_V2_PROTOCOL.claim.standardTarget);
  });
});
