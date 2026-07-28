import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import MoneyAccountSweepstakesCampaignDetailsView, {
  MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW_TEST_IDS,
} from './MoneyAccountSweepstakesCampaignDetailsView';
import {
  CampaignType,
  type CampaignDto,
  type MoneyAccountSweepstakesCampaignDetails,
  type MoneyAccountSweepstakesLocalizedTextDto,
  type MoneyAccountSweepstakesStatsMeDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useMoneyAccountSweepstakesSeries } from '../hooks/useMoneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesParticipation } from '../hooks/useMoneyAccountSweepstakesParticipation';
import { useGetMoneyAccountSweepstakesStatsMe } from '../hooks/useGetMoneyAccountSweepstakesStatsMe';
import Routes from '../../../../constants/navigation/Routes';
import type { MoneyAccountSweepstakesSeries } from '../utils/moneyAccountSweepstakesSeries';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockFetchCampaigns = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Skeleton: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { testID: 'skeleton', ...props }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        endButtonIconProps,
      }: {
        title: string;
        onBack: () => void;
        endButtonIconProps?: { testID?: string; onPress?: () => void }[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'money-account-sweepstakes-details-back-button',
          }),
          ...(endButtonIconProps ?? []).map((btn, index) =>
            ReactActual.createElement(Pressable, {
              key: index,
              onPress: btn.onPress,
              testID: btn.testID ?? `end-button-${index}`,
            }),
          ),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, props, children),
  };
});

jest.mock('../components/Campaigns/CampaignStatus', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-status' }),
  };
});

jest.mock('../components/Campaigns/CampaignHowItWorks', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-how-it-works' }),
  };
});

jest.mock(
  '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesStatsSummary',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        ReactActual.createElement(View, {
          testID: 'money-account-sweepstakes-stats-summary',
        }),
    };
  },
);

jest.mock(
  '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesDrawScheduleSection',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        ReactActual.createElement(View, {
          testID: 'money-account-sweepstakes-draw-schedule',
        }),
    };
  },
);

jest.mock(
  '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignCTA',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        ReactActual.createElement(View, {
          testID: 'money-account-sweepstakes-cta',
        }),
    };
  },
);

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onConfirm }: { onConfirm?: () => void }) =>
      ReactActual.createElement(
        View,
        { testID: 'error-banner' },
        ReactActual.createElement(Pressable, {
          testID: 'error-banner-retry',
          onPress: onConfirm,
        }),
      ),
  };
});

jest.mock('../hooks/useRewardCampaigns');
jest.mock('../hooks/useMoneyAccountSweepstakesSeries');
jest.mock('../hooks/useMoneyAccountSweepstakesParticipation');
jest.mock('../hooks/useGetMoneyAccountSweepstakesStatsMe');
jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

const mockEnsureBound = jest.fn(async () => 'bound' as const);
const mockShowToast = jest.fn();
const mockEntriesClosed = jest.fn(() => ({ variant: 'icon' }));

jest.mock('../hooks/useMoneyAccountSweepstakesBinding', () => ({
  useMoneyAccountSweepstakesBinding: () => ({
    ensureBound: mockEnsureBound,
    bindingConflict: false,
  }),
}));

jest.mock('../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      entriesClosed: mockEntriesClosed,
    },
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseRewardCampaigns = useRewardCampaigns as jest.MockedFunction<
  typeof useRewardCampaigns
>;
const mockUseMoneyAccountSweepstakesSeries =
  useMoneyAccountSweepstakesSeries as jest.MockedFunction<
    typeof useMoneyAccountSweepstakesSeries
  >;
const mockUseMoneyAccountSweepstakesParticipation =
  useMoneyAccountSweepstakesParticipation as jest.MockedFunction<
    typeof useMoneyAccountSweepstakesParticipation
  >;
const mockUseGetMoneyAccountSweepstakesStatsMe =
  useGetMoneyAccountSweepstakesStatsMe as jest.MockedFunction<
    typeof useGetMoneyAccountSweepstakesStatsMe
  >;

