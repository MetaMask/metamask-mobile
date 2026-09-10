import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { EarnRatesView } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import ReferralRatesRow from './ReferralRatesRow';

const createRates = (
  overrides: Partial<EarnRatesView> = {},
): EarnRatesView => ({
  revshare_rate_bps: 2500,
  cashback_rate_bps: 50,
  earning_term_days: 90,
  ...overrides,
});

describe('ReferralRatesRow', () => {
  it('renders both rates as percentages', () => {
    render(<ReferralRatesRow rates={createRates()} />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_REVSHARE_RATE),
    ).toHaveTextContent('25%');
    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_CASHBACK_RATE),
    ).toHaveTextContent('0.5%');
  });

  it('omits the rev-share tile when the program has no rate configured', () => {
    render(
      <ReferralRatesRow rates={createRates({ revshare_rate_bps: null })} />,
    );

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_REVSHARE_RATE),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_CASHBACK_RATE),
    ).toBeOnTheScreen();
  });

  it('renders nothing when neither program is configured', () => {
    render(
      <ReferralRatesRow
        rates={createRates({
          revshare_rate_bps: null,
          cashback_rate_bps: null,
        })}
      />,
    );

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_RATES_ROW),
    ).not.toBeOnTheScreen();
  });

  it('renders a zero rate rather than treating it as unconfigured', () => {
    render(<ReferralRatesRow rates={createRates({ cashback_rate_bps: 0 })} />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_CASHBACK_RATE),
    ).toHaveTextContent('0%');
  });
});
