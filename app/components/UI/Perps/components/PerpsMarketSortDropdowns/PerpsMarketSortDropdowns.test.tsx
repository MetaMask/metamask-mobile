import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortDropdowns from './PerpsMarketSortDropdowns';
import type { SortOptionId } from '../../constants/perpsConfig';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      dropdownButton: {},
      dropdownButtonPressed: {},
      dropdownButtonActive: {},
      dropdownText: {},
      dropdownTextActive: {},
    },
  }),
}));

// Mock the design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: View,
  };
});

// Mock component-library Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextColor: {
      Default: 'Default',
    },
    TextVariant: {
      BodySM: 'BodySM',
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.volume': 'Volume',
      'perps.sort.price_change': 'Price change',
      'perps.sort.funding_rate': 'Funding rate',
      'perps.sort.open_interest': 'Open interest',
    };
    return translations[key] || key;
  },
}));

describe('PerpsMarketSortDropdowns', () => {
  const mockOnSortPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with default props', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns'),
      ).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          testID="custom-sort-dropdowns"
        />,
      );

      expect(screen.getByTestId('custom-sort-dropdowns')).toBeOnTheScreen();
    });

    it('renders sort field button', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
      ).toBeOnTheScreen();
    });
  });

  describe('Sort Field Display', () => {
    it('displays volume label when selectedOptionId is volume', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(screen.getByText('Volume')).toBeOnTheScreen();
      expect(
        screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
      ).toBeOnTheScreen();
    });

    it('displays price change label when selectedOptionId is priceChange', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="priceChange"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(screen.getByText('Price change')).toBeOnTheScreen();
    });

    it('displays funding rate label when selectedOptionId is fundingRate', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="fundingRate"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(screen.getByText('Funding rate')).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls onSortPress when sort field button is pressed', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      const sortButton = screen.getByTestId(
        'perps-market-sort-dropdowns-sort-field',
      );
      fireEvent.press(sortButton);

      expect(mockOnSortPress).toHaveBeenCalledTimes(1);
    });

    it('handles multiple rapid presses on sort field button', () => {
      render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      const sortButton = screen.getByTestId(
        'perps-market-sort-dropdowns-sort-field',
      );
      fireEvent.press(sortButton);
      fireEvent.press(sortButton);
      fireEvent.press(sortButton);

      expect(mockOnSortPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Props Updates', () => {
    it('updates selectedOptionId and callback correctly', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(screen.getByText('Volume')).toBeOnTheScreen();

      const newOnSortPress = jest.fn();

      rerender(
        <PerpsMarketSortDropdowns
          selectedOptionId="priceChange"
          onSortPress={newOnSortPress}
        />,
      );

      expect(screen.getByText('Price change')).toBeOnTheScreen();

      const sortButton = screen.getByTestId(
        'perps-market-sort-dropdowns-sort-field',
      );
      fireEvent.press(sortButton);

      expect(newOnSortPress).toHaveBeenCalledTimes(1);
      expect(mockOnSortPress).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles all sort option values', () => {
      const sortOptions: SortOptionId[] = [
        'volume',
        'priceChange',
        'fundingRate',
      ];

      sortOptions.forEach((optionId) => {
        const { unmount } = render(
          <PerpsMarketSortDropdowns
            selectedOptionId={optionId}
            onSortPress={mockOnSortPress}
          />,
        );

        expect(
          screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
        ).toBeOnTheScreen();

        unmount();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { root, rerender, unmount } = render(
        <PerpsMarketSortDropdowns
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(root).toBeTruthy();

      rerender(
        <PerpsMarketSortDropdowns
          selectedOptionId="priceChange"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(root).toBeTruthy();

      expect(() => unmount()).not.toThrow();
    });
  });
});
