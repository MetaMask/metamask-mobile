import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictThePitchCampaignPortfolioView, {
  PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS,
} from './PredictThePitchCampaignPortfolioView';
import { useGetPredictThePitchPositions } from '../hooks/useGetPredictThePitchPositions';
import type { PredictThePitchPositionsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockPortfolio = jest.fn();

const CAMPAIGN_ID = 'predict-portfolio-campaign-1';

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
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

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

jest.mock('../components/Campaigns/PredictThePitchPortfolio', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockPortfolio(props);
      return ReactActual.createElement(View, {
        testID: 'predict-portfolio-mock',
      });
    },
  };
});

jest.mock('../hooks/useGetPredictThePitchPositions');
jest.mock('../hooks/useTrackRewardsPageView', () => jest.fn());

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseGetPositions =
  useGetPredictThePitchPositions as jest.MockedFunction<
    typeof useGetPredictThePitchPositions
  >;

const mockPositions: PredictThePitchPositionsDto = {
  computedAt: '2025-01-01T00:00:00.000Z',
  positions: [
    {
      outcomeAssetId: 'token-1',
      outcomeAsset: 'Yes',
      conditionId: 'condition-1',
      conditionName: 'Match winner',
      conditionSlug: 'match-winner',
      eventId: 'market-1',
      eventSlug: 'event-a',
      iconUrl: null,
      capitalDeployed: 12,
      pnl: 3,
      roi: 0.25,
      status: 'open',
      fillShares: 10,
      fillSharesBought: 10,
      fillSharesSold: 0,
      fillPrice: 0.5,
      fillDate: '2025-01-01T00:00:00.000Z',
    },
  ],
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
    expect(
      getByTestId(PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS.CONTAINER),
    ).toBeDefined();
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

  it('passes positions data to PredictThePitchPortfolio', () => {
    render(<PredictThePitchCampaignPortfolioView />);
    expect(mockPortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        positions: mockPositions,
        isLoading: false,
        hasError: false,
        refetch: mockRefetch,
      }),
    );
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
});
