import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders back button when iconColorClass is provided', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader
        onBackPress={mockOnBackPress}
        iconColorClass="text-success-default"
      />,
    );

    expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
  });

  it('does not render back button when iconColorClass is undefined', () => {
    const { queryByTestId } = render(
      <TokenDetailsInlineHeader onBackPress={mockOnBackPress} />,
    );

    expect(queryByTestId('back-arrow-button')).not.toBeOnTheScreen();
  });

  it('calls onBackPress when back button is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader
        onBackPress={mockOnBackPress}
        iconColorClass="text-success-default"
      />,
    );

    fireEvent.press(getByTestId('back-arrow-button'));

    expect(mockOnBackPress).toHaveBeenCalledTimes(1);
  });
});
