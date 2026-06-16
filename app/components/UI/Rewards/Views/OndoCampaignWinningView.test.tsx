import React from 'react';
import { render } from '@testing-library/react-native';
import OndoCampaignWinningView, {
  ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS,
} from './OndoCampaignWinningView';
import { useOndoCampaignParticipantOutcome } from '../hooks/useOndoCampaignParticipantOutcome';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import CampaignWinningView from './CampaignWinningView';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('./CampaignWinningView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ testID }: { testID: string }) =>
      ReactActual.createElement(View, { testID }),
    ),
  };
});

jest.mock('../hooks/useOndoCampaignParticipantOutcome', () => ({
  useOndoCampaignParticipantOutcome: jest.fn(),
}));

jest.mock('../hooks/useGetOndoLeaderboardPosition', () => ({
  useGetOndoLeaderboardPosition: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({
    params: { campaignId: 'campaign-ondo-1', campaignName: 'Ondo Campaign' },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

const mockUseOutcome = useOndoCampaignParticipantOutcome as jest.MockedFunction<
  typeof useOndoCampaignParticipantOutcome
>;
const mockUsePosition = useGetOndoLeaderboardPosition as jest.MockedFunction<
  typeof useGetOndoLeaderboardPosition
>;
const mockCampaignWinningView = CampaignWinningView as jest.MockedFunction<
  typeof CampaignWinningView
>;

describe('OndoCampaignWinningView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'ONDO-WIN-99',
      },
      isLoading: false,
      hasError: false,
    });
    mockUsePosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
  });

  it('renders the container with the Ondo testID', () => {
    const { getByTestId } = render(<OndoCampaignWinningView />);
    expect(
      getByTestId(ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER),
    ).toBeTruthy();
  });

  it('passes correct Ondo-specific props to CampaignWinningView', () => {
    render(<OndoCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        testID: ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER,
        prizeEmail: 'ondocampaign@consensys.net',
        campaignName: 'Ondo Campaign',
        campaignId: 'campaign-ondo-1',
        analyticsPageType: 'ondo_campaign_winning',
        winningCode: 'ONDO-WIN-99',
        hasOutcomeLoaded: true,
        isLoading: false,
        rankDisplay: null,
        resultDisplay: null,
        isRankLoading: false,
        isResultLoading: false,
        fallbackRoute: {
          route: Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
          params: { campaignId: 'campaign-ondo-1' },
        },
      }),
      undefined,
    );
  });

  it('passes winningCode as null when outcome has no code', () => {
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'finalized',
        winnerVerificationCode: null,
      },
      isLoading: false,
      hasError: false,
    });
    render(<OndoCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        winningCode: null,
        hasOutcomeLoaded: true,
      }),
      undefined,
    );
  });

  it('does not mark outcome as loaded until the outcome exists', () => {
    mockUseOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
    render(<OndoCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        winningCode: null,
        hasOutcomeLoaded: false,
      }),
      undefined,
    );
  });

  it('passes rank and result display when position is available', () => {
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'ONDO-WIN-99',
        tierRank: 3,
      },
      isLoading: false,
      hasError: false,
    });
    mockUsePosition.mockReturnValue({
      position: { rank: 9, rateOfReturn: 0.1234 } as never,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    render(<OndoCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        rankDisplay: '3rd',
        resultDisplay: '+12.34%',
        isRankLoading: false,
        isResultLoading: false,
      }),
      undefined,
    );
  });
});
