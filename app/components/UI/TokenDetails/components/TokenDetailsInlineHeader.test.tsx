import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();
  const mockOnOptionsPress = jest.fn();

  const defaultProps = {
    onBackPress: mockOnBackPress,
    onOptionsPress: mockOnOptionsPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders back button with testID', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader {...defaultProps} />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('renders options button when onOptionsPress is provided', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader {...defaultProps} />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
      expect(getByTestId('button-icon')).toBeOnTheScreen();
    });

    it('renders placeholder when onOptionsPress is falsy', () => {
      const { getByTestId, queryByTestId } = render(
        <TokenDetailsInlineHeader
          {...defaultProps}
          onOptionsPress={undefined}
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
      expect(queryByTestId('button-icon')).not.toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader {...defaultProps} />,
      );

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });

    it('calls onOptionsPress when options button is pressed', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader {...defaultProps} />,
      );

      fireEvent.press(getByTestId('button-icon'));

      expect(mockOnOptionsPress).toHaveBeenCalledTimes(1);
    });
  });
});
