import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders back button', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader onBackPress={mockOnBackPress} />,
    );

    expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
  });

  it('calls onBackPress when back button is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader onBackPress={mockOnBackPress} />,
    );

    fireEvent.press(getByTestId('back-arrow-button'));

    expect(mockOnBackPress).toHaveBeenCalledTimes(1);
  });
});
