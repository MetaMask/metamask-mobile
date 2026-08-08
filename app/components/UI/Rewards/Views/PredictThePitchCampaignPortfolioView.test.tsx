import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictThePitchCampaignPortfolioView, {
  PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS,
} from './PredictThePitchCampaignPortfolioView';
import { useGetPredictThePitchPositions } from '../hooks/useGetPredictThePitchPositions';
import { PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS } from '../components/Campaigns/PredictThePitchPortfolio';
import type { PredictThePitchPositionsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

const CAMPAIGN_ID = 'predict-portfolio-campaign-1';
const VIEW_TEST_IDS = PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS;
const PORTFOLIO_TEST_IDS = PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({
    params: { campaignId: CAMPAIGN_ID },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    HeaderStandard: ({
      title,
      onBack,
      backButtonProps,
      endButtonIconProps,
    }: {
      title: string;
      onBack: () => void;
      backButtonProps?: { testID?: string };
      endButtonIconProps?: {
        testID?: string;
        onPress?: () => void;
      }[];
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'predict-portfolio-header' },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Pressable, {
          onPress: onBack,
          testID: backButtonProps?.testID ?? 'predict-portfolio-back',
        }),
        endButtonIconProps?.[0] &&
          ReactActual.createElement(Pressable, {
            onPress: endButtonIconProps[0].onPress,
            testID: endButtonIconProps[0].testID,
          }),
      ),
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(Text, props, props.children),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

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

jest.mock('../hooks/useGetPredictThePitchPositions');
jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, vars?: Record<string, string>) => {
    if (
      key === 'rewards.predict_the_pitch_campaign.positions_last_updated' &&
      vars?.time
    ) {
      return `Last updated: ${vars.time}`;
    }
    return key;
  }),
}));

jest.mock('../utils/formatUtils', () => ({
  formatRewardsTimeOnly: () => '10:30 AM',
  formatRewardsDateLabel: (date: Date) => date.toISOString().slice(0, 10),
}));

