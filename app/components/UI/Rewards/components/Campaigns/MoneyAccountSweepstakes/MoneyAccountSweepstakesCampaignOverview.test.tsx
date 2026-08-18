import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyAccountSweepstakesCampaignOverview from './MoneyAccountSweepstakesCampaignOverview';
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
  });
});
