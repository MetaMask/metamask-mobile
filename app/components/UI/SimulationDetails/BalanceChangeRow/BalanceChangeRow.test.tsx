import React from 'react';
import { render } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';

import BalanceChangeRow from './BalanceChangeRow';
import { BalanceChange } from '../types';

jest.mock('../FiatDisplay/FiatDisplay', () => ({
  IndividualFiatDisplay: 'IndividualFiatDisplay',
}));

const balanceChangeMock = {
  asset: {
    type: 'ERC20',
    address: '0xabc123',
  },
  amount: new BigNumber(100),
  fiatAmount: 0, // Add the fiatAmount property with a default value
} as BalanceChange;

jest.mock('../AmountPill/AmountPill', () => 'AmountPill');
jest.mock('../AssetPill/AssetPill', () => 'AssetPill');

describe('BalanceChangeList', () => {
  it('renders a balance change row', () => {
    const { getByText, getByTestId } = render(
      <BalanceChangeRow
        label="You received"
        balanceChange={balanceChangeMock}
      />,
    );

    expect(getByText('You received')).toBeDefined();
    expect(getByTestId('balance-change-row-label')).toBeDefined();
    expect(getByTestId('balance-change-row-amount-pill')).toBeDefined();
    expect(getByTestId('balance-change-row-asset-pill')).toBeDefined();
  });

  it("doesn't render label if not defined", () => {
    const { getByTestId, queryByTestId } = render(
      <BalanceChangeRow balanceChange={balanceChangeMock} />,
    );

    expect(queryByTestId('balance-change-row-label')).toBeNull();
    expect(getByTestId('balance-change-row-amount-pill')).toBeDefined();
    expect(getByTestId('balance-change-row-asset-pill')).toBeDefined();
  });

  it('renders IndividualFiatDisplay when showFiat is true', () => {
    const { queryByTestId } = render(
      <BalanceChangeRow showFiat balanceChange={balanceChangeMock} />,
    );

    const container = queryByTestId('balance-change-row-fiat-display');

    expect(container).not.toBeNull();
  });

  it('does not render IndividualFiatDisplay when showFiat is false', () => {
    const { queryByTestId } = render(
      <BalanceChangeRow showFiat={false} balanceChange={balanceChangeMock} />,
    );

    const container = queryByTestId('balance-change-row-fiat-display');

    expect(container).toBeNull();
  });
});
