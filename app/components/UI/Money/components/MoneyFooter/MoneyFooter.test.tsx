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

  describe('swap-buy variant', () => {
    it('renders Swap and Buy buttons instead of Add money', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyFooter variant="swap-buy" />,
      );

      expect(getByTestId(MoneyFooterTestIds.SWAP_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(MoneyFooterTestIds.BUY_BUTTON)).toBeOnTheScreen();
      expect(queryByTestId(MoneyFooterTestIds.ADD_MONEY_BUTTON)).toBeNull();
    });

    it('calls onSwapPress when Swap button is pressed', () => {
      const mockSwap = jest.fn();
      const { getByTestId } = render(
        <MoneyFooter variant="swap-buy" onSwapPress={mockSwap} />,
      );

      fireEvent.press(getByTestId(MoneyFooterTestIds.SWAP_BUTTON));
      expect(mockSwap).toHaveBeenCalledTimes(1);
    });

    it('calls onBuyPress when Buy button is pressed', () => {
      const mockBuy = jest.fn();
      const { getByTestId } = render(
        <MoneyFooter variant="swap-buy" onBuyPress={mockBuy} />,
      );

      fireEvent.press(getByTestId(MoneyFooterTestIds.BUY_BUTTON));
      expect(mockBuy).toHaveBeenCalledTimes(1);
    });
  });
});
