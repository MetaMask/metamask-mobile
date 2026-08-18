import { PredictPosition, PredictPositionStatus } from '../types';
import { isClaimableWinningPosition } from './positions';

const createPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'provider-1',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'Yes',
  outcomeTokenId: 'token-1',
  currentValue: 10,
  title: 'Test position',
  icon: '',
  amount: 10,
  price: 0.5,
  status: PredictPositionStatus.WON,
  size: 20,
  outcomeIndex: 0,
  percentPnl: 100,
  cashPnl: 10,
  claimable: true,
  initialValue: 10,
  avgPrice: 0.5,
  endDate: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('isClaimableWinningPosition', () => {
  it('returns true for a claimable win with positive value', () => {
    const position = createPosition();

    const result = isClaimableWinningPosition(position);

    expect(result).toBe(true);
  });

  it.each<[string, PredictPositionStatus, number]>([
    ['lost', PredictPositionStatus.LOST, 10],
    ['open', PredictPositionStatus.OPEN, 10],
    ['redeemable', PredictPositionStatus.REDEEMABLE, 10],
    ['zero-value won', PredictPositionStatus.WON, 0],
  ])('returns false for a %s position', (_label, status, currentValue) => {
    const position = createPosition({ status, currentValue });

    const result = isClaimableWinningPosition(position);

    expect(result).toBe(false);
  });
});
