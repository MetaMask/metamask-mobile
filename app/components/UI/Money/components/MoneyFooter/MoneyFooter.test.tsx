import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyFooter from './MoneyFooter';
import { MoneyFooterTestIds } from './MoneyFooter.testIds';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

describe('MoneyFooter', () => {
  it('renders the Add money button', () => {
    const { getByTestId } = render(<MoneyFooter />);

    expect(getByTestId(MoneyFooterTestIds.ADD_MONEY_BUTTON)).toBeOnTheScreen();
  });

  it('renders with correct test IDs', () => {
    const { getByTestId } = render(<MoneyFooter />);

    expect(getByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(MoneyFooterTestIds.ADD_MONEY_BUTTON)).toBeOnTheScreen();
  });

  it('calls onAddMoneyPress when Add money button is pressed', () => {
    const mockAddMoney = jest.fn();
    const { getByTestId } = render(
      <MoneyFooter onAddMoneyPress={mockAddMoney} />,
    );

    fireEvent.press(getByTestId(MoneyFooterTestIds.ADD_MONEY_BUTTON));

    expect(mockAddMoney).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no callback is provided', () => {
    const { getByTestId } = render(<MoneyFooter />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyFooterTestIds.ADD_MONEY_BUTTON));
    }).not.toThrow();
  });
});
