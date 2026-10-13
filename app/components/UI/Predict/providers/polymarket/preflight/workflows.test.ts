import { Interface, parseUnits } from 'ethers/lib/utils';
import { PredictPositionStatus, type PredictPosition } from '../../../types';
import { MIN_PUSD_BALANCE_FOR_CLAIM_GAS } from '../constants';
import {
  POLYMARKET_POSITIONS_PROTOCOL,
  POLYMARKET_V2_PROTOCOL,
} from '../protocol/definitions';
import { planClaim, getClaimRequirements } from './claim';
import { getRawTokenBalance } from './core';
import { planDepositMaintenance } from './deposit';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { planTradePreflight } from './trade';
import { planWithdraw } from './withdraw';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

jest.mock('./core', () => {
  const actual = jest.requireActual('./core');

  return {
    ...actual,
    getRawTokenBalance: jest.fn(),
  };
});

jest.mock('./inspectMissingRequirements', () => ({
  inspectMissingRequirements: jest.fn(),
}));

const mockGetRawTokenBalance = jest.mocked(getRawTokenBalance);
const mockInspectMissingRequirements = jest.mocked(inspectMissingRequirements);

const missingRequirements: V2AllowanceRequirement[] = [
  {
    type: 'erc20-allowance',
    tokenAddress: '0x1000000000000000000000000000000000000000',
    spender: '0x2000000000000000000000000000000000000000',
  },
];

const claimPosition: PredictPosition = {
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  title: 'Question?',
  outcomeId:
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  outcomeTokenId: '123',
  outcomeIndex: 0,
  outcome: 'Yes',
  icon: 'https://example.com/icon.png',
  amount: 2,
  status: PredictPositionStatus.WON,
  endDate: '2026-01-01T00:00:00.000Z',
  size: 2,
  price: 0.5,
  currentValue: 2,
  cashPnl: 1,
  percentPnl: 100,
  claimable: true,
  avgPrice: 0.5,
  initialValue: 1,
  realizedPnl: 1,
  negRisk: false,
};

const signer = {
  address: '0x1111111111111111111111111111111111111111',
  signPersonalMessage: jest.fn(),
  signTypedMessage: jest.fn(),
};

const gasStationThresholdRaw = BigInt(
  parseUnits(MIN_PUSD_BALANCE_FOR_CLAIM_GAS.toString(), 6).toString(),
);

const redeemInterface = new Interface([
  'function redeem(bytes31 conditionId, uint256 outcomeIndex, uint256 amount)',
]);

