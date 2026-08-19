import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyAccountSweepstakesCampaignOverview, {
  MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS,
} from './MoneyAccountSweepstakesCampaignOverview';
import {
  CampaignType,
  type CampaignDto,
  type MoneyAccountSweepstakesStatsMeDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { createMoneyAccountSweepstakesLocalizedText } from './testUtils';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../utils/formatUtils', () => ({
  formatUsd: (value: number | null) =>
    value == null ? '—' : `$${value.toFixed(2)}`,
}));

jest.mock('../../../../Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    totalFiatFormatted: '$1,250.00',
    lastKnownTotalFiatFormatted: undefined,
    isBalanceLoading: false,
  })),
}));

jest.mock('../../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onConfirm,
      testID,
    }: {
      onConfirm?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(
          Pressable,
          { testID: `${testID}-retry`, onPress: onConfirm },
          ReactActual.createElement(Text, null, 'Retry'),
        ),
      ),
  };
});

const localizedText = createMoneyAccountSweepstakesLocalizedText();

const campaign: CampaignDto = {
  id: 'mas-campaign-1',
  type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
  name: 'Money Account Sweepstakes',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2099-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
  image: {
    lightModeUrl: 'https://example.com/hero.png',
    darkModeUrl: 'https://example.com/hero-dark.png',
  },
};

const stats: MoneyAccountSweepstakesStatsMeDto = {
  entryCount: 2,
  currentBalanceUsd: 250,
  yieldEarnedUsd: 1.5,
  qualifyingDepositsUsd: 40,
  qualifyingThresholdUsd: 100,
  todayStatus: 'not_yet_qualified',
  daysRemaining: 5,
};

describe('MoneyAccountSweepstakesCampaignOverview', () => {
  it('uses qualifying deposits for the balance display and qualification shortfall', () => {
    const { getByText, queryByText } = render(
      <MoneyAccountSweepstakesCampaignOverview
        campaign={campaign}
        localizedText={localizedText}
        isParticipating
        stats={stats}
      />,
    );

    expect(getByText('Qualifying deposits')).toBeOnTheScreen();
    expect(getByText('$40.00')).toBeOnTheScreen();
    expect(queryByText('$250.00')).toBeNull();
    expect(
      getByText("Add $60.00 today to reach $100 and earn today's entry."),
    ).toBeOnTheScreen();
    expect(getByText('Balance')).toBeOnTheScreen();
    expect(getByText('$1,250.00')).toBeOnTheScreen();
  });

  it('renders stats skeletons while participating stats are loading with no data', () => {
    const { getByTestId, queryByText } = render(
      <MoneyAccountSweepstakesCampaignOverview
        campaign={campaign}
        localizedText={localizedText}
        isParticipating
        stats={null}
        isStatsLoading
      />,
    );

    expect(
      getByTestId(
        MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.STATS_LOADING,
      ),
    ).toBeOnTheScreen();
    expect(queryByText('—')).toBeNull();
  });

  it('renders stats error banner with retry when stats fail with no data', () => {
    const onRetryStats = jest.fn();
    const { getByTestId } = render(
      <MoneyAccountSweepstakesCampaignOverview
        campaign={campaign}
        localizedText={localizedText}
        isParticipating
        stats={null}
        hasStatsError
        onRetryStats={onRetryStats}
      />,
    );

    fireEvent.press(
      getByTestId(
        `${MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.STATS_ERROR}-retry`,
      ),
    );

    expect(onRetryStats).toHaveBeenCalledTimes(1);
  });

  it('keeps stale stats visible during a stats refresh', () => {
    const { getByText, queryByTestId } = render(
      <MoneyAccountSweepstakesCampaignOverview
        campaign={campaign}
        localizedText={localizedText}
        isParticipating
        stats={stats}
        isStatsLoading
      />,
    );

    expect(getByText('$40.00')).toBeOnTheScreen();
    expect(
      queryByTestId(
        MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.STATS_LOADING,
      ),
    ).toBeNull();
  });

  it('renders Money Account balance from the Money tab source below qualification', () => {
    const { getByTestId, getByText } = render(
      <MoneyAccountSweepstakesCampaignOverview
        campaign={campaign}
        localizedText={localizedText}
        isParticipating
        stats={stats}
      />,
    );

    expect(
      getByTestId(
        MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.MONEY_ACCOUNT_BALANCE_ROW,
      ),
    ).toBeOnTheScreen();
    expect(getByText('Balance')).toBeOnTheScreen();
    expect(getByText('$1,250.00')).toBeOnTheScreen();
  });
});
