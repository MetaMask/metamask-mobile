import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';
import { LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('control group (useAmbientColor=false)', () => {
    it('renders back button even when iconColor is undefined', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor={false}
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('renders back button when iconColor is provided', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
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
    it('does not render back button when iconColor is undefined', () => {
      const { queryByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor
        />,
      );

      expect(queryByTestId('back-arrow-button')).not.toBeOnTheScreen();
    });

    it('renders back button when iconColor is provided', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
          useAmbientColor
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
          useAmbientColor
        />,
      );

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });
  });
});
