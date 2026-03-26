import React from 'react';
import { render } from '@testing-library/react-native';
import TronClaimableRewardsRow from './TronClaimableRewardsRow';
import TronEstimatedAnnualRewardsRow from './TronEstimatedAnnualRewardsRow';
import TronEstimatedAnnualRewardsUnavailableBanner from './TronEstimatedAnnualRewardsUnavailableBanner';
import { TronStakingRewardsRowsTestIds } from './TronStakingRewardsRows.testIds';

describe('Tron staking rewards row components', () => {
  it('renders claimable rewards row from display props only', () => {
    const { getByText, getByTestId } = render(
      <TronClaimableRewardsRow
        title="Total claimable rewards"
        subtitle="$12.34 · 1.234 TRX"
        hideBalances={false}
      />,
    );

    expect(getByText('Total claimable rewards')).toBeOnTheScreen();
    expect(
      getByTestId(TronStakingRewardsRowsTestIds.TOTAL_SUBTITLE),
    ).toHaveTextContent('$12.34 · 1.234 TRX');
  });

  it('renders estimated annual rewards row from display props only', () => {
    const { getByText, getByTestId } = render(
      <TronEstimatedAnnualRewardsRow
        title="Estimated annual rewards"
        subtitle="$45.67 · 8.765 TRX"
        hideBalances={false}
      />,
    );

    expect(getByText('Estimated annual rewards')).toBeOnTheScreen();
    expect(
      getByTestId(TronStakingRewardsRowsTestIds.ESTIMATED_SUBTITLE),
    ).toHaveTextContent('$45.67 · 8.765 TRX');
  });

  it('renders unavailable banner from message prop only', () => {
    const { getByTestId } = render(
      <TronEstimatedAnnualRewardsUnavailableBanner message="APR is temporarily unavailable" />,
    );

    expect(
      getByTestId(TronStakingRewardsRowsTestIds.ESTIMATED_UNAVAILABLE_BANNER),
    ).toHaveTextContent('APR is temporarily unavailable');
  });
});
