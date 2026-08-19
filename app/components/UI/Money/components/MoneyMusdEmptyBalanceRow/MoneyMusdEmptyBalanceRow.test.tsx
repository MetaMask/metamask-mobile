import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyMusdEmptyBalanceRow from './MoneyMusdEmptyBalanceRow';
import { MoneyMusdEmptyBalanceRowTestIds } from './MoneyMusdEmptyBalanceRow.testIds';

describe('MoneyMusdEmptyBalanceRow', () => {
  it('renders the MetaMask USD name', () => {
    const { getByText } = renderWithProvider(<MoneyMusdEmptyBalanceRow />);
    expect(getByText('MetaMask USD')).toBeOnTheScreen();
  });

  it('renders the zero fiat balance', () => {
    const { getByTestId } = renderWithProvider(<MoneyMusdEmptyBalanceRow />);
    expect(
      getByTestId(MoneyMusdEmptyBalanceRowTestIds.FIAT_BALANCE),
    ).toHaveTextContent('$0.00');
  });

  it('renders the zero native balance', () => {
    const { getByTestId } = renderWithProvider(<MoneyMusdEmptyBalanceRow />);
    expect(
      getByTestId(MoneyMusdEmptyBalanceRowTestIds.NATIVE_BALANCE),
    ).toHaveTextContent('0 mUSD');
  });

  it('calls onPress when the row is tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyMusdEmptyBalanceRow onPress={onPress} />,
    );
    fireEvent.press(getByTestId(MoneyMusdEmptyBalanceRowTestIds.CONTAINER));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when tapped without an onPress handler', () => {
    const { getByTestId } = renderWithProvider(<MoneyMusdEmptyBalanceRow />);
    expect(() =>
      fireEvent.press(getByTestId(MoneyMusdEmptyBalanceRowTestIds.CONTAINER)),
    ).not.toThrow();
  });
});
