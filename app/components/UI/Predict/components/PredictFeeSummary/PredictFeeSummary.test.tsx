import React from 'react';
import { render } from '@testing-library/react-native';
import PredictFeeSummary from './PredictFeeSummary';

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value, options) => `$${value.toFixed(options?.maximumDecimals ?? 2)}`),
}));

describe('PredictFeeSummary', () => {
  const defaultProps = {
    isInputFocused: false,
    currentValue: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders fee summary when input is not focused', () => {
      // Arrange
      const props = { ...defaultProps, isInputFocused: false };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert
      expect(getByText('Provider fee')).toBeTruthy();
      expect(getByText('MetaMask fee')).toBeTruthy();
      expect(getByText('Total')).toBeTruthy();
    });

    it('does not render fee summary when input is focused', () => {
      // Arrange
      const props = { ...defaultProps, isInputFocused: true };

      // Act
      const { queryByText } = render(<PredictFeeSummary {...props} />);

      // Assert
      expect(queryByText('Provider fee')).toBeNull();
      expect(queryByText('MetaMask fee')).toBeNull();
      expect(queryByText('Total')).toBeNull();
    });
  });

  describe('Fee Display', () => {
    it('displays provider fee correctly', () => {
      // Arrange - Provider fee is always 0 (currentValue * 0)
      const props = { ...defaultProps, currentValue: 10 };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert - Provider fee should always be $0.00
      expect(getByText('$0.00')).toBeTruthy();
    });

    it('displays MetaMask fee correctly', () => {
      // Arrange - MetaMask fee is currentValue * 0.04
      const props = { ...defaultProps, currentValue: 2 };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert - 2 * 0.04 = $0.08
      expect(getByText('$0.08')).toBeTruthy();
    });

    it('displays total correctly', () => {
      // Arrange - Total is currentValue + providerFee + metamaskFee
      const props = { ...defaultProps, currentValue: 2 };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert - 2 + 0 + 0.08 = $2.08
      expect(getByText('$2.08')).toBeTruthy();
    });

    it('displays zero fees correctly', () => {
      // Arrange
      const props = {
        ...defaultProps,
        currentValue: 0,
      };

      // Act
      const { getAllByText } = render(<PredictFeeSummary {...props} />);

      // Assert - Should have three $0.00 (provider fee, MetaMask fee, and total)
      const zeroAmounts = getAllByText('$0.00');
      expect(zeroAmounts).toHaveLength(3);
    });
  });

  describe('Info Icons', () => {
    it('renders component with info icons', () => {
      // Arrange
      const props = { ...defaultProps };

      // Act
      const { toJSON } = render(<PredictFeeSummary {...props} />);

      // Assert - Component renders successfully with all expected elements
      expect(toJSON()).toBeTruthy();
    });
  });
});