jest.mock('../components/RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

jest.mock('../components/RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

const mockUseGetPositions =
  useGetPredictThePitchPositions as jest.MockedFunction<
    typeof useGetPredictThePitchPositions
  >;

const openPosition = {
  outcomeAssetId: 'token-open',
  outcomeAsset: 'Yes',
  conditionId: 'condition-open',
  conditionName: 'Open market',
  conditionSlug: null,
  eventId: null,
  eventSlug: null,
  iconUrl: null,
  capitalDeployed: 10,
  pnl: 2,
  roi: 0.2,
  status: 'open' as const,
  fillShares: 5,
  fillSharesBought: 5,
  fillSharesSold: 0,
  fillPrice: 0.5,
  fillDate: '2025-06-03T10:00:00.000Z',
};

const closedPosition = {
  ...openPosition,
  outcomeAssetId: 'token-closed',
  conditionName: 'Closed market',
  status: 'sold' as const,
  fillShares: 0,
  fillSharesSold: 5,
  fillDate: '2025-06-01T10:00:00.000Z',
};

const mockPositions: PredictThePitchPositionsDto = {
  computedAt: '2025-01-01T00:00:00.000Z',
  openPositions: [openPosition],
  resolvedPositions: [],
};

describe('PredictThePitchCampaignPortfolioView', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetPositions.mockReturnValue({
      positions: mockPositions,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: mockRefetch,
    });
  });

  it('renders with the correct container testID', () => {
    const { getByTestId } = render(<PredictThePitchCampaignPortfolioView />);
    expect(getByTestId(VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<PredictThePitchCampaignPortfolioView />);
    fireEvent.press(getByTestId('predict-the-pitch-portfolio-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('fetches positions with route campaignId', () => {
    render(<PredictThePitchCampaignPortfolioView />);
    expect(mockUseGetPositions).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  it('navigates to campaign mechanics when the header action is pressed', () => {
    const { getByTestId } = render(<PredictThePitchCampaignPortfolioView />);
    fireEvent.press(
      getByTestId('predict-the-pitch-portfolio-mechanics-button'),
    );
    expect(mockNavigate).toHaveBeenCalledWith('RewardsCampaignMechanics', {
      campaignId: CAMPAIGN_ID,
    });
  });

  it('shows empty state when both open and closed lists are empty', () => {
    mockUseGetPositions.mockReturnValue({
      positions: {
        computedAt: '2025-01-01T00:00:00.000Z',
        openPositions: [],
        resolvedPositions: [],
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: mockRefetch,
    });

    const { getByTestId, queryByTestId } = render(
      <PredictThePitchCampaignPortfolioView />,
    );

    expect(getByTestId(PORTFOLIO_TEST_IDS.EMPTY)).toBeDefined();
    expect(queryByTestId(VIEW_TEST_IDS.OPEN_SECTION)).toBeNull();
    expect(queryByTestId(VIEW_TEST_IDS.CLOSED_SECTION)).toBeNull();
  });

  it('shows only the Open section when there are no closed positions', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <PredictThePitchCampaignPortfolioView />,
    );

    expect(
      getByText('rewards.predict_the_pitch_campaign.positions_open_section'),
    ).toBeDefined();
    expect(getByTestId(VIEW_TEST_IDS.OPEN_SECTION)).toBeDefined();
    expect(queryByTestId(VIEW_TEST_IDS.CLOSED_SECTION)).toBeNull();
    expect(queryByTestId(VIEW_TEST_IDS.DIVIDER)).toBeNull();
    expect(getByText('Open market')).toBeDefined();
  });

  it('shows only the Closed section when there are no open positions', () => {
    mockUseGetPositions.mockReturnValue({
      positions: {
        computedAt: '2025-01-01T00:00:00.000Z',
        openPositions: [],
        resolvedPositions: [closedPosition],
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: mockRefetch,
    });

    const { getByText, getByTestId, queryByTestId } = render(
      <PredictThePitchCampaignPortfolioView />,
    );

    expect(
      getByText('rewards.predict_the_pitch_campaign.positions_closed_section'),
    ).toBeDefined();
    expect(getByTestId(VIEW_TEST_IDS.CLOSED_SECTION)).toBeDefined();
    expect(queryByTestId(VIEW_TEST_IDS.OPEN_SECTION)).toBeNull();
    expect(queryByTestId(VIEW_TEST_IDS.DIVIDER)).toBeNull();
    expect(getByText('Closed market')).toBeDefined();
  });

  it('shows Open, divider, and Closed sections when both lists have items', () => {
    mockUseGetPositions.mockReturnValue({
      positions: {
        computedAt: '2025-01-01T00:00:00.000Z',
        openPositions: [openPosition],
        resolvedPositions: [closedPosition],
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<PredictThePitchCampaignPortfolioView />);

    expect(getByTestId(VIEW_TEST_IDS.OPEN_SECTION)).toBeDefined();
    expect(getByTestId(VIEW_TEST_IDS.DIVIDER)).toBeDefined();
    expect(getByTestId(VIEW_TEST_IDS.CLOSED_SECTION)).toBeDefined();
  });

  it('groups positions under date headers within each section', () => {
    mockUseGetPositions.mockReturnValue({
      positions: {
        computedAt: '2025-01-01T00:00:00.000Z',
        openPositions: [openPosition],
        resolvedPositions: [closedPosition],
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<PredictThePitchCampaignPortfolioView />);

    expect(
      getByTestId(`${VIEW_TEST_IDS.DATE_HEADER}-open-2025-06-03`),
    ).toBeDefined();
    expect(
      getByTestId(`${VIEW_TEST_IDS.DATE_HEADER}-closed-2025-06-01`),
    ).toBeDefined();
  });

  it('uses distinct date header testIDs when open and closed share a fill date', () => {
    const sharedFillDate = '2025-06-03T10:00:00.000Z';
    mockUseGetPositions.mockReturnValue({
      positions: {
        computedAt: '2025-01-01T00:00:00.000Z',
        openPositions: [openPosition],
        resolvedPositions: [{ ...closedPosition, fillDate: sharedFillDate }],
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<PredictThePitchCampaignPortfolioView />);

    expect(
      getByTestId(`${VIEW_TEST_IDS.DATE_HEADER}-open-2025-06-03`),
    ).toBeDefined();
    expect(
      getByTestId(`${VIEW_TEST_IDS.DATE_HEADER}-closed-2025-06-03`),
    ).toBeDefined();
  });
});
