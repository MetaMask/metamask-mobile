import type { PredictThePitchPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { groupPositionsByDate } from './PredictThePitchPortfolio.utils';

jest.mock('../../utils/formatUtils', () => ({
  formatRewardsDateLabel: (date: Date) => date.toISOString().slice(0, 10),
}));

const makePosition = (
  overrides: Partial<PredictThePitchPositionDto> & {
    outcomeAssetId: string;
    fillDate: string;
  },
): PredictThePitchPositionDto => ({
  outcomeAsset: 'Yes',
  conditionId: 'condition-1',
  conditionName: 'Match winner',
  conditionSlug: null,
  eventId: null,
  eventSlug: null,
  iconUrl: null,
  capitalDeployed: 10,
  pnl: 0,
  roi: 0,
  status: 'open',
  fillShares: 5,
  fillSharesBought: 5,
  fillSharesSold: 0,
  fillPrice: 0.5,
  ...overrides,
});

describe('groupPositionsByDate', () => {
  it('returns an empty list for no positions', () => {
    expect(groupPositionsByDate([])).toEqual([]);
  });

  it('inserts one date header per calendar day', () => {
    const positions = [
      makePosition({
        outcomeAssetId: 'a',
        fillDate: '2025-06-03T10:00:00.000Z',
      }),
      makePosition({
        outcomeAssetId: 'b',
        fillDate: '2025-06-03T18:00:00.000Z',
      }),
      makePosition({
        outcomeAssetId: 'c',
        fillDate: '2025-06-01T12:00:00.000Z',
      }),
    ];

    const grouped = groupPositionsByDate(positions);

    expect(grouped).toEqual([
      {
        kind: 'date-header',
        dateKey: '2025-06-03',
        label: '2025-06-03',
      },
      { kind: 'position', position: positions[0], index: 0 },
      { kind: 'position', position: positions[1], index: 1 },
      {
        kind: 'date-header',
        dateKey: '2025-06-01',
        label: '2025-06-01',
      },
      { kind: 'position', position: positions[2], index: 2 },
    ]);
  });
});
