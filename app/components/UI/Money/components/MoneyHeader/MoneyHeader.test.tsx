import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHeader from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

describe('MoneyHeader', () => {
  it('renders the back and menu buttons', () => {
    const { getByTestId } = render(<MoneyHeader />);

    expect(getByTestId(MoneyHeaderTestIds.BACK_BUTTON)).toBeOnTheScreen();
    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('calls onBackPress when the back button is pressed', () => {
    const mockOnBackPress = jest.fn();
    const { getByTestId } = render(
      <MoneyHeader onBackPress={mockOnBackPress} />,
    );

    fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));

    expect(mockOnBackPress).toHaveBeenCalledTimes(1);
  });

  it('calls onMenuPress when the menu button is pressed', () => {
    const mockOnMenuPress = jest.fn();
    const { getByTestId } = render(
      <MoneyHeader onMenuPress={mockOnMenuPress} />,
    );

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(mockOnMenuPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no callbacks are provided', () => {
    const { getByTestId } = render(<MoneyHeader />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));
      fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));
    }).not.toThrow();
  });
});
