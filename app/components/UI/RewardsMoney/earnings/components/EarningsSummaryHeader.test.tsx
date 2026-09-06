import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { EarningsSummaryDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import EarningsSummaryHeader from './EarningsSummaryHeader';

const createSummary = (
  overrides: Partial<EarningsSummaryDto> = {},
): EarningsSummaryDto => ({
  lifetime_total: '32000000',
  claimable: '12500000',
  pending: '5102400',
  claimed: '2000000',
  forfeited: '0',
  minimum_musd_base_units: '10000000',
  by_earning_origin_type: {},
  ...overrides,
});

describe('EarningsSummaryHeader', () => {
  it('renders claimable, pending and claimed straight off the payload', () => {
    render(
      <EarningsSummaryHeader summary={createSummary()} isLoading={false} />,
    );

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_CLAIMABLE),
    ).toHaveTextContent('12.50');
    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_PENDING),
    ).toHaveTextContent('5.10');
    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_CLAIMED),
    ).toHaveTextContent('2.00');
  });

  it('renders the skeleton while the first read is in flight', () => {
    render(<EarningsSummaryHeader summary={null} isLoading />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_SUMMARY_HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_CLAIMABLE),
    ).not.toBeOnTheScreen();
  });

  it('keeps the current values visible during a refresh', () => {
    render(<EarningsSummaryHeader summary={createSummary()} isLoading />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_CLAIMABLE),
    ).toHaveTextContent('12.50');
  });

  it('renders nothing when there is no summary and nothing is loading', () => {
    render(<EarningsSummaryHeader summary={null} isLoading={false} />);

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_SUMMARY_HEADER),
    ).not.toBeOnTheScreen();
  });
});
