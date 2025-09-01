import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsAmountDisplay from './PerpsAmountDisplay';
import { formatPrice } from '../../utils/formatUtils';

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

jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((value, options) => {
    const num = parseFloat(value);
    if (options?.minimumDecimals === 0 && Number.isInteger(num)) {
      return `$${num}`;
    }
    return `$${value}`;
  }),
}));

describe('PerpsAmountDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('displays amount and max amount with proper formatting', () => {
      // Arrange
      const amount = '1000';
      const maxAmount = 5000;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay amount={amount} maxAmount={maxAmount} />,
      );

      // Assert
      expect(getByText('$1000')).toBeTruthy();
      expect(getByText('$5000 max')).toBeTruthy();
    });

    it('displays $0 when amount is empty', () => {
      // Arrange
      const emptyAmount = '';
      const maxAmount = 5000;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay amount={emptyAmount} maxAmount={maxAmount} />,
      );

      // Assert
      expect(getByText('$0')).toBeTruthy();
    });

    it('displays label when provided', () => {
      // Arrange - Testing branch coverage for line 72
      const label = 'Enter Amount';
      const amount = '1000';
      const maxAmount = 10000;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          label={label}
          maxAmount={maxAmount}
        />,
      );

      // Assert
      expect(getByText(label)).toBeTruthy();
    });

    it('displays token amount when showTokenAmount is true', () => {
      // Arrange - Testing branch coverage for line 85
      const tokenAmount = '0.5';
      const tokenSymbol = 'ETH';
      const amount = '1000';
      const maxAmount = 10000;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          maxAmount={maxAmount}
          showTokenAmount
          tokenAmount={tokenAmount}
          tokenSymbol={tokenSymbol}
        />,
      );

      // Assert
      expect(getByText(`${tokenAmount} ${tokenSymbol}`)).toBeTruthy();
    });
  });

  describe('Warning States', () => {
    it('shows default warning when showWarning is true and maxAmount is 0', () => {
      // Arrange
      const amount = '1000';
      const maxAmount = 0;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          maxAmount={maxAmount}
          showWarning
        />,
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
      const maxAmount = 5000;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          maxAmount={maxAmount}
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
      const maxAmount = 5000;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay
          amount={amount}
          maxAmount={maxAmount}
          onPress={onPressMock}
        />,
      );
      fireEvent.press(getByText('$1000'));

      // Assert
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('handles press gracefully when onPress is not provided', () => {
      // Arrange
      const amount = '1000';
      const maxAmount = 5000;

      // Act
      const { getByText } = render(
        <PerpsAmountDisplay amount={amount} maxAmount={maxAmount} />,
      );

      // Assert - This should not throw an error
      expect(() => fireEvent.press(getByText('$1000'))).not.toThrow();
    });
  });

  describe('Active State', () => {
    it('shows cursor when isActive is true', () => {
      // Arrange
      const amount = '1000';
      const maxAmount = 5000;

      // Act
      const { getByTestId } = render(
        <PerpsAmountDisplay amount={amount} maxAmount={maxAmount} isActive />,
      );

      // Assert
      expect(getByTestId('cursor')).toBeTruthy();
    });

    it('hides cursor when isActive is false', () => {
      // Arrange
      const amount = '1000';
      const maxAmount = 5000;

      // Act
      const { queryByTestId } = render(
        <PerpsAmountDisplay
          amount={amount}
          maxAmount={maxAmount}
          isActive={false}
        />,
      );

      // Assert
      expect(queryByTestId('cursor')).toBeNull();
    });
  });

  describe('Formatting', () => {
    it('formats prices with correct decimal places', () => {
      // Arrange
      const amount = '1234.56';
      const maxAmount = 9876.54;

      // Act
      render(<PerpsAmountDisplay amount={amount} maxAmount={maxAmount} />);

      // Assert
      expect(formatPrice).toHaveBeenCalledWith('1234.56', {
        minimumDecimals: 0,
        maximumDecimals: 2,
      });
      expect(formatPrice).toHaveBeenCalledWith(9876.54, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });
    });
  });
});
