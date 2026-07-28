import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

const FIXED_NOW = new Date('2025-08-15T12:00:00.000Z');

function buildCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'mas-week-1',
    type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
    name: 'Money Account Sweepstakes',
    startDate: '2025-08-01T00:00:00.000Z',
    endDate: '2025-08-08T00:00:00.000Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    showUpcomingDate: false,
    ...overrides,
  };
}

describe('useMoneyAccountSweepstakesSeries', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an empty series when no campaigns are in state', () => {
    mockUseSelector.mockReturnValue(undefined);

    const { result } = renderHook(() => useMoneyAccountSweepstakesSeries());

    expect(result.current).toEqual({
      campaigns: [],
      first: null,
      last: null,
      activeCampaign: null,
      displayCampaign: null,
      seriesStatus: null,
    });
  });

  it('ignores campaigns of other types', () => {
    mockUseSelector.mockReturnValue([
      buildCampaign({ id: 'ondo', type: CampaignType.ONDO_HOLDING }),
    ]);

    const { result } = renderHook(() => useMoneyAccountSweepstakesSeries());

    expect(result.current.campaigns).toEqual([]);
    expect(result.current.seriesStatus).toBeNull();
  });

  it('sorts weeks by start date and exposes the active week as the display campaign', () => {
    const week1 = buildCampaign({
      id: 'week-1',
      startDate: '2025-08-01T00:00:00.000Z',
      endDate: '2025-08-08T00:00:00.000Z',
    });
    const week2 = buildCampaign({
      id: 'week-2',
      startDate: '2025-08-08T00:00:00.000Z',
      endDate: '2025-08-22T00:00:00.000Z',
    });
    mockUseSelector.mockReturnValue([week2, week1]);

    const { result } = renderHook(() => useMoneyAccountSweepstakesSeries());

    expect(result.current.campaigns.map((c) => c.id)).toEqual([
      'week-1',
      'week-2',
    ]);
    expect(result.current.first?.id).toBe('week-1');
    expect(result.current.last?.id).toBe('week-2');
    expect(result.current.activeCampaign?.id).toBe('week-2');
    expect(result.current.displayCampaign?.id).toBe('week-2');
    expect(result.current.seriesStatus).toBe('active');
  });

  it('reports an upcoming series and displays the first week before it starts', () => {
    mockUseSelector.mockReturnValue([
      buildCampaign({
        id: 'future-week',
        startDate: '2025-09-01T00:00:00.000Z',
        endDate: '2025-09-08T00:00:00.000Z',
      }),
    ]);

    const { result } = renderHook(() => useMoneyAccountSweepstakesSeries());

    expect(result.current.seriesStatus).toBe('upcoming');
    expect(result.current.activeCampaign).toBeNull();
    expect(result.current.displayCampaign?.id).toBe('future-week');
  });

  it('reports a previous series and displays the last week after it ends', () => {
    mockUseSelector.mockReturnValue([
      buildCampaign({
        id: 'old-week-1',
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-06-08T00:00:00.000Z',
      }),
      buildCampaign({
        id: 'old-week-2',
        startDate: '2025-06-08T00:00:00.000Z',
        endDate: '2025-06-15T00:00:00.000Z',
      }),
    ]);

    const { result } = renderHook(() => useMoneyAccountSweepstakesSeries());

    expect(result.current.seriesStatus).toBe('previous');
    expect(result.current.activeCampaign).toBeNull();
    expect(result.current.displayCampaign?.id).toBe('old-week-2');
  });
});
