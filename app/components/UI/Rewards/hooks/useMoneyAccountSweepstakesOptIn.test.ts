import { renderHook, act } from '@testing-library/react-hooks';
import {
  useMoneyAccountSweepstakesOptIn,
  useResumePendingMasSeriesOptIn,
} from './useMoneyAccountSweepstakesOptIn';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesBinding } from './useMoneyAccountSweepstakesBinding';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

const mockCall = jest.fn();
const mockDispatch = jest.fn();
const mockEnsureBound = jest.fn(
  async (): Promise<'bound' | 'conflict' | 'unavailable'> => 'bound',
);
const mockUseFocusEffect = jest.fn((effect: () => void | (() => void)) => {
  effect();
});

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void | (() => void)) =>
    mockUseFocusEffect(effect),
}));

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

let mockSubscriptionId: string | null = 'sub-1';

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: () => mockSubscriptionId,
}));

let mockStatuses: Record<
  string,
  { optedIn: boolean; participantCount: number }
> = {};

let mockPending = {
  needsRetry: false,
  subscriptionId: null as string | null,
};

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignParticipantStatuses: () => mockStatuses,
  selectPendingMasSeriesOptIn: () => mockPending,
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCampaignParticipantStatus: (payload: unknown) => ({
    type: 'setCampaignParticipantStatus',
    payload,
  }),
  setPendingMasSeriesOptIn: (payload: unknown) => ({
    type: 'setPendingMasSeriesOptIn',
    payload,
  }),
  clearPendingMasSeriesOptIn: () => ({
    type: 'clearPendingMasSeriesOptIn',
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
    mockStatuses = {};
    mockPending = { needsRetry: false, subscriptionId: null };
    mockSubscriptionId = 'sub-1';
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

  async function runEnsureOptedIn(
    ensureOptedIn: () => Promise<{ success: boolean; reason?: string }>,
  ) {
    let optInResult: { success: boolean; reason?: string } | undefined;
    await act(async () => {
      optInResult = await ensureOptedIn();
      jest.runAllTimers();
    });
    return optInResult;
  }

  it('binds first, then batches active then upcoming weeks into one optInToCampaigns call', async () => {
    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    const optInResult = await runEnsureOptedIn(result.current.ensureOptedIn);

    expect(optInResult).toEqual({ success: true });
    expect(mockEnsureBound).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:optInToCampaigns',
      ['week-active', 'week-upcoming'],
      'sub-1',
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'clearPendingMasSeriesOptIn',
    });
  });

  it('blocks opt-in and does not call optInToCampaigns on binding conflict', async () => {
    mockEnsureBound.mockResolvedValue('conflict');

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    const optInResult = await runEnsureOptedIn(result.current.ensureOptedIn);

    expect(optInResult).toEqual({
      success: false,
      reason: 'binding-conflict',
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('proceeds with opt-in when binding is unavailable', async () => {
    mockEnsureBound.mockResolvedValue('unavailable');

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    const optInResult = await runEnsureOptedIn(result.current.ensureOptedIn);

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

    await runEnsureOptedIn(result.current.ensureOptedIn);

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:optInToCampaigns',
      ['week-upcoming'],
      'sub-1',
    );
  });

  it('returns success and clears pending when every eligible week is already joined', async () => {
    mockStatuses['sub-1:week-active'] = {
      optedIn: true,
      participantCount: 1,
    };
    mockStatuses['sub-1:week-upcoming'] = {
      optedIn: true,
      participantCount: 1,
    };

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    const optInResult = await runEnsureOptedIn(result.current.ensureOptedIn);

    expect(optInResult).toEqual({ success: true });
    expect(mockEnsureBound).toHaveBeenCalledTimes(1);
    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'clearPendingMasSeriesOptIn',
    });
  });

  it('returns success and sets pending when active succeeds but upcoming fails', async () => {
    mockCall.mockResolvedValue({
      'week-active': { optedIn: true, participantCount: 1 },
      'week-upcoming': { optedIn: false, participantCount: 0 },
    });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    const optInResult = await runEnsureOptedIn(result.current.ensureOptedIn);

    expect(optInResult).toEqual({ success: true });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'setPendingMasSeriesOptIn',
      payload: { needsRetry: true, subscriptionId: 'sub-1' },
    });
  });

  it('returns success false and sets pending when active fails after the batch', async () => {
    mockCall.mockResolvedValue({
      'week-active': { optedIn: false, participantCount: 0 },
      'week-upcoming': { optedIn: true, participantCount: 1 },
    });

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    const optInResult = await runEnsureOptedIn(result.current.ensureOptedIn);

    expect(optInResult).toEqual({ success: false });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'setPendingMasSeriesOptIn',
      payload: { needsRetry: true, subscriptionId: 'sub-1' },
    });
  });

  it('returns success false when the batch call throws and active is not yet opted in', async () => {
    mockCall.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useMoneyAccountSweepstakesOptIn());

    const optInResult = await runEnsureOptedIn(result.current.ensureOptedIn);

    expect(optInResult).toEqual({ success: false });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'setPendingMasSeriesOptIn',
      payload: { needsRetry: true, subscriptionId: 'sub-1' },
    });
  });
});

describe('useResumePendingMasSeriesOptIn', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockStatuses = {};
    mockPending = { needsRetry: false, subscriptionId: null };
    mockSubscriptionId = 'sub-1';
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

  it('does not resume when needsRetry is false', () => {
    renderHook(() => useResumePendingMasSeriesOptIn());
    expect(mockEnsureBound).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('resumes when needsRetry matches the current subscription', async () => {
    mockPending = { needsRetry: true, subscriptionId: 'sub-1' };

    await act(async () => {
      renderHook(() => useResumePendingMasSeriesOptIn());
    });

    // Resume invokes ensureOptedIn (binding asserted first).
    expect(mockEnsureBound).toHaveBeenCalledTimes(1);
  });

  it('does not resume when subscriptionId does not match', () => {
    mockPending = { needsRetry: true, subscriptionId: 'other-sub' };

    renderHook(() => useResumePendingMasSeriesOptIn());

    expect(mockEnsureBound).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not resume when there is no subscription', () => {
    mockPending = { needsRetry: true, subscriptionId: 'sub-1' };
    mockSubscriptionId = null;

    renderHook(() => useResumePendingMasSeriesOptIn());

    expect(mockEnsureBound).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });
});
