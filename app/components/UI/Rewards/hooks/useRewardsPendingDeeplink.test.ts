import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useRewardsPendingDeeplink } from './useRewardsPendingDeeplink';
import Routes from '../../../../constants/navigation/Routes';
import { handleDeeplink } from '../../../../core/DeeplinkManager';
import {
  selectCampaignsFetching,
  selectPendingDeeplink,
} from '../../../../reducers/rewards/selectors';
import { setPendingDeeplink } from '../../../../reducers/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useRewardCampaigns } from './useRewardCampaigns';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import type { MoneyAccountSweepstakesSeries } from '../utils/moneyAccountSweepstakesSeries';

// Unit coverage: both Rewards homes share this hook, and the behavior is
// navigation from Redux rather than either screen's UI. A component-view test
// of one dashboard cannot show that the other home consumes the same deeplink.

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../core/DeeplinkManager', () => ({
  handleDeeplink: jest.fn(),
}));

const mockHandleDeeplink = handleDeeplink as jest.MockedFunction<
  typeof handleDeeplink
>;

jest.mock('./useRewardCampaigns', () => ({
  useRewardCampaigns: jest.fn(),
}));

jest.mock('./useMoneyAccountSweepstakesSeries', () => ({
  useMoneyAccountSweepstakesSeries: jest.fn(),
}));

const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;
const mockUseMoneyAccountSweepstakesSeries =
  useMoneyAccountSweepstakesSeries as jest.MockedFunction<
    typeof useMoneyAccountSweepstakesSeries
  >;

const emptyMoneyAccountSeries: MoneyAccountSweepstakesSeries = {
  campaigns: [],
  first: null,
  last: null,
  activeCampaign: null,
  displayCampaign: null,
  seriesStatus: null,
};

