import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PerpsAmountDisplaySelectorsIDs } from '../../Perps.testIds';
import PerpsAmountDisplay from './PerpsAmountDisplay';
import { formatPositionSize } from '../../utils/formatUtils';

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        default: '#141618',
        alternative: '#9fa6ae',
      },
      primary: {
        default: '#037DD6',
      },
      warning: {
        default: '#ffd33d',
      },
    },
    themeAppearance: 'light',
  }),
}));

jest.mock('../../utils/formatUtils', () => {
  const actual = jest.requireActual('../../utils/formatUtils');
  return {
    ...actual,
    formatPositionSize: jest.fn((value) => actual.formatPositionSize(value)),
  };
});

describe('PerpsAmountDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('displays amount with proper formatting', () => {
      // Arrange
      const amount = '1000';

      // Act
      const { getByText } = render(<PerpsAmountDisplay amount={amount} />);

      // Assert - Uses formatPerpsFiat with PRICE_RANGES_MINIMAL_VIEW (fixed 2 decimals), trailing zeros removed
      expect(getByText('$1,000')).toBeTruthy();
    });

    it('displays $0 when amount is empty', () => {
      // Arrange
      const emptyAmount = '';

      // Act
      const { getByText } = render(<PerpsAmountDisplay amount={emptyAmount} />);

      // Assert
      expect(getByText('$0')).toBeTruthy();
    });

    it('displays label when provided', () => {
      // Arrange - Testing branch coverage for line 72
      const label = 'Enter Amount';
      const amount = '1000';

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay amount={amount} label={label} />,
      );

      // Assert
      expect(getByText(label)).toBeTruthy();
    });

    it('displays token amount when showTokenAmount is true', () => {
      // Arrange - Testing branch coverage for line 85
      const tokenAmount = '0.5';
      const tokenSymbol = 'ETH';
      const amount = '1000';

      // Act
      render(
        <PerpsAmountDisplay
          amount={amount}
          showTokenAmount
          tokenAmount={tokenAmount}
          tokenSymbol={tokenSymbol}
        />,
      );

      // Assert
      // There will be 2 elements: one in the main display and one in the token amount section
      const tokenElements = screen.getAllByText(
        `${tokenAmount} ${tokenSymbol}`,
      );
      expect(tokenElements.length).toBe(2);
      expect(formatPositionSize).toHaveBeenCalledWith(tokenAmount);
    });
  });

  describe('Warning States', () => {
    it('shows default warning when showWarning is true and maxAmount is 0', () => {
      // Arrange
      const amount = '1000';

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay amount={amount} showWarning />,
      );

      // Assert
      expect(
        getByText('No funds available. Please deposit first.'),
      ).toBeTruthy();
    });

    it('shows custom warning message when provided', () => {
      // Arrange
      const customMessage = 'Insufficient balance';
      const amount = '1000';

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          showWarning
          warningMessage={customMessage}
        />,
      );

      // Assert
      expect(getByText(customMessage)).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onPress handler when amount is pressed', () => {
      // Arrange
      const onPressMock = jest.fn();
      const amount = '1000';

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay amount={amount} onPress={onPressMock} />,
      );
      fireEvent.press(getByText('$1,000'));

      // Assert
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('handles press gracefully when onPress is not provided', () => {
      // Arrange
      const amount = '1000';

      // Act
      const { getByText } = render(<PerpsAmountDisplay amount={amount} />);

      // Assert - This should not throw an error
      expect(() => fireEvent.press(getByText('$1,000'))).not.toThrow();
    });
  });

  describe('Active State', () => {
    it('shows cursor when isActive is true', () => {
      // Arrange
      const amount = '1000';

      // Act
      const { getByTestId } = render(
        <PerpsAmountDisplay amount={amount} isActive />,
      );

      // Assert
      expect(getByTestId('cursor')).toBeTruthy();
    });

    it('hides cursor when isActive is false', () => {
      // Arrange
      const amount = '1000';

      // Act
      const { queryByTestId } = render(
        <PerpsAmountDisplay amount={amount} isActive={false} />,
      );

      // Assert
      expect(queryByTestId('cursor')).toBeNull();
    });
  });

  describe('Token Amount Display', () => {
    it('displays token amount when showMaxAmount is true with token data', () => {
      // Arrange
      const amount = '1000';
      const tokenAmount = '0.025';
      const tokenSymbol = 'BTC';

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          showMaxAmount
          tokenAmount={tokenAmount}
          tokenSymbol={tokenSymbol}
        />,
      );

      // Assert
      expect(getByText('0.025 BTC')).toBeTruthy();
      expect(formatPositionSize).toHaveBeenCalledWith(tokenAmount);
    });

    it('does not display token amount when showMaxAmount is false', () => {
      // Arrange
      const amount = '1000';
      const tokenAmount = '0.025';
      const tokenSymbol = 'BTC';

      // Act
      const { queryByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          showMaxAmount={false}
          tokenAmount={tokenAmount}
          tokenSymbol={tokenSymbol}
        />,
      );

      // Assert
      expect(queryByText('0.025 BTC')).toBeNull();
    });

    it('does not display anything when showMaxAmount is true but no token data', () => {
      // Arrange
      const amount = '1000';

      // Act
      const { queryByTestId } = render(
        <PerpsAmountDisplay amount={amount} showMaxAmount />,
      );

      // Assert - The component should not show the token amount section
      // When no token data is provided, the token amount section won't be rendered
      // We verify by checking if the amount display is there but no token text
      expect(
        queryByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      ).toBeTruthy();
      // No token amount should be displayed
      expect(screen.queryByText(/BTC|ETH|SOL/)).toBeNull();
    });

    it('strips hip3 prefix from token symbol when showing token amount', () => {
      // Arrange
      const tokenAmount = '1.5';
      const tokenSymbol = 'hip3:BTC';
      const amount = '50000';

      // Act
      render(
        <PerpsAmountDisplay
          amount={amount}
          showTokenAmount
          tokenAmount={tokenAmount}
          tokenSymbol={tokenSymbol}
        />,
      );

      // Assert
      const tokenElements = screen.getAllByText('1.5 BTC');
      expect(tokenElements.length).toBe(2); // Main display and token amount section
    });

    it('strips DEX prefix from token symbol when showing max amount', () => {
      // Arrange
      const amount = '10000';
      const tokenAmount = '100';
      const tokenSymbol = 'xyz:TSLA';

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          showMaxAmount
          tokenAmount={tokenAmount}
          tokenSymbol={tokenSymbol}
        />,
      );

      // Assert
      expect(getByText('100 TSLA')).toBeTruthy();
    });

    it('keeps regular token symbols unchanged', () => {
      // Arrange
      const amount = '5000';
      const tokenAmount = '2.5';
      const tokenSymbol = 'SOL';

      // Act
      render(
        <PerpsAmountDisplay
          amount={amount}
          showTokenAmount
          tokenAmount={tokenAmount}
          tokenSymbol={tokenSymbol}
        />,
      );

      // Assert
      const tokenElements = screen.getAllByText('2.5 SOL');
      expect(tokenElements.length).toBe(2);
    });
  });

  describe('Formatting', () => {
    it('formats prices with correct decimal places', () => {
      // Arrange
      const amount = '1234.56';

      // Act
      const { getByText } = render(<PerpsAmountDisplay amount={amount} />);

      // Assert - Now uses formatPerpsFiat with PRICE_RANGES_MINIMAL_VIEW (fixed 2 decimals)
      expect(getByText('$1,234.56')).toBeTruthy();
    });

    it('formats USD amounts with maximum 2 decimal places', () => {
      // Arrange
      const amount = '1234.5678';

      // Act
      const { getByText } = render(<PerpsAmountDisplay amount={amount} />);

      // Assert - Verify USD amounts are limited to 2 decimal places
      expect(getByText('$1,234.57')).toBeTruthy(); // Rounded to 2 decimals
    });
  });
});
