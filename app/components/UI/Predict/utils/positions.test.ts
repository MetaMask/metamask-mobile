import { PredictPositionStatus, type PredictPosition } from '../types';
import { isActionableClaimablePosition } from './positions';

const createPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'Yes',
  outcomeTokenId: 'token-1',
  outcomeIndex: 0,
  title: 'Market 1',
  icon: 'https://example.com/icon.png',
  amount: 10,
  price: 0.5,
  size: 10,
  status: PredictPositionStatus.OPEN,
  percentPnl: 0,
  cashPnl: 0,
  currentValue: 5,
  initialValue: 5,
  avgPrice: 0.5,
  claimable: false,
  endDate: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('isActionableClaimablePosition', () => {
  it.each([
    { status: PredictPositionStatus.WON, expected: true },
    { status: PredictPositionStatus.REDEEMABLE, expected: true },
    { status: PredictPositionStatus.LOST, expected: false },
    { status: PredictPositionStatus.OPEN, expected: false },
  ])('returns $expected for $status positions', ({ status, expected }) => {
    expect(isActionableClaimablePosition(createPosition({ status }))).toBe(
      expected,
    );
  });

  it('does not gate on P&L or current value', () => {
    const pushBoughtAbove50c = createPosition({
      status: PredictPositionStatus.REDEEMABLE,
      claimable: true,
      cashPnl: -1.2,
      currentValue: 5,
    });

    expect(isActionableClaimablePosition(pushBoughtAbove50c)).toBe(true);
  });
});
