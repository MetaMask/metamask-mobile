import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHeader from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

describe('MoneyHeader', () => {
  it('renders the title, balance, and APY', () => {
    const { getByTestId } = render(<MoneyHeader balance="$0.00" apy="4" />);

    expect(getByTestId(MoneyHeaderTestIds.TITLE)).toBeOnTheScreen();
    expect(getByTestId(MoneyHeaderTestIds.BALANCE)).toBeOnTheScreen();
    expect(getByTestId(MoneyHeaderTestIds.APY)).toBeOnTheScreen();
  });

  it('renders back and menu buttons', () => {
    const { getByTestId } = render(<MoneyHeader balance="$0.00" apy="4" />);

    expect(getByTestId(MoneyHeaderTestIds.BACK_BUTTON)).toBeOnTheScreen();
    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('calls onBackPress when back button is pressed', () => {
    const mockBack = jest.fn();
    const { getByTestId } = render(
      <MoneyHeader balance="$0.00" apy="4" onBackPress={mockBack} />,
    );

    fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('calls onMenuPress when menu button is pressed', () => {
    const mockMenu = jest.fn();
    const { getByTestId } = render(
      <MoneyHeader balance="$0.00" apy="4" onMenuPress={mockMenu} />,
    );

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(mockMenu).toHaveBeenCalledTimes(1);
  });
});
