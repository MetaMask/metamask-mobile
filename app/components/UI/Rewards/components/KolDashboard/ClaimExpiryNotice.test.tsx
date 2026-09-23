import React from 'react';
import { render } from '@testing-library/react-native';
import ClaimExpiryNotice from './ClaimExpiryNotice';
import { formatUsd, KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { amount: string; days: number }) => {
    if (key === 'rewards.kol.claim_expiry_warning' && params) {
      return `${params.amount} expires in ${params.days} days`;
    }
    return key;
  },
}));

describe('ClaimExpiryNotice', () => {
  it('renders the expiring amount, day count, and claim prompt', () => {
    const { getByText, getByTestId } = render(
      <ClaimExpiryNotice testID="claim-expiry-notice" />,
    );

    expect(getByTestId('claim-expiry-notice')).toBeOnTheScreen();
    expect(
      getByText(
        `${formatUsd(KOL_EARNINGS_FIXTURE.expiringSoonAmount)} expires in ${
          KOL_EARNINGS_FIXTURE.expiringSoonDays
        } days`,
      ),
    ).toBeOnTheScreen();
  });
});
