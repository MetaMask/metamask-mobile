import { parseUnits } from 'ethers/lib/utils';
import { PredictPositionStatus, type PredictPosition } from '../../../types';
import { MIN_COLLATERAL_BALANCE_FOR_CLAIM } from '../constants';
import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
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
  parseUnits(MIN_COLLATERAL_BALANCE_FOR_CLAIM.toString(), 6).toString(),
);

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

  it('builds claim transactions as repairs, wrap, adapter claim, then exact-deficit unwrap', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(10n).mockResolvedValueOnce(0n);

    const plan = await planClaim({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      positions: [claimPosition],
      safeAddress: '0x9999999999999999999999999999999999999999',
    });

    expect(plan.gasStationDeficit).toBe(gasStationThresholdRaw);
    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      POLYMARKET_V2_PROTOCOL.claim.standardTarget,
      POLYMARKET_V2_PROTOCOL.collateral.offrampAddress,
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

  it('builds withdraw fallback as repairs, optional unwrap, then usdce transfer', async () => {
    mockGetRawTokenBalance
      .mockResolvedValueOnce(1_000_000n)
      .mockResolvedValueOnce(1_000_000n);

    const plan = await planWithdraw({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: BigInt(parseUnits('2', 6).toString()),
      mode: 'usdce-deficit-unwrap',
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.offrampAddress,
      POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
    ]);
  });

  it('builds withdraw preferred mode as repairs followed by pusd transfer', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(1_000_000n);

    const plan = await planWithdraw({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer,
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: BigInt(parseUnits('2', 6).toString()),
      mode: 'pusd-transfer',
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });
});
