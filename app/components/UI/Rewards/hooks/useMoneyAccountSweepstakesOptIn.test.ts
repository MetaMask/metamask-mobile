import { renderHook, act } from '@testing-library/react-hooks';
import { useMoneyAccountSweepstakesOptIn } from './useMoneyAccountSweepstakesOptIn';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesParticipation } from './useMoneyAccountSweepstakesParticipation';
import { useOptInToCampaign } from './useOptInToCampaign';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('./useMoneyAccountSweepstakesSeries', () => ({
  useMoneyAccountSweepstakesSeries: jest.fn(),
}));

jest.mock('./useMoneyAccountSweepstakesParticipation', () => ({
  useMoneyAccountSweepstakesParticipation: jest.fn(),
}));

jest.mock('./useOptInToCampaign', () => ({
  useOptInToCampaign: jest.fn(),
}));

const mockUseSeries = jest.mocked(useMoneyAccountSweepstakesSeries);
const mockUseParticipation = jest.mocked(
  useMoneyAccountSweepstakesParticipation,
);
const mockUseOptInToCampaign = jest.mocked(useOptInToCampaign);
const mockOptInToCampaign = jest.fn();

const FIXED_NOW = new Date('2025-08-15T12:00:00.000Z');

const completeWeek: CampaignDto = {
  id: 'week-complete',
  type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
  name: 'Money Account Sweepstakes',
  startDate: '2025-08-01T00:00:00.000Z',
  endDate: '2025-08-08T00:00:00.000Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
};
const activeWeek: CampaignDto = {
  ...completeWeek,
  id: 'week-active',
  startDate: '2025-08-08T00:00:00.000Z',
  endDate: '2025-08-22T00:00:00.000Z',
};
const upcomingWeek: CampaignDto = {
  ...completeWeek,
  id: 'week-upcoming',
  startDate: '2025-08-22T00:00:00.000Z',
  endDate: '2025-08-29T00:00:00.000Z',
};

function setupHooks({
  campaigns = [upcomingWeek, activeWeek, completeWeek],
  optedInByCampaignId = {} as Record<string, boolean>,
  isSingleOptingIn = false,
} = {}) {
  mockUseSeries.mockReturnValue({
    campaigns,
    first: campaigns[0] ?? null,
    last: campaigns[campaigns.length - 1] ?? null,
    activeCampaign: activeWeek,
    displayCampaign: activeWeek,
    seriesStatus: 'active',
  });
  mockUseParticipation.mockReturnValue({
    optedInAny: Object.values(optedInByCampaignId).some(Boolean),
    optedInByCampaignId,
    isLoading: false,
    refetch: jest.fn(),
  });
  mockUseOptInToCampaign.mockReturnValue({
    optInToCampaign: mockOptInToCampaign,
    isOptingIn: isSingleOptingIn,
    optInError: undefined,
    clearOptInError: jest.fn(),
  });
}

describe('useMoneyAccountSweepstakesOptIn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();
    mockOptInToCampaign.mockResolvedValue({
      optedIn: true,
      participantCount: 1,
    });
    setupHooks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opts into the active week before the upcoming week and skips ended weeks', async () => {
    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.ensureOptedIn();
    });

    expect(success).toBe(true);
    expect(mockOptInToCampaign.mock.calls.map(([id]) => id)).toEqual([
      'week-active',
      'week-upcoming',
    ]);
  });

  it('skips campaigns the user has already opted into', async () => {
    setupHooks({ optedInByCampaignId: { 'week-active': true } });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    await act(async () => {
      await result.current.ensureOptedIn();
    });

    expect(mockOptInToCampaign).toHaveBeenCalledTimes(1);
    expect(mockOptInToCampaign).toHaveBeenCalledWith('week-upcoming');
  });

  it('returns true without any calls when every eligible week is already joined', async () => {
    setupHooks({
      optedInByCampaignId: { 'week-active': true, 'week-upcoming': true },
    });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.ensureOptedIn();
    });

    expect(success).toBe(true);
    expect(mockOptInToCampaign).not.toHaveBeenCalled();
  });

  it('stops and returns false when an opt-in does not report opted in', async () => {
    mockOptInToCampaign.mockResolvedValueOnce({
      optedIn: false,
      participantCount: 0,
    });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.ensureOptedIn();
    });

    expect(success).toBe(false);
    expect(mockOptInToCampaign).toHaveBeenCalledTimes(1);
  });

  it('returns false when an opt-in throws', async () => {
    mockOptInToCampaign.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.ensureOptedIn();
    });

    expect(success).toBe(false);
  });

  it('reports opting in while a single campaign opt-in is in flight', () => {
    setupHooks({ isSingleOptingIn: true });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    expect(result.current.isOptingIn).toBe(true);
  });
});