describe('preflight workflow planners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInspectMissingRequirements.mockResolvedValue(missingRequirements);
  });

  it('builds trade transactions as repairs first and wrap-all second', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(10n);

    const plan = await planTradePreflight({
      protocol: POLYMARKET_V2_PROTOCOL,
      safeAddress: '0x1111111111111111111111111111111111111111',
    });

    expect(plan.transactions[0]?.to).toBe(
      '0x1000000000000000000000000000000000000000',
    );
    expect(plan.transactions[1]?.to).toBe(
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    );
  });

  it('builds deposit maintenance with the same repair-then-wrap ordering', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(10n);

    const plan = await planDepositMaintenance({
      protocol: POLYMARKET_V2_PROTOCOL,
      safeAddress: '0x1111111111111111111111111111111111111111',
    });

    expect(plan.transactions).toHaveLength(2);
    expect(plan.transactions[0]?.to).toBe(
      '0x1000000000000000000000000000000000000000',
    );
    expect(plan.transactions[1]?.to).toBe(
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    );
  });

  it('builds deposit maintenance allowance repairs even without legacy balance', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(0n);

    const plan = await planDepositMaintenance({
      protocol: POLYMARKET_V2_PROTOCOL,
      safeAddress: '0x1111111111111111111111111111111111111111',
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
    ]);
  });

  it('builds claim transactions as repairs, wrap, adapter claim, then exact pUSD gas transfer', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(10n).mockResolvedValueOnce(0n);

    const plan = await planClaim({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      positions: [claimPosition],
      safeAddress: '0x9999999999999999999999999999999999999999',
    });

    expect(plan.gasTokenDeficit).toBe(gasStationThresholdRaw);
    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      POLYMARKET_V2_PROTOCOL.claim.standardTarget,
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });

  it('builds negRisk claim transactions through the negRisk collateral adapter', async () => {
    mockGetRawTokenBalance
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(gasStationThresholdRaw);

    const plan = await planClaim({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      positions: [{ ...claimPosition, negRisk: true }],
      safeAddress: '0x9999999999999999999999999999999999999999',
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.claim.negRiskTarget,
    ]);
  });

  it('adds claim-only adapter approvals for the v2 claim targets needed by the positions', () => {
    const requirements = getClaimRequirements({
      protocol: POLYMARKET_V2_PROTOCOL,
      positions: [
        claimPosition,
        { ...claimPosition, id: 'position-2', negRisk: true },
      ],
    });

    const adapterOperators = requirements
      .flatMap((requirement) => {
        if (requirement.type !== 'erc1155-operator') {
          return [];
        }

        if (
          requirement.operator !==
            POLYMARKET_V2_PROTOCOL.claim.standardTarget &&
          requirement.operator !== POLYMARKET_V2_PROTOCOL.claim.negRiskTarget
        ) {
          return [];
        }

        return [requirement.operator];
      })
      .sort();

    expect(adapterOperators).toEqual(
      [
        POLYMARKET_V2_PROTOCOL.claim.negRiskTarget,
        POLYMARKET_V2_PROTOCOL.claim.standardTarget,
      ].sort(),
    );
  });

  it('builds v2 claim requirements with the Router operator instead of CTF adapters', () => {
    const requirements = getClaimRequirements({
      protocol: POLYMARKET_V2_PROTOCOL,
      positions: [claimPosition],
      marketVersions: { [claimPosition.outcomeId]: 'v2' },
    });

    expect(requirements).toEqual(
      expect.arrayContaining([
        {
          type: 'erc1155-operator',
          tokenAddress: POLYMARKET_POSITIONS_PROTOCOL.contracts.positionManager,
          operator: POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
        },
      ]),
    );
    expect(requirements).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          operator: POLYMARKET_V2_PROTOCOL.claim.standardTarget,
        }),
      ]),
    );
  });

  it('keeps adapter and Router operators together for a mixed claim batch', () => {
    const requirements = getClaimRequirements({
      protocol: POLYMARKET_V2_PROTOCOL,
      positions: [
        claimPosition,
        // negRisk CTF position — keeps the neg-risk adapter requirement.
        {
          ...claimPosition,
          id: 'position-2',
          marketId: 'market-3',
          negRisk: true,
        },
        // negRisk v2 position — negRisk is ignored on the Router path.
        {
          ...claimPosition,
          id: 'position-3',
          marketId: 'market-2',
          outcomeId: `0x${'ee'.repeat(31)}`,
          negRisk: true,
        },
      ],
      marketVersions: { [`0x${'ee'.repeat(31)}`]: 'v2' },
    });

    const operators = requirements
      .flatMap((requirement) =>
        requirement.type === 'erc1155-operator' ? [requirement.operator] : [],
      )
      .sort();

    expect(operators).toEqual(
      [
        // Trading operators from getActiveV2AllowanceRequirements.
        POLYMARKET_V2_PROTOCOL.contracts.exchange,
        POLYMARKET_V2_PROTOCOL.contracts.negRiskAdapter,
        POLYMARKET_V2_PROTOCOL.contracts.negRiskExchange,
        // CTF claim adapters.
        POLYMARKET_V2_PROTOCOL.claim.negRiskTarget,
        POLYMARKET_V2_PROTOCOL.claim.standardTarget,
        // Protocol V2 claim operator.
        POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
      ].sort(),
    );
  });

  it('builds v2 claim redeems through the Router with the share size in base units', async () => {
    mockGetRawTokenBalance
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(gasStationThresholdRaw);

    const plan = await planClaim({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      positions: [
        {
          ...claimPosition,
          outcomeId: `0x${'ab'.repeat(31)}00`,
          size: 2,
          outcomeIndex: 1,
        },
      ],
      safeAddress: '0x9999999999999999999999999999999999999999',
      marketVersions: { [`0x${'ab'.repeat(31)}00`]: 'v2' },
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
    ]);

    const [decodedConditionId, outcomeIndex, amount] =
      redeemInterface.decodeFunctionData('redeem', plan.transactions[1].data);

    expect(decodedConditionId).toBe(`0x${'ab'.repeat(31)}`);
    expect(String(outcomeIndex)).toBe('1');
    expect(String(amount)).toBe('2000000');
  });

  it('ignores negRisk for a v2 claim because the Router routes the condition internally', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(0n).mockResolvedValueOnce(0n);

    const plan = await planClaim({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      positions: [
        {
          ...claimPosition,
          negRisk: true,
          outcomeId: `0x${'cd'.repeat(31)}`,
        },
      ],
      safeAddress: '0x9999999999999999999999999999999999999999',
      marketVersions: { [`0x${'cd'.repeat(31)}`]: 'v2' },
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });

  it('builds withdraw as repairs, wrap, then pUSD transfer', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(1_000_000n);

    const plan = await planWithdraw({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: BigInt(parseUnits('2', 6).toString()),
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });

  it('builds withdraw allowance repairs even without legacy balance', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(0n);

    const plan = await planWithdraw({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: BigInt(parseUnits('2', 6).toString()),
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });
});
