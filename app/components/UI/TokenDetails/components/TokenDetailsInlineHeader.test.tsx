import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('control group (useAmbientColor=false)', () => {
    it('renders back button even when iconColorClass is undefined', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor={false}
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('renders back button when iconColorClass is provided', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColorClass="text-success-default"
          useAmbientColor={false}
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor={false}
        />,
      );

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('treatment group (useAmbientColor=true)', () => {
    it('does not render back button when iconColorClass is undefined', () => {
      const { queryByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor
        />,
      );

      expect(queryByTestId('back-arrow-button')).not.toBeOnTheScreen();
    });

    it('renders back button when iconColorClass is provided', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColorClass="text-success-default"
          useAmbientColor
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColorClass="text-success-default"
          useAmbientColor
        />,
      );

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });
  });
});
