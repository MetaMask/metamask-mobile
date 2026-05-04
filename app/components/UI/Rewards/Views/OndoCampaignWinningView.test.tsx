import React from 'react';
import { render } from '@testing-library/react-native';
import OndoCampaignWinningView, {
  ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS,
} from './OndoCampaignWinningView';
import { useOndoCampaignParticipantOutcome } from '../hooks/useOndoCampaignParticipantOutcome';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import CampaignWinningView from './CampaignWinningView';

jest.mock('./CampaignWinningView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(
      ({
        testID,
        renderRankSection,
      }: {
        testID: string;
        renderRankSection: () => React.ReactNode;
      }) => ReactActual.createElement(View, { testID }, renderRankSection?.()),
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
  const tw = (...args: unknown[]) => args;
  tw.style = (...args: unknown[]) => args;
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
      {},
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
      {},
    );
  });

  it('renderRankSection renders rank and rate when position is available', () => {
    mockUsePosition.mockReturnValue({
      position: { rank: 3, rateOfReturn: 0.1234 } as never,
      isLoading: false,
      hasError: false,
      hasFetched: true,
      refetch: jest.fn(),
    });

    jest.mock('../../../../../locales/i18n', () => ({
      strings: jest.fn((key: string, params?: { place?: string }) => {
        if (key === 'rewards.campaign_winning.rank_label' && params?.place)
          return `${params.place} place`;
        return key;
      }),
    }));

    render(<OndoCampaignWinningView />);
    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        renderRankSection: expect.any(Function),
      }),
      {},
    );
  });
});
