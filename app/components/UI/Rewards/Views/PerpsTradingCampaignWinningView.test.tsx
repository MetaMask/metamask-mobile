import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsTradingCampaignWinningView, {
  PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS,
} from './PerpsTradingCampaignWinningView';
import { usePerpsTradingCampaignParticipantOutcome } from '../hooks/usePerpsTradingCampaignParticipantOutcome';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import CampaignWinningView from './CampaignWinningView';

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

jest.mock('../hooks/usePerpsTradingCampaignParticipantOutcome', () => ({
  usePerpsTradingCampaignParticipantOutcome: jest.fn(),
}));

jest.mock('../hooks/useGetPerpsTradingCampaignLeaderboardPosition', () => ({
  useGetPerpsTradingCampaignLeaderboardPosition: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({
    params: { campaignId: 'campaign-perps-1', campaignName: 'Perps Campaign' },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (...args: unknown[]) => args;
  tw.style = (...args: unknown[]) => args;
  return { useTailwind: () => tw };
});

const mockUseOutcome =
  usePerpsTradingCampaignParticipantOutcome as jest.MockedFunction<
    typeof usePerpsTradingCampaignParticipantOutcome
  >;
const mockUsePosition =
  useGetPerpsTradingCampaignLeaderboardPosition as jest.MockedFunction<
    typeof useGetPerpsTradingCampaignLeaderboardPosition
  >;
const mockCampaignWinningView = CampaignWinningView as jest.MockedFunction<
  typeof CampaignWinningView
>;

describe('PerpsTradingCampaignWinningView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'PERPS-WIN-99',
        rank: 3,
      },
      isLoading: false,
      hasError: false,
    });
    mockUsePosition.mockReturnValue({
      position: {
        rank: 3,
        pnl: 1500.25,
        notionalVolume: 30000,
        marginDeployed: 1200,
        qualified: true,
        neighbors: [],
        computedAt: '2025-08-15T12:00:00.000Z',
      },
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
  });

  it('renders the container with the Perps testID', () => {
    const { getByTestId } = render(<PerpsTradingCampaignWinningView />);
    expect(
      getByTestId(PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER),
    ).toBeTruthy();
  });

  it('passes correct Perps-specific props to CampaignWinningView', () => {
    render(<PerpsTradingCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        testID: PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER,
        prizeEmail: 'perpscampaign@consensys.net',
        campaignName: 'Perps Campaign',
        campaignId: 'campaign-perps-1',
        analyticsPageType: 'perps_trading_campaign_winning',
        winningCode: 'PERPS-WIN-99',
        hasOutcomeLoaded: true,
        isLoading: false,
        rankDisplay: '3rd',
        resultDisplay: '+$1,500.25',
        isRankLoading: false,
        isResultLoading: false,
      }),
      {},
    );
  });

  it('passes winningCode as null when outcome has no code', () => {
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'finalized',
        winnerVerificationCode: null,
        rank: 21,
      },
      isLoading: false,
      hasError: false,
    });
    render(<PerpsTradingCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        winningCode: null,
        hasOutcomeLoaded: true,
      }),
      {},
    );
  });

  it('does not mark outcome as loaded until the outcome exists', () => {
    mockUseOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
    render(<PerpsTradingCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        winningCode: null,
        hasOutcomeLoaded: false,
      }),
      {},
    );
  });

  it('passes rankDisplay when rank is available', () => {
    render(<PerpsTradingCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        rankDisplay: '3rd',
        isRankLoading: false,
        isResultLoading: false,
      }),
      {},
    );
  });

  it('passes rank from outcome and no result when position is unavailable', () => {
    mockUsePosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });
    render(<PerpsTradingCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        rankDisplay: '3rd',
        resultDisplay: null,
        isRankLoading: false,
        isResultLoading: false,
      }),
      {},
    );
  });

  it('does not pass rankDisplay when outcome has no rank', () => {
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'CODE',
        rank: null,
      },
      isLoading: false,
      hasError: false,
    });
    render(<PerpsTradingCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        rankDisplay: null,
        isRankLoading: false,
      }),
      {},
    );
  });
});
