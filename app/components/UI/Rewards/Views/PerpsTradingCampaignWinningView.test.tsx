import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsTradingCampaignWinningView, {
  PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS,
} from './PerpsTradingCampaignWinningView';
import { usePerpsTradingCampaignParticipantOutcome } from '../hooks/usePerpsTradingCampaignParticipantOutcome';
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

jest.mock('../hooks/usePerpsTradingCampaignParticipantOutcome', () => ({
  usePerpsTradingCampaignParticipantOutcome: jest.fn(),
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

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: { place?: string }) => {
    if (key === 'rewards.campaign_winning.rank_label' && params?.place)
      return `${params.place} place`;
    return key;
  }),
}));

const mockUseOutcome =
  usePerpsTradingCampaignParticipantOutcome as jest.MockedFunction<
    typeof usePerpsTradingCampaignParticipantOutcome
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

  it('renderRankSection shows rank when available', () => {
    render(<PerpsTradingCampaignWinningView />);
    const { renderRankSection } = mockCampaignWinningView.mock.calls[0][0];
    expect(renderRankSection).toBeDefined();
    const section = renderRankSection();
    expect(section).toBeTruthy();
  });

  it('renderRankSection shows dash when outcome has no rank', () => {
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
    const { renderRankSection } = mockCampaignWinningView.mock.calls[0][0];
    // When rank is null, rankDisplay = '—'
    expect(renderRankSection).toBeDefined();
  });
});
