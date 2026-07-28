import { renderHook, act } from '@testing-library/react-hooks';
import { useMoneyAccountSweepstakesOptIn } from './useMoneyAccountSweepstakesOptIn';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesBinding } from './useMoneyAccountSweepstakesBinding';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

const mockCall = jest.fn();
const mockDispatch = jest.fn();
const mockEnsureBound = jest.fn(async () => 'bound' as const);

jest.mock('./useMoneyAccountSweepstakesSeries', () => ({
  useMoneyAccountSweepstakesSeries: jest.fn(),
}));

jest.mock('./useMoneyAccountSweepstakesBinding', () => ({
  useMoneyAccountSweepstakesBinding: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: () => 'sub-1',
}));

const mockStatuses: Record<
  string,
  { optedIn: boolean; participantCount: number }
> = {};

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignParticipantStatuses: () => mockStatuses,
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCampaignParticipantStatus: (payload: unknown) => ({
    type: 'setCampaignParticipantStatus',
    payload,
  }),
}));

const mockUseSeries = jest.mocked(useMoneyAccountSweepstakesSeries);
const mockUseBinding = jest.mocked(useMoneyAccountSweepstakesBinding);

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
  image: null,
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

function setupSeries(campaigns = [upcomingWeek, activeWeek, completeWeek]) {
  mockUseSeries.mockReturnValue({
    campaigns,
    first: campaigns[0] ?? null,
    last: campaigns[campaigns.length - 1] ?? null,
    activeCampaign: activeWeek,
    displayCampaign: activeWeek,
    seriesStatus: 'active',
  });
}

describe('useMoneyAccountSweepstakesOptIn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();
    Object.keys(mockStatuses).forEach((key) => delete mockStatuses[key]);
    setupSeries();
    mockEnsureBound.mockResolvedValue('bound');
    mockUseBinding.mockReturnValue({
      ensureBound: mockEnsureBound,
      bindingConflict: false,
    });
    mockCall.mockResolvedValue({
      'week-active': { optedIn: true, participantCount: 1 },
      'week-upcoming': { optedIn: true, participantCount: 1 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('binds first, then batches active then upcoming weeks into one optInToCampaigns call', async () => {
    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let optInResult: { success: boolean; reason?: string } | undefined;
    await act(async () => {
      optInResult = await result.current.ensureOptedIn();
    });

    expect(optInResult).toEqual({ success: true });
    expect(mockEnsureBound).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:optInToCampaigns',
      ['week-active', 'week-upcoming'],
      'sub-1',
    );
    expect(mockDispatch).toHaveBeenCalledTimes(2);
  });

  it('blocks opt-in and does not call optInToCampaigns on binding conflict', async () => {
    mockEnsureBound.mockResolvedValue('conflict');

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let optInResult: { success: boolean; reason?: string } | undefined;
    await act(async () => {
      optInResult = await result.current.ensureOptedIn();
    });

    expect(optInResult).toEqual({
      success: false,
      reason: 'binding-conflict',
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('proceeds with opt-in when binding is unavailable', async () => {
    mockEnsureBound.mockResolvedValue('unavailable');

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let optInResult: { success: boolean; reason?: string } | undefined;
    await act(async () => {
      optInResult = await result.current.ensureOptedIn();
    });

    expect(optInResult).toEqual({ success: true });
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('skips campaigns the user has already opted into', async () => {
    mockStatuses['sub-1:week-active'] = {
      optedIn: true,
      participantCount: 1,
    };
    mockCall.mockResolvedValue({
      'week-upcoming': { optedIn: true, participantCount: 1 },
    });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    await act(async () => {
      await result.current.ensureOptedIn();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:optInToCampaigns',
      ['week-upcoming'],
      'sub-1',
    );
  });

  it('returns success without opt-in calls when every eligible week is already joined', async () => {
    mockStatuses['sub-1:week-active'] = {
      optedIn: true,
      participantCount: 1,
    };
    mockStatuses['sub-1:week-upcoming'] = {
      optedIn: true,
      participantCount: 1,
    };

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let optInResult: { success: boolean; reason?: string } | undefined;
    await act(async () => {
      optInResult = await result.current.ensureOptedIn();
    });

    expect(optInResult).toEqual({ success: true });
    expect(mockEnsureBound).toHaveBeenCalledTimes(1);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns success false when a batch result is not opted in', async () => {
    mockCall.mockResolvedValue({
      'week-active': { optedIn: false, participantCount: 0 },
      'week-upcoming': { optedIn: true, participantCount: 1 },
    });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let optInResult: { success: boolean; reason?: string } | undefined;
    await act(async () => {
      optInResult = await result.current.ensureOptedIn();
    });

    expect(optInResult).toEqual({ success: false });
  });

  it('returns success false when the batch call throws', async () => {
    mockCall.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    let optInResult: { success: boolean; reason?: string } | undefined;
    await act(async () => {
      optInResult = await result.current.ensureOptedIn();
    });

    expect(optInResult).toEqual({ success: false });
  });
});
