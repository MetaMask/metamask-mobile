import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import InvitedBenefitCard from './InvitedBenefitCard';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { formatUsd, KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// `moduleNameMapper` resolves every `*.svg` import to the same shared mock, so
// this single factory covers the Phosphor icon `HistoryKindAvatar` renders here.
jest.mock('../../../../../images/rewards/hand-coins.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockPhosphorIcon() {
    return ReactActual.createElement(View, { testID: 'mock-phosphor-icon' });
  };
});

describe('InvitedBenefitCard', () => {
  it('shows the code the referee was invited with', () => {
    const { getByTestId, getByText } = render(
      <InvitedBenefitCard referralCode="AB12CD" onViewEarnings={jest.fn()} />,
    );

    expect(getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_HERO)).toBeOnTheScreen();
    expect(getByText('AB12CD')).toBeOnTheScreen();
  });

  it('renders the offer-end copy under the rebate title', () => {
    const { getByTestId } = render(
      <InvitedBenefitCard referralCode="AB12CD" onViewEarnings={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_BENEFIT_OFFER_ENDS),
    ).toHaveTextContent('rewards.kol.invited_benefit_offer_ends');
  });

  it('shows the trading commissions and trading rebates totals', () => {
    const { getByTestId } = render(
      <InvitedBenefitCard referralCode="AB12CD" onViewEarnings={jest.fn()} />,
    );

    expect(
      within(
        getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_TRADING_COMMISSIONS),
      ).getByText(formatUsd(KOL_EARNINGS_FIXTURE.tradeCommissionsRecorded)),
    ).toBeOnTheScreen();
    expect(
      within(
        getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_TRADING_REBATES),
      ).getByText(formatUsd(KOL_EARNINGS_FIXTURE.tradingRebates)),
    ).toBeOnTheScreen();
  });

  it.each([
    ['commissions', KOL_DASHBOARD_SELECTORS.INVITED_TRADING_COMMISSIONS],
    ['rebates', KOL_DASHBOARD_SELECTORS.INVITED_TRADING_REBATES],
  ])('opens the Claims tab from the %s card', (_name, testId) => {
    const onViewEarnings = jest.fn();
    const { getByTestId } = render(
      <InvitedBenefitCard
        referralCode="AB12CD"
        onViewEarnings={onViewEarnings}
      />,
    );

    fireEvent.press(getByTestId(testId));

    expect(onViewEarnings).toHaveBeenCalled();
  });
});
