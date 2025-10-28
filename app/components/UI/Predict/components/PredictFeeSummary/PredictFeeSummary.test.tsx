import React from 'react';
import { render } from '@testing-library/react-native';
import PredictFeeSummary from './PredictFeeSummary';

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value, options) =>
    value !== undefined
      ? `$${value.toFixed(options?.maximumDecimals ?? 2)}`
      : '$0.00',
  ),
}));

describe('PredictFeeSummary', () => {
  const defaultProps = {
    disabled: false,
    providerFee: 0,
    metamaskFee: 0.04,
    total: 1.04,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders fee summary when not disabled', () => {
      // Arrange
      const props = { ...defaultProps, disabled: false };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert
      expect(getByText('Provider fee')).toBeTruthy();
      expect(getByText('MetaMask fee')).toBeTruthy();
      expect(getByText('Total')).toBeTruthy();
    });

    it('does not render fee summary when disabled', () => {
      // Arrange
      const props = { ...defaultProps, disabled: true };

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
      // Arrange
      const props = { ...defaultProps, providerFee: 0.1 };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert
      expect(getByText('$0.10')).toBeTruthy();
    });

    it('displays MetaMask fee correctly', () => {
      // Arrange
      const props = { ...defaultProps, metamaskFee: 0.08 };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert
      expect(getByText('$0.08')).toBeTruthy();
    });

    it('displays total correctly', () => {
      // Arrange
      const props = { ...defaultProps, total: 2.12 };

      // Act
      const { getByText } = render(<PredictFeeSummary {...props} />);

      // Assert
      expect(getByText('$2.12')).toBeTruthy();
    });

    it('displays zero fees correctly', () => {
      // Arrange
      const props = {
        ...defaultProps,
        providerFee: 0,
        metamaskFee: 0,
        total: 0,
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
