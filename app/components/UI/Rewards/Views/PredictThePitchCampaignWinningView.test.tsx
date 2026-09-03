import React from 'react';
import { render } from '@testing-library/react-native';
import PredictThePitchCampaignWinningView from './PredictThePitchCampaignWinningView';
import { useGetPredictThePitchOutcome } from '../hooks/useGetPredictThePitchOutcome';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import Routes from '../../../../constants/navigation/Routes';

const mockRouteState = {
  params: {
    campaignId: 'predict-campaign-1',
    campaignName: 'Predict The Pitch',
  },
};

let latestWinningProps: Record<string, unknown> | null = null;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRouteState,
}));

jest.mock('../hooks/useGetPredictThePitchOutcome');
jest.mock('../hooks/useGetPredictThePitchLeaderboardPosition');

jest.mock('../utils/formatUtils', () => ({
  formatOrdinalRank: (rank: number) => `${rank}-rank`,
  formatPercentChange: (value: number) => `percent-${value}`,
}));

jest.mock('./CampaignWinningView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      latestWinningProps = props;
      return ReactActual.createElement(View, { testID: props.testID });
    },
  };
});

const mockUseGetPredictThePitchOutcome =
  useGetPredictThePitchOutcome as jest.MockedFunction<
    typeof useGetPredictThePitchOutcome
  >;
const mockUseGetPredictThePitchLeaderboardPosition =
  useGetPredictThePitchLeaderboardPosition as jest.MockedFunction<
    typeof useGetPredictThePitchLeaderboardPosition
  >;

describe('PredictThePitchCampaignWinningView', () => {
  beforeEach(() => {
    latestWinningProps = null;
    mockUseGetPredictThePitchOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'winner-code',
        rank: 2,
      },
      isLoading: false,
      hasError: false,
    });
    mockUseGetPredictThePitchLeaderboardPosition.mockReturnValue({
      position: {
        rank: 3,
        totalParticipants: 10,
        roi: 0.2,
        pnl: 20,
        volume: 100,
        eligible: true,
        neighbors: [],
        computedAt: '2025-01-01T00:00:00.000Z',
        marketsTraded: 3,
        minimumMarketsTraded: 3,
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
  });

  it('passes Predict winner data into the shared campaign winning view', () => {
    render(<PredictThePitchCampaignWinningView />);

    expect(latestWinningProps).toMatchObject({
      prizeEmail: 'predictcampaign@consensys.net',
      campaignName: 'Predict The Pitch',
      campaignId: 'predict-campaign-1',
      analyticsPageType: 'predict_the_pitch_campaign_winning',
      winningCode: 'winner-code',
      rankDisplay: '2-rank',
      resultDisplay: 'percent-0.2',
      fallbackRoute: {
        route: Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
        params: { campaignId: 'predict-campaign-1' },
      },
    });
  });
});
