import React from 'react';
import { render } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';

import BalanceChangeRow from './BalanceChangeRow';
import { BalanceChange } from '../types';

const balanceChangeMock = {
  asset: {
    type: 'ERC20',
    address: '0xabc123',
  },
  amount: new BigNumber(100),
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
});
