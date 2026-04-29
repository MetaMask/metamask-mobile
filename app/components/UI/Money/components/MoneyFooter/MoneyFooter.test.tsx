import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyFooter from './MoneyFooter';
import { MoneyFooterTestIds } from './MoneyFooter.testIds';

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

  describe('convert-musd variant', () => {
    it('renders the Convert to mUSD button instead of Add money', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyFooter variant="convert-musd" />,
      );

      expect(
        getByTestId(MoneyFooterTestIds.CONVERT_TO_MUSD_BUTTON),
      ).toBeOnTheScreen();
      expect(queryByTestId(MoneyFooterTestIds.ADD_MONEY_BUTTON)).toBeNull();
    });

    it('calls onConvertPress when Convert to mUSD is pressed', () => {
      const mockConvert = jest.fn();
      const { getByTestId } = render(
        <MoneyFooter variant="convert-musd" onConvertPress={mockConvert} />,
      );

      fireEvent.press(getByTestId(MoneyFooterTestIds.CONVERT_TO_MUSD_BUTTON));
      expect(mockConvert).toHaveBeenCalledTimes(1);
    });
  });
});
