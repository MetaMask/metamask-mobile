import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AssetInlineHeader } from './AssetInlineHeader';

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock useStyles hook
jest.mock('../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      leftButton: {},
      titleWrapper: {},
      rightButton: {},
      rightPlaceholder: {},
    },
  }),
}));

describe('AssetInlineHeader', () => {
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
      const { getByText } = render(<AssetInlineHeader {...defaultProps} />);

      expect(getByText('ETH')).toBeOnTheScreen();
    });

    it('renders network name when provided', () => {
      const { getByText } = render(<AssetInlineHeader {...defaultProps} />);

      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('does not render network name when empty string', () => {
      const { queryByText } = render(
        <AssetInlineHeader {...defaultProps} networkName="" />,
      );

      expect(queryByText('Ethereum Mainnet')).toBeNull();
    });

    it('renders back button with testID', () => {
      const { getByTestId } = render(<AssetInlineHeader {...defaultProps} />);

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('renders options button when onOptionsPress is provided', () => {
      const { getByTestId } = render(<AssetInlineHeader {...defaultProps} />);

      // Both buttons are rendered - back button and options button (button-icon)
      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
      expect(getByTestId('button-icon')).toBeOnTheScreen();
    });

    it('renders placeholder when onOptionsPress is falsy', () => {
      const props = {
        ...defaultProps,
        onOptionsPress: undefined as unknown as () => void,
      };

      const { getByTestId, queryByTestId } = render(
        <AssetInlineHeader {...props} />,
      );

      // Only back button is rendered, options button should not be present
      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
      expect(queryByTestId('button-icon')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(<AssetInlineHeader {...defaultProps} />);

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });

    it('calls onOptionsPress when options button is pressed', () => {
      const { getByTestId } = render(<AssetInlineHeader {...defaultProps} />);

      fireEvent.press(getByTestId('button-icon'));

      expect(mockOnOptionsPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles long title text with truncation', () => {
      const longTitle = 'VeryLongTokenSymbolName';
      const { getByText } = render(
        <AssetInlineHeader {...defaultProps} title={longTitle} />,
      );

      const titleElement = getByText(longTitle);
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('handles long network name with truncation', () => {
      const longNetworkName = 'Very Long Network Name That Should Be Truncated';
      const { getByText } = render(
        <AssetInlineHeader {...defaultProps} networkName={longNetworkName} />,
      );

      const networkElement = getByText(longNetworkName);
      expect(networkElement.props.numberOfLines).toBe(1);
    });
  });
});