const localizedText: MoneyAccountSweepstakesLocalizedTextDto = {
  currentBalanceTitle: 'Current balance',
  currentBalanceDescription: 'Current balance description',
  eligibleBalanceTitle: 'Eligible balance',
  eligibleBalanceDescription: 'Eligible balance description',
  entriesTitle: 'Entries',
  entriesDescription: 'Entries description',
  entriesCountValue: '{count} / 7',
  drawScheduleTitle: 'Draw schedule',
  addFundsTitle: 'Add funds',
  weekTitle: 'Week {number}',
  completeLabel: 'Complete',
  activeLabel: 'Active',
  joinTheSweepstakesTitle: 'Join the Sweepstakes',
  drawPendingTitle: 'Draw pending',
  drawCompleteTitle: 'Winners drawn',
  drawProofTitle: 'Draw proof',
  merkleRootLabel: 'Merkle root',
  formulaLabel: 'Formula',
  drawFormulaLabel: 'Weighted raffle (Efraimidis–Spirakis)',
  drawFormulaDescription:
    'Each day you held at least $100 in your Money Account earned you an entry.',
  seedBlockLabel: 'Seed block number',
  seedBlockHashLabel: 'Seed block hash',
  drawProofEntriesLabel: 'Entries',
  winnersLabel: 'Winners',
  reservesLabel: 'Reserves',
  originalDrawTitle: 'Original draw',
  reserveSuffix: '(reserve)',
  refLabel: 'Ref',
  weightLabel: 'Weight',
  bindingConflictTitle: 'Money Account already linked',
  bindingConflictDescription:
    'Money Account already binds to another Rewards profile.',
  onTrackDescription: "You are on track to earn today's entry.",
  lostTodayDescription:
    "You lost today's entry because your balance dipped below $100 today.",
  belowThresholdDescription:
    "Maintain a balance of $100 or more in your Money Account to earn todays' entry.",
};

const details: MoneyAccountSweepstakesCampaignDetails = {
  howItWorks: {
    title: 'How it works',
    description: 'Deposit and earn entries.',
    steps: [],
  },
  localizedText,
};

const activeCampaign: CampaignDto = {
  id: 'mas-campaign-1',
  type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
  name: 'Money Account Sweepstakes',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2099-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details,
  featured: true,
  showUpcomingDate: false,
};

const statsWithBalance: MoneyAccountSweepstakesStatsMeDto = {
  entryCount: 2,
  currentBalanceUsd: 250,
  yieldEarnedUsd: 1.5,
  todayMinUsd: 100,
  todayStatus: 'on_track',
  daysRemaining: 5,
};

function buildSeries(
  overrides: Partial<MoneyAccountSweepstakesSeries> = {},
): MoneyAccountSweepstakesSeries {
  return {
    campaigns: [activeCampaign],
    first: activeCampaign,
    last: activeCampaign,
    activeCampaign,
    displayCampaign: activeCampaign,
    seriesStatus: 'active',
    ...overrides,
  };
}

function setupHooks({
  isCampaignsLoading = false,
  hasCampaignsError = false,
  series = buildSeries(),
  optedInAny = false,
  stats = null as MoneyAccountSweepstakesStatsMeDto | null,
  isStatsLoading = false,
} = {}) {
  mockUseRewardCampaigns.mockReturnValue({
    campaigns: series.campaigns,
    categorizedCampaigns: {
      active: series.campaigns,
      upcoming: [],
      previous: [],
    },
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    hasLoaded: !isCampaignsLoading,
    fetchCampaigns: mockFetchCampaigns,
  });
  mockUseMoneyAccountSweepstakesSeries.mockReturnValue(series);
  mockUseMoneyAccountSweepstakesParticipation.mockReturnValue({
    optedInAny,
    isLoading: false,
    optedInByCampaignId: optedInAny ? { [activeCampaign.id]: true } : {},
    refetch: jest.fn(),
  });
  mockUseGetMoneyAccountSweepstakesStatsMe.mockReturnValue({
    stats,
    isLoading: isStatsLoading,
    hasError: false,
    refetch: jest.fn(),
  });
}

describe('MoneyAccountSweepstakesCampaignDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureBound.mockResolvedValue('bound');
    setupHooks();
  });

  it('renders the details container and campaign header title', () => {
    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );

    expect(
      getByTestId(
        MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW_TEST_IDS.CONTAINER,
      ),
    ).toBeOnTheScreen();
    expect(getByText('Money Account Sweepstakes')).toBeOnTheScreen();
    expect(getByTestId('campaign-status')).toBeOnTheScreen();
  });

  it('shows skeletons while campaigns are loading with no display campaign', () => {
    setupHooks({
      isCampaignsLoading: true,
      series: buildSeries({
        campaigns: [],
        first: null,
        last: null,
        activeCampaign: null,
        displayCampaign: null,
        seriesStatus: null,
      }),
    });

    const { getAllByTestId, queryByTestId } = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );

    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(queryByTestId('campaign-status')).toBeNull();
  });

  it('shows an error banner and retries campaign fetch', () => {
    setupHooks({
      hasCampaignsError: true,
      series: buildSeries({
        campaigns: [],
        first: null,
        last: null,
        activeCampaign: null,
        displayCampaign: null,
        seriesStatus: null,
      }),
    });

    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );

    fireEvent.press(getByTestId('error-banner-retry'));
    expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
  });

  it('shows how-it-works when balance is zero and stats when balance is positive', () => {
    setupHooks({ stats: null });
    const withoutBalance = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );
    expect(
      withoutBalance.getByTestId('campaign-how-it-works'),
    ).toBeOnTheScreen();
    expect(
      withoutBalance.queryByTestId('money-account-sweepstakes-stats-summary'),
    ).toBeNull();
    withoutBalance.unmount();

    setupHooks({ stats: statsWithBalance });
    const withBalance = render(<MoneyAccountSweepstakesCampaignDetailsView />);
    expect(withBalance.queryByTestId('campaign-how-it-works')).toBeNull();
    expect(
      withBalance.getByTestId('money-account-sweepstakes-stats-summary'),
    ).toBeOnTheScreen();
  });

  it('renders draw schedule and CTA for an active series', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );

    expect(
      getByTestId('money-account-sweepstakes-draw-schedule'),
    ).toBeOnTheScreen();
    expect(getByTestId('money-account-sweepstakes-cta')).toBeOnTheScreen();
  });

  it('hides the CTA when series status is not active', () => {
    setupHooks({
      series: buildSeries({ seriesStatus: 'previous' }),
    });

    const { queryByTestId } = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );

    expect(queryByTestId('money-account-sweepstakes-cta')).toBeNull();
  });

  it('navigates to campaign mechanics from the header button', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );

    fireEvent.press(
      getByTestId('money-account-sweepstakes-details-mechanics-button'),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_CAMPAIGN_MECHANICS,
      { campaignId: 'mas-campaign-1' },
    );
  });

  it('navigates back from the header back button', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignDetailsView />,
    );

    fireEvent.press(
      getByTestId('money-account-sweepstakes-details-back-button'),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('re-asserts binding when opted in to an active series', async () => {
    setupHooks({ optedInAny: true });

    render(<MoneyAccountSweepstakesCampaignDetailsView />);

    await waitFor(() => {
      expect(mockEnsureBound).toHaveBeenCalledTimes(1);
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows a conflict toast when the late re-assert discovers a binding conflict', async () => {
    mockEnsureBound.mockResolvedValue('conflict');
    setupHooks({ optedInAny: true });

    render(<MoneyAccountSweepstakesCampaignDetailsView />);

    await waitFor(() => {
      expect(mockEntriesClosed).toHaveBeenCalledWith(
        'Money Account already linked',
        'Money Account already binds to another Rewards profile.',
      );
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });
  });

  it('does not re-assert binding when the user is not opted in', async () => {
    setupHooks({ optedInAny: false });

    render(<MoneyAccountSweepstakesCampaignDetailsView />);

    await waitFor(() => {
      expect(mockEnsureBound).not.toHaveBeenCalled();
    });
  });
});