describe('useRewardsPendingDeeplink', () => {
  interface DeeplinkSelectorOverrides {
    subscriptionId?: string | null;
    campaignsFetching?: boolean;
  }

  const setDeeplinkSelectors = (
    pendingDeeplink: Record<string, unknown> | null,
    selectorOverrides: DeeplinkSelectorOverrides = {},
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPendingDeeplink) return pendingDeeplink;
      if (selector === selectCampaignsFetching)
        return selectorOverrides.campaignsFetching ?? false;
      if (selector === selectRewardsSubscriptionId)
        return 'subscriptionId' in selectorOverrides
          ? selectorOverrides.subscriptionId
          : 'test-subscription-id';
      return undefined;
    });
  };

  const renderWithPendingDeeplink = (
    pendingDeeplink: Record<string, unknown> | null,
    selectorOverrides: DeeplinkSelectorOverrides = {},
    enabled = true,
  ) => {
    setDeeplinkSelectors(pendingDeeplink, selectorOverrides);
    return renderHook(() => useRewardsPendingDeeplink({ enabled }));
  };

  /**
   * Renders through the real fetch sequence: a campaigns fetch starts, then it
   * settles. Deeplink resolution deliberately waits for a fetch to have been
   * observed, so a single render can never resolve one.
   */
  const renderAfterSettledFetch = (
    pendingDeeplink: Record<string, unknown> | null,
    selectorOverrides: DeeplinkSelectorOverrides = {},
  ) => {
    const view = renderWithPendingDeeplink(pendingDeeplink, {
      ...selectorOverrides,
      campaignsFetching: true,
    });
    setDeeplinkSelectors(pendingDeeplink, {
      ...selectorOverrides,
      campaignsFetching: false,
    });
    view.rerender();
    return view;
  };

  const activeMoneyCampaign: CampaignDto = {
    id: 'week-2',
    type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
    name: 'Money Account Sweepstakes',
    startDate: '2026-07-08T00:00:00.000Z',
    endDate: '2026-07-15T00:00:00.000Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: {
      howItWorks: {
        title: 'How it works',
        description: 'Enter the weekly draw',
        steps: [],
        tour: [
          {
            title: 'Step 1',
            description: 'Description 1',
            image: null,
            actions: null,
          },
        ],
      },
    },
    featured: false,
    showUpcomingDate: false,
  };

  const activeMoneySeries: MoneyAccountSweepstakesSeries = {
    campaigns: [activeMoneyCampaign],
    first: activeMoneyCampaign,
    last: activeMoneyCampaign,
    activeCampaign: activeMoneyCampaign,
    displayCampaign: activeMoneyCampaign,
    seriesStatus: 'active',
  };

  const previousMoneySeries: MoneyAccountSweepstakesSeries = {
    campaigns: [activeMoneyCampaign],
    first: activeMoneyCampaign,
    last: activeMoneyCampaign,
    activeCampaign: null,
    displayCampaign: activeMoneyCampaign,
    seriesStatus: 'previous',
  };

  const upcomingMoneySeries: MoneyAccountSweepstakesSeries = {
    campaigns: [activeMoneyCampaign],
    first: activeMoneyCampaign,
    last: activeMoneyCampaign,
    activeCampaign: null,
    displayCampaign: activeMoneyCampaign,
    seriesStatus: 'upcoming',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardCampaigns.mockReturnValue({
      campaigns: [],
      categorizedCampaigns: { active: [], upcoming: [], previous: [] },
      isLoading: false,
      hasError: false,
      hasLoaded: true,
      fetchCampaigns: jest.fn(),
    });
    mockUseMoneyAccountSweepstakesSeries.mockReturnValue(
      emptyMoneyAccountSeries,
    );
  });

  it('does not navigate while the Rewards home is onboarding or update-required', () => {
    renderWithPendingDeeplink({ campaign: 'ondo' }, {}, false);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it.each([
    ['page', 'campaigns', Routes.REWARDS_CAMPAIGNS_VIEW],
    ['campaign', 'ondo', Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW],
    ['campaign', 'season1', Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW],
    [
      'campaign',
      'predict-the-pitch',
      Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
    ],
  ])(
    'routes %s=%s into the rewards flow and clears the pending deeplink',
    (key, value, expectedScreen) => {
      renderWithPendingDeeplink({ [key]: value });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: expectedScreen,
        params: undefined,
      });
      expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
    },
  );

  describe('campaign=perps-comp', () => {
    const buildPerpsCampaign = (
      overrides: Partial<CampaignDto> = {},
    ): CampaignDto => ({
      id: 'perps-active',
      type: CampaignType.PERPS_TRADING,
      name: 'Perps Competition',
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2099-01-01T00:00:00.000Z',
      termsAndConditions: null,
      excludedRegions: [],
      details: null,
      featured: false,
      showUpcomingDate: false,
      ...overrides,
    });

    const mockCampaigns = (
      campaigns: CampaignDto[],
      overrides: { isLoading?: boolean; hasError?: boolean } = {},
    ) => {
      mockUseRewardCampaigns.mockReturnValue({
        campaigns,
        categorizedCampaigns: { active: [], upcoming: [], previous: [] },
        isLoading: overrides.isLoading ?? false,
        hasError: overrides.hasError ?? false,
        hasLoaded: true,
        fetchCampaigns: jest.fn(),
      });
    };

    it('navigates to the active perps campaign with its id', () => {
      mockCampaigns([
        buildPerpsCampaign({
          id: 'perps-past',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2020-02-01T00:00:00.000Z',
        }),
        buildPerpsCampaign({ id: 'perps-active' }),
      ]);

      renderAfterSettledFetch({ campaign: 'perps-comp' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
        params: { campaignId: 'perps-active' },
      });
      expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('stays on the home when only a past perps campaign exists', () => {
      mockCampaigns([
        buildPerpsCampaign({
          id: 'perps-past',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2020-02-01T00:00:00.000Z',
        }),
      ]);

      renderAfterSettledFetch({ campaign: 'perps-comp' });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('stays on the home when only an upcoming perps campaign exists', () => {
      mockCampaigns([
        buildPerpsCampaign({
          id: 'perps-upcoming',
          startDate: '2098-01-01T00:00:00.000Z',
          endDate: '2099-01-01T00:00:00.000Z',
        }),
      ]);

      renderAfterSettledFetch({ campaign: 'perps-comp' });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('keeps the deeplink pending while campaigns are still loading', () => {
      mockCampaigns([], { isLoading: true });

      renderWithPendingDeeplink({ campaign: 'perps-comp' });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('keeps the deeplink pending when the campaigns fetch failed', () => {
      mockCampaigns([], { hasError: true });

      renderWithPendingDeeplink({ campaign: 'perps-comp' });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('keeps the deeplink pending on the commit before a fetch starts', () => {
      mockCampaigns([
        buildPerpsCampaign({
          id: 'perps-past',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2020-02-01T00:00:00.000Z',
        }),
      ]);

      renderWithPendingDeeplink(
        { campaign: 'perps-comp' },
        { campaignsFetching: false },
      );

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('keeps the deeplink pending when there is no subscription yet', () => {
      mockCampaigns([]);

      renderWithPendingDeeplink(
        { campaign: 'perps-comp' },
        { subscriptionId: null },
      );

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('keeps the deeplink pending while a refresh runs over a stale list', () => {
      mockCampaigns([
        buildPerpsCampaign({
          id: 'perps-past',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2020-02-01T00:00:00.000Z',
        }),
      ]);

      renderWithPendingDeeplink(
        { campaign: 'perps-comp' },
        { campaignsFetching: true },
      );

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
    });
  });

  it('opens the Money deeplink and clears the pending deeplink for page=musd', () => {
    renderWithPendingDeeplink({ page: 'musd' });

    expect(mockHandleDeeplink).toHaveBeenCalledWith({
      uri: 'metamask://money',
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('navigates directly to the benefits full view for page=benefits', () => {
    renderWithPendingDeeplink({ page: 'benefits' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARD_BENEFITS_FULL_VIEW);
    expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('does nothing when there is no pending deeplink', () => {
    renderWithPendingDeeplink(null);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('does not clear the pending deeplink for an unrecognized page/campaign', () => {
    renderWithPendingDeeplink({ page: 'totally-unknown' });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('waits for campaigns to load before handling campaign=money', () => {
    mockUseRewardCampaigns.mockReturnValue({
      campaigns: [],
      categorizedCampaigns: { active: [], upcoming: [], previous: [] },
      isLoading: true,
      hasError: false,
      hasLoaded: false,
      fetchCampaigns: jest.fn(),
    });

    renderWithPendingDeeplink({ campaign: 'money' });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('keeps pending campaign=money when campaigns failed with an empty series', () => {
    mockUseRewardCampaigns.mockReturnValue({
      campaigns: [],
      categorizedCampaigns: { active: [], upcoming: [], previous: [] },
      isLoading: false,
      hasError: true,
      hasLoaded: true,
      fetchCampaigns: jest.fn(),
    });

    renderWithPendingDeeplink({ campaign: 'money' });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('keeps pending campaign=money while a campaigns retry is in flight with an empty series', () => {
    mockUseRewardCampaigns.mockReturnValue({
      campaigns: [],
      categorizedCampaigns: { active: [], upcoming: [], previous: [] },
      isLoading: true,
      hasError: false,
      hasLoaded: true,
      fetchCampaigns: jest.fn(),
    });

    renderWithPendingDeeplink({ campaign: 'money' });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('still routes campaign=money when a campaigns refresh failed but series data already exists', () => {
    mockUseRewardCampaigns.mockReturnValue({
      campaigns: [activeMoneyCampaign],
      categorizedCampaigns: {
        active: [activeMoneyCampaign],
        upcoming: [],
        previous: [],
      },
      isLoading: false,
      hasError: true,
      hasLoaded: true,
      fetchCampaigns: jest.fn(),
    });
    mockUseMoneyAccountSweepstakesSeries.mockReturnValue(previousMoneySeries);

    renderWithPendingDeeplink({ campaign: 'money' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: 'week-2' },
    });
    expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('stays on the home and clears pending deeplink for upcoming money series', () => {
    mockUseMoneyAccountSweepstakesSeries.mockReturnValue(upcomingMoneySeries);

    renderWithPendingDeeplink({ campaign: 'money' });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('routes campaign=money to details for previous series', () => {
    mockUseMoneyAccountSweepstakesSeries.mockReturnValue(previousMoneySeries);

    renderWithPendingDeeplink({ campaign: 'money' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: 'week-2' },
    });
    expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
  });

  it('routes campaign=money to details when series is active, even if a tour exists', () => {
    mockUseMoneyAccountSweepstakesSeries.mockReturnValue(activeMoneySeries);

    renderWithPendingDeeplink({ campaign: 'money' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: 'week-2' },
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.REWARDS_FLOW,
      expect.objectContaining({
        screen: Routes.REWARDS_CAMPAIGN_TOUR_STEP,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
  });
});
