import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyAccountSweepstakesCampaignWinningView, {
  MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW_TEST_IDS,
} from './MoneyAccountSweepstakesCampaignWinningView';
import { useMoneyAccountSweepstakesOutcome } from '../hooks/useMoneyAccountSweepstakesOutcome';
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

jest.mock('../hooks/useMoneyAccountSweepstakesOutcome', () => ({
  useMoneyAccountSweepstakesOutcome: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({
    params: {
      campaignId: 'mas-campaign-1',
      campaignName: 'Money Account Sweepstakes',
    },
  }),
}));

jest.mock('../utils/formatUtils', () => ({
  formatUsd: (value: number) => `$${value.toFixed(2)}`,
}));

const mockUseOutcome = useMoneyAccountSweepstakesOutcome as jest.MockedFunction<
  typeof useMoneyAccountSweepstakesOutcome
>;
const mockCampaignWinningView = CampaignWinningView as jest.MockedFunction<
  typeof CampaignWinningView
>;

describe('MoneyAccountSweepstakesCampaignWinningView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'pending',
        winnerVerificationCode: 'MAS-WIN-42',
        prizeAmountUsd: 250,
      },
      isLoading: false,
      hasError: false,
    });
  });

  it('renders the container with the Money Account Sweepstakes testID', () => {
    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignWinningView />,
    );

    expect(
      getByTestId(
        MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER,
      ),
    ).toBeTruthy();
  });

  it('passes Money Account Sweepstakes props into CampaignWinningView', () => {
    render(<MoneyAccountSweepstakesCampaignWinningView />);

    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        testID:
          MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER,
        viewName: 'MoneyAccountSweepstakesCampaignWinningView',
        prizeEmail: 'moneyaccountcampaign@consensys.net',
        campaignName: 'Money Account Sweepstakes',
        campaignId: 'mas-campaign-1',
        analyticsPageType: 'money_account_sweepstakes_campaign_winning',
        winningCode: 'MAS-WIN-42',
        hasOutcomeLoaded: true,
        isLoading: false,
        rankDisplay: '$250.00',
        isRankLoading: false,
        fallbackRoute: {
          route: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
          params: { campaignId: 'mas-campaign-1' },
        },
      }),
      undefined,
    );
  });

  it('passes null winning code and rank when outcome has no prize data', () => {
    mockUseOutcome.mockReturnValue({
      outcome: {
        subscriptionId: 'sub-1',
        outcomeStatus: 'finalized',
        winnerVerificationCode: null,
        prizeAmountUsd: null,
      },
      isLoading: false,
      hasError: false,
    });

    render(<MoneyAccountSweepstakesCampaignWinningView />);

    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        winningCode: null,
        hasOutcomeLoaded: true,
        rankDisplay: null,
      }),
      undefined,
    );
  });

  it('does not mark outcome as loaded until the outcome exists', () => {
    mockUseOutcome.mockReturnValue({
      outcome: null,
      isLoading: true,
      hasError: false,
    });

    render(<MoneyAccountSweepstakesCampaignWinningView />);

    expect(mockCampaignWinningView).toHaveBeenCalledWith(
      expect.objectContaining({
        winningCode: null,
        hasOutcomeLoaded: false,
        isLoading: true,
        isRankLoading: true,
        rankDisplay: null,
      }),
      undefined,
    );
  });
});
