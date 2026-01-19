import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import QuickAmounts from './QuickAmounts';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('QuickAmounts', () => {
  const mockOnAmountPress = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders default amounts ($50, $100, $200, $400)', () => {
    const { getByText } = renderWithTheme(
      <QuickAmounts onAmountPress={mockOnAmountPress} />,
    );

    expect(getByText('$50')).toBeOnTheScreen();
    expect(getByText('$100')).toBeOnTheScreen();
    expect(getByText('$200')).toBeOnTheScreen();
    expect(getByText('$400')).toBeOnTheScreen();
  });

  it('renders custom amounts when provided', () => {
    const { getByText, queryByText } = renderWithTheme(
      <QuickAmounts
        amounts={[25, 75, 150]}
        onAmountPress={mockOnAmountPress}
      />,
    );

    expect(getByText('$25')).toBeOnTheScreen();
    expect(getByText('$75')).toBeOnTheScreen();
    expect(getByText('$150')).toBeOnTheScreen();
    expect(queryByText('$50')).toBeNull();
  });

  it('uses custom currency symbol when provided', () => {
    const { getByText } = renderWithTheme(
      <QuickAmounts
        amounts={[50, 100]}
        currencySymbol="€"
        onAmountPress={mockOnAmountPress}
      />,
    );

    expect(getByText('€50')).toBeOnTheScreen();
    expect(getByText('€100')).toBeOnTheScreen();
  });

  it('calls onAmountPress with correct amount when button is pressed', () => {
    const { getByText } = renderWithTheme(
      <QuickAmounts onAmountPress={mockOnAmountPress} />,
    );

    fireEvent.press(getByText('$100'));

    expect(mockOnAmountPress).toHaveBeenCalledTimes(1);
    expect(mockOnAmountPress).toHaveBeenCalledWith(100);
  });

  it('renders with custom testID', () => {
    const { getByTestId } = renderWithTheme(
      <QuickAmounts
        testID="custom-quick-amounts"
        onAmountPress={mockOnAmountPress}
      />,
    );

    expect(getByTestId('custom-quick-amounts')).toBeOnTheScreen();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(
      <QuickAmounts onAmountPress={mockOnAmountPress} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
