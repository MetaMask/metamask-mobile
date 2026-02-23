import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();
  const mockOnOptionsPress = jest.fn();

  const defaultProps = {
    title: 'ETH',
    networkName: 'Ethereum Mainnet',
    onBackPress: mockOnBackPress,
    onOptionsPress: mockOnOptionsPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders title text', () => {
      const { getByText } = render(
        <TokenDetailsInlineHeader {...defaultProps} />,
      );

      expect(getByText('ETH')).toBeOnTheScreen();
    });

    it('renders network name when provided', () => {
      const { getByText } = render(
        <TokenDetailsInlineHeader {...defaultProps} />,
      );

      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('does not render network name when empty string', () => {
      const { queryByText } = render(
        <TokenDetailsInlineHeader {...defaultProps} networkName="" />,
      );

      expect(queryByText('Ethereum Mainnet')).not.toBeOnTheScreen();
    });

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
      const props = {
        ...defaultProps,
        onOptionsPress: undefined,
      };

      const { getByTestId, queryByTestId } = render(
        <TokenDetailsInlineHeader {...props} />,
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

  describe('edge cases', () => {
    it('handles long title text with truncation', () => {
      const longTitle = 'VeryLongTokenSymbolName';
      const { getByText } = render(
        <TokenDetailsInlineHeader {...defaultProps} title={longTitle} />,
      );

      const titleElement = getByText(longTitle);
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('handles long network name with truncation', () => {
      const longNetworkName = 'Very Long Network Name That Should Be Truncated';
      const { getByText } = render(
        <TokenDetailsInlineHeader
          {...defaultProps}
          networkName={longNetworkName}
        />,
      );

      const networkElement = getByText(longNetworkName);
      expect(networkElement.props.numberOfLines).toBe(1);
    });
  });
});
