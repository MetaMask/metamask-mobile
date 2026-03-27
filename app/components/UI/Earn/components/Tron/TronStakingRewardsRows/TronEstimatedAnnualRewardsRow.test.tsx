import React from 'react';
import { render } from '@testing-library/react-native';
import TronEstimatedAnnualRewardsRow, {
  TronEstimatedAnnualRewardsRowTestIds,
} from './TronEstimatedAnnualRewardsRow';

describe('TronEstimatedAnnualRewardsRow', () => {
  it('renders from display props only', () => {
    const { getByText, getByTestId } = render(
      <TronEstimatedAnnualRewardsRow
        title="Estimated annual rewards"
        subtitle="$45.67 · 8.765 TRX"
        hideBalances={false}
      />,
    );

    expect(getByText('Estimated annual rewards')).toBeOnTheScreen();
    expect(
      getByTestId(TronEstimatedAnnualRewardsRowTestIds.SUBTITLE),
    ).toHaveTextContent('$45.67 · 8.765 TRX');
  });

  it('masks the subtitle when balances are hidden', () => {
    const { getByTestId } = render(
      <TronEstimatedAnnualRewardsRow
        title="Estimated annual rewards"
        subtitle="$45.67 · 8.765 TRX"
        hideBalances
      />,
    );

    expect(
      getByTestId(TronEstimatedAnnualRewardsRowTestIds.SUBTITLE),
    ).toHaveTextContent('•••••••••');
  });
});
