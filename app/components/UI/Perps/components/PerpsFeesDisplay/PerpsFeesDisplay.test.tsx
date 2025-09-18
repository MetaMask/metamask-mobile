import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsFeesDisplay from './PerpsFeesDisplay';

describe('PerpsFeesDisplay', () => {
  // Test the core component logic without complex theme mocking
  const mockProps = {
    formatFeeText: '$10.00',
  };

  describe('Fee Discount Display Logic', () => {
    it('hides discount when percentage is undefined', () => {
      // Act
      const { queryByText } = render(
        <PerpsFeesDisplay {...mockProps} feeDiscountPercentage={undefined} />,
      );

      // Assert
      expect(queryByText(/-\d+%/)).toBeNull();
    });

    it('hides discount when percentage is zero', () => {
      // Act
      const { queryByText } = render(
        <PerpsFeesDisplay {...mockProps} feeDiscountPercentage={0} />,
      );

      // Assert
      expect(queryByText(/-\d+%/)).toBeNull();
    });

    it('hides discount when percentage is negative', () => {
      // Act
      const { queryByText } = render(
        <PerpsFeesDisplay {...mockProps} feeDiscountPercentage={-5} />,
      );

      // Assert
      expect(queryByText(/-\d+%/)).toBeNull();
    });

    it('displays discount when percentage is positive', () => {
      // Arrange
      const discountPercentage = 15;

      // Act
      const { getByText } = render(
        <PerpsFeesDisplay
          {...mockProps}
          feeDiscountPercentage={discountPercentage}
        />,
      );

      // Assert
      expect(getByText('-15%')).toBeOnTheScreen();
    });

    it.each([1, 5, 10, 25, 50] as const)(
      'displays discount correctly for %s percent',
      (percentage) => {
        // Act
        const { getByText } = render(
          <PerpsFeesDisplay
            {...mockProps}
            feeDiscountPercentage={percentage}
          />,
        );

        // Assert
        expect(getByText(`-${percentage}%`)).toBeOnTheScreen();
      },
    );
  });

  describe('Fee Text Display', () => {
    it('displays formatted fee text', () => {
      // Arrange
      const feeText = '$25.50';

      // Act
      const { getByText } = render(
        <PerpsFeesDisplay formatFeeText={feeText} />,
      );

      // Assert
      expect(getByText(feeText)).toBeOnTheScreen();
    });

    it('displays both fee text and discount when both are provided', () => {
      // Arrange
      const feeText = '$100.00';
      const discountPercentage = 20;

      // Act
      const { getByText } = render(
        <PerpsFeesDisplay
          formatFeeText={feeText}
          feeDiscountPercentage={discountPercentage}
        />,
      );

      // Assert
      expect(getByText(feeText)).toBeOnTheScreen();
      expect(getByText('-20%')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles decimal discount percentages', () => {
      // Arrange
      const decimalPercentage = 12.5;

      // Act
      const { getByText } = render(
        <PerpsFeesDisplay
          {...mockProps}
          feeDiscountPercentage={decimalPercentage}
        />,
      );

      // Assert
      expect(getByText('-12.5%')).toBeOnTheScreen();
    });
  });
});
