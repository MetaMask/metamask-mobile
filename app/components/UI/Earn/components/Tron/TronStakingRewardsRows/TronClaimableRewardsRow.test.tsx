import React from 'react';
import { render } from '@testing-library/react-native';
import TronClaimableRewardsRow, {
  TronClaimableRewardsRowTestIds,
} from './TronClaimableRewardsRow';

describe('TronClaimableRewardsRow', () => {
  it('renders from display props only', () => {
    const { getByText, getByTestId } = render(
      <TronClaimableRewardsRow
        title="Total claimable rewards"
        subtitle="$12.34 · 1.234 TRX"
        hideBalances={false}
      />,
    );

    expect(getByText('Total claimable rewards')).toBeOnTheScreen();
    expect(
      getByTestId(TronClaimableRewardsRowTestIds.SUBTITLE),
    ).toHaveTextContent('$12.34 · 1.234 TRX');
  });

  it('masks the subtitle when balances are hidden', () => {
    const { getByTestId } = render(
      <TronClaimableRewardsRow
        title="Total claimable rewards"
        subtitle="$12.34 · 1.234 TRX"
        hideBalances
      />,
    );

    expect(
      getByTestId(TronClaimableRewardsRowTestIds.SUBTITLE),
    ).toHaveTextContent('•••••••••');
  });
});
