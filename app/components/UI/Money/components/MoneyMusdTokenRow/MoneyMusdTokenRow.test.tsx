import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyMusdTokenRow from './MoneyMusdTokenRow';
import { MoneyMusdTokenRowTestIds } from './MoneyMusdTokenRow.testIds';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';

describe('MoneyMusdTokenRow', () => {
  it('renders the token name and symbol', () => {
    const { getByText } = render(<MoneyMusdTokenRow />);

    expect(getByText(MUSD_TOKEN.name)).toBeOnTheScreen();
    expect(getByText(MUSD_TOKEN.symbol)).toBeOnTheScreen();
  });

  it('renders the Add button', () => {
    const { getByTestId } = render(<MoneyMusdTokenRow />);

    expect(getByTestId(MoneyMusdTokenRowTestIds.ADD_BUTTON)).toBeOnTheScreen();
  });

  it('calls onPress when the row is tapped', () => {
    const mockPress = jest.fn();
    const { getByTestId } = render(<MoneyMusdTokenRow onPress={mockPress} />);

    fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.CONTAINER));

    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('calls onAddPress when the Add button is tapped', () => {
    const mockAdd = jest.fn();
    const { getByTestId } = render(<MoneyMusdTokenRow onAddPress={mockAdd} />);

    fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.ADD_BUTTON));

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('does not throw when tapped without handlers', () => {
    const { getByTestId } = render(<MoneyMusdTokenRow />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.CONTAINER));
      fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.ADD_BUTTON));
    }).not.toThrow();
  });
});
