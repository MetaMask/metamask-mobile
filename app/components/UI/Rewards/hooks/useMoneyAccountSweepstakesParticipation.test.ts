import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useMoneyAccountSweepstakesParticipation } from './useMoneyAccountSweepstakesParticipation';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatuses } from '../../../../reducers/rewards/selectors';
import { setCampaignParticipantStatus } from '../../../../reducers/rewards';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('./useMoneyAccountSweepstakesSeries', () => ({
  useMoneyAccountSweepstakesSeries: jest.fn(),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignParticipantStatuses: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCampaignParticipantStatus: jest.fn((payload) => ({
    type: 'rewards/setCampaignParticipantStatus',
    payload,
  })),
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);
const mockUseSelector = jest.mocked(useSelector);
const mockUseDispatch = jest.mocked(useDispatch);
const mockUseSeries = jest.mocked(useMoneyAccountSweepstakesSeries);
const mockUseInvalidateByRewardEvents = jest.mocked(
  useInvalidateByRewardEvents,
);

const SUBSCRIPTION_ID = 'sub-1';

let lastSetup: {
  campaigns: CampaignDto[];
  subscriptionId: string | null;
};

function buildCampaign(id: string): CampaignDto {
  return {
    id,
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
}

function defaultCampaigns() {
  return [buildCampaign('week-1'), buildCampaign('week-2')];
}

function setupHooks({
  campaigns = defaultCampaigns(),
  subscriptionId = SUBSCRIPTION_ID as string | null,
  statuses = {} as Record<string, { optedIn: boolean }>,
} = {}) {
  lastSetup = { campaigns, subscriptionId };
  mockUseSeries.mockReturnValue({
    campaigns,
    first: campaigns[0] ?? null,
    last: campaigns[campaigns.length - 1] ?? null,
    activeCampaign: campaigns[0] ?? null,
    displayCampaign: campaigns[0] ?? null,
    seriesStatus: campaigns.length > 0 ? 'active' : null,
  });
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === selectCampaignParticipantStatuses) return statuses;
    return undefined;
  });
}

/**
 * Renders the hook and waits for the initial status fetch (or no-op) to settle.
 */
async function renderParticipation(enabled: boolean = true) {
  const rendered = renderHook(() =>
    useMoneyAccountSweepstakesParticipation(enabled),
  );

  const shouldFetch =
    enabled &&
    Boolean(lastSetup.subscriptionId) &&
    lastSetup.campaigns.length > 0;

  if (shouldFetch) {
    await waitFor(() => {
      expect(mockCall).toHaveBeenCalled();
      expect(rendered.result.current.isLoading).toBe(false);
    });
  } else {
    await waitFor(() => {
      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalled();
      expect(rendered.result.current.isLoading).toBe(false);
    });
  }

  return rendered;
}

describe('useMoneyAccountSweepstakesParticipation', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    lastSetup = {
      campaigns: defaultCampaigns(),
      subscriptionId: SUBSCRIPTION_ID,
    };
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockCall.mockResolvedValue({
      optedIn: true,
      participantCount: 1,
    } as never);
    setupHooks();
  });

  it('fetches participant status for every campaign in the series', async () => {
    await renderParticipation();

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getCampaignParticipantStatus',
      'week-1',
      SUBSCRIPTION_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignParticipantStatus({
        subscriptionId: SUBSCRIPTION_ID,
        campaignId: 'week-2',
        status: { optedIn: true, participantCount: 1 },
      }),
    );
  });

  it('does not fetch when disabled', async () => {
    await renderParticipation(false);

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no rewards subscription', async () => {
    setupHooks({ subscriptionId: null });

    await renderParticipation();

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not fetch when the series has no campaigns', async () => {
    setupHooks({ campaigns: [] });

    await renderParticipation();

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('maps stored statuses per campaign and reports opted in for any week', async () => {
    setupHooks({
      statuses: {
        [`${SUBSCRIPTION_ID}:week-2`]: { optedIn: true },
      },
    });

    const { result } = await renderParticipation();

    expect(result.current.optedInByCampaignId).toEqual({
      'week-1': false,
      'week-2': true,
    });
    expect(result.current.optedInAny).toBe(true);
  });

  it('reports not opted in when no campaign has a stored opt-in', async () => {
    const { result } = await renderParticipation();

    expect(result.current.optedInAny).toBe(false);
  });

  it('returns an empty status map when there is no subscription', async () => {
    setupHooks({ subscriptionId: null });

    const { result } = await renderParticipation();

    expect(result.current.optedInByCampaignId).toEqual({});
    expect(result.current.optedInAny).toBe(false);
  });

  it('refetches when a campaign opt-in event fires', async () => {
    await renderParticipation();
    mockCall.mockClear();

    const [events, callback] =
      mockUseInvalidateByRewardEvents.mock.calls[
        mockUseInvalidateByRewardEvents.mock.calls.length - 1
      ];
    expect(events).toEqual(['RewardsController:campaignOptedIn']);

    await act(async () => {
      await callback();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
