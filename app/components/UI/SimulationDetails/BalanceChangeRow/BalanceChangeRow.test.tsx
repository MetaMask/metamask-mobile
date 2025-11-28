import React from 'react';
import { render } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';

import BalanceChangeRow from './BalanceChangeRow';
import { AssetType, BalanceChange } from '../types';

jest.mock('../AmountPill/AmountPill', () => 'AmountPill');
jest.mock('../AssetPill/AssetPill', () => 'AssetPill');
jest.mock('../FiatDisplay/FiatDisplay', () => ({
  IndividualFiatDisplay: 'IndividualFiatDisplay',
}));

const CHAIN_ID_MOCK = '0x123';

const balanceChangeMock: BalanceChange = {
  asset: {
    type: AssetType.ERC20,
    address: '0xabc123',
    chainId: CHAIN_ID_MOCK,
  },
  amount: new BigNumber(100),
  fiatAmount: 0,
  usdAmount: 0,
} as BalanceChange;

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

  it('adds EditSpendingCapButton component if onApprovalAmountUpdate is defined', () => {
    const { getByTestId } = render(
      <BalanceChangeRow
        showFiat={false}
        balanceChange={balanceChangeMock}
        onApprovalAmountUpdate={() => Promise.resolve()}
      />,
    );

    expect(getByTestId('edit-spending-cap-button')).toBeTruthy();
  });

  it('renders an alert row if there are incoming tokens and a label is provided', () => {
    const { getByTestId, queryByTestId } = render(
      <BalanceChangeRow
        showFiat={false}
        balanceChange={balanceChangeMock}
        label="You received"
        hasIncomingTokens
      />,
    );
    expect(getByTestId('info-row')).toBeTruthy();
    expect(queryByTestId('balance-change-row-label')).toBeNull();
  });

  it('does not render an alert row if there are no incoming tokens', () => {
    const { getByTestId, queryByTestId } = render(
      <BalanceChangeRow
        showFiat={false}
        balanceChange={balanceChangeMock}
        label="You received"
        hasIncomingTokens={false}
      />,
    );
    expect(getByTestId('balance-change-row-label')).toBeTruthy();
    expect(queryByTestId('info-row')).toBeNull();
  });

  it('does not render an alert row if no label is provided', () => {
    const { queryByTestId } = render(
      <BalanceChangeRow
        showFiat={false}
        balanceChange={balanceChangeMock}
        hasIncomingTokens
      />,
    );
    expect(queryByTestId('info-row')).toBeNull();
  });
});
