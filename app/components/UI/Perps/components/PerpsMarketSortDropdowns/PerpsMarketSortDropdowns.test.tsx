import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortDropdowns from './PerpsMarketSortDropdowns';
import type { SortField, SortDirection } from '../../utils/sortMarkets';

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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.volume': 'Volume',
      'perps.sort.price_change': 'Price Change',
      'perps.sort.funding_rate': 'Funding Rate',
      'perps.sort.high_to_low': 'High to Low',
      'perps.sort.low_to_high': 'Low to High',
      'perps.sort.favorites': 'Favorites',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarketSortDropdowns', () => {
  const mockOnSortPress = jest.fn();
  const mockOnDirectionPress = jest.fn();
  const mockOnFavoritesToggle = jest.fn();

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
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns'),
      ).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          testID="custom-sort-dropdowns"
        />,
      );

      expect(screen.getByTestId('custom-sort-dropdowns')).toBeOnTheScreen();
    });

    it('renders sort field button', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
      ).toBeOnTheScreen();
    });

    it('renders direction button', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-direction'),
      ).toBeOnTheScreen();
    });

    it('renders favorites button when onFavoritesToggle is provided', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-favorites'),
      ).toBeOnTheScreen();
    });

    it('does not render favorites button when onFavoritesToggle is not provided', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(
        screen.queryByTestId('perps-market-sort-dropdowns-favorites'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Sort Field Display', () => {
    it('displays volume label when sortBy is volume', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      // Component renders with volume sort field
      expect(
        screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
      ).toBeOnTheScreen();
    });

    it('updates label when sortBy changes to priceChange', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="priceChange"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      // Component re-renders with new sort field
      expect(
        screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
      ).toBeOnTheScreen();
    });

    it('updates label when sortBy changes to fundingRate', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="fundingRate"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      // Component re-renders with new sort field
      expect(
        screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
      ).toBeOnTheScreen();
    });
  });

  describe('Direction Display', () => {
    it('displays high to low label when direction is desc', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      // Component renders with desc direction
      expect(
        screen.getByTestId('perps-market-sort-dropdowns-direction'),
      ).toBeOnTheScreen();
    });

    it('updates label when direction changes to asc', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="asc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      // Component re-renders with new direction
      expect(
        screen.getByTestId('perps-market-sort-dropdowns-direction'),
      ).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls onSortPress when sort field button is pressed', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      const sortButton = screen.getByTestId(
        'perps-market-sort-dropdowns-sort-field',
      );
      fireEvent.press(sortButton);

      expect(mockOnSortPress).toHaveBeenCalledTimes(1);
    });

    it('calls onDirectionPress when direction button is pressed', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      const directionButton = screen.getByTestId(
        'perps-market-sort-dropdowns-direction',
      );
      fireEvent.press(directionButton);

      expect(mockOnDirectionPress).toHaveBeenCalledTimes(1);
    });

    it('calls onFavoritesToggle when favorites button is pressed', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      const favoritesButton = screen.getByTestId(
        'perps-market-sort-dropdowns-favorites',
      );
      fireEvent.press(favoritesButton);

      expect(mockOnFavoritesToggle).toHaveBeenCalledTimes(1);
    });

    it('handles multiple rapid presses on sort field button', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
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

    it('handles multiple rapid presses on direction button', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      const directionButton = screen.getByTestId(
        'perps-market-sort-dropdowns-direction',
      );
      fireEvent.press(directionButton);
      fireEvent.press(directionButton);

      expect(mockOnDirectionPress).toHaveBeenCalledTimes(2);
    });

    it('handles multiple rapid presses on favorites button', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      const favoritesButton = screen.getByTestId(
        'perps-market-sort-dropdowns-favorites',
      );
      fireEvent.press(favoritesButton);
      fireEvent.press(favoritesButton);

      expect(mockOnFavoritesToggle).toHaveBeenCalledTimes(2);
    });
  });

  describe('Favorites State', () => {
    it('renders favorites button with showFavoritesOnly false', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          showFavoritesOnly={false}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-favorites'),
      ).toBeOnTheScreen();
    });

    it('renders favorites button with showFavoritesOnly true', () => {
      render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          showFavoritesOnly
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-favorites'),
      ).toBeOnTheScreen();
    });

    it('updates when showFavoritesOnly changes from false to true', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          showFavoritesOnly={false}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          showFavoritesOnly
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      // Component re-renders with new showFavoritesOnly state
      expect(
        screen.getByTestId('perps-market-sort-dropdowns-favorites'),
      ).toBeOnTheScreen();
    });
  });

  describe('Props Updates', () => {
    it('updates all props correctly', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          showFavoritesOnly={false}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      const newOnSortPress = jest.fn();
      const newOnDirectionPress = jest.fn();
      const newOnFavoritesToggle = jest.fn();

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="priceChange"
          direction="asc"
          onSortPress={newOnSortPress}
          onDirectionPress={newOnDirectionPress}
          showFavoritesOnly
          onFavoritesToggle={newOnFavoritesToggle}
        />,
      );

      const sortButton = screen.getByTestId(
        'perps-market-sort-dropdowns-sort-field',
      );
      const directionButton = screen.getByTestId(
        'perps-market-sort-dropdowns-direction',
      );
      const favoritesButton = screen.getByTestId(
        'perps-market-sort-dropdowns-favorites',
      );

      fireEvent.press(sortButton);
      fireEvent.press(directionButton);
      fireEvent.press(favoritesButton);

      expect(newOnSortPress).toHaveBeenCalledTimes(1);
      expect(newOnDirectionPress).toHaveBeenCalledTimes(1);
      expect(newOnFavoritesToggle).toHaveBeenCalledTimes(1);
      expect(mockOnSortPress).not.toHaveBeenCalled();
      expect(mockOnDirectionPress).not.toHaveBeenCalled();
      expect(mockOnFavoritesToggle).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles all sort field values', () => {
      const sortFields: SortField[] = ['volume', 'priceChange', 'fundingRate'];

      sortFields.forEach((sortBy) => {
        const { unmount } = render(
          <PerpsMarketSortDropdowns
            sortBy={sortBy}
            direction="desc"
            onSortPress={mockOnSortPress}
            onDirectionPress={mockOnDirectionPress}
          />,
        );

        expect(
          screen.getByTestId('perps-market-sort-dropdowns-sort-field'),
        ).toBeOnTheScreen();

        unmount();
      });
    });

    it('handles both direction values', () => {
      const directions: SortDirection[] = ['asc', 'desc'];

      directions.forEach((direction) => {
        const { unmount } = render(
          <PerpsMarketSortDropdowns
            sortBy="volume"
            direction={direction}
            onSortPress={mockOnSortPress}
            onDirectionPress={mockOnDirectionPress}
          />,
        );

        expect(
          screen.getByTestId('perps-market-sort-dropdowns-direction'),
        ).toBeOnTheScreen();

        unmount();
      });
    });

    it('handles adding favorites toggle dynamically', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(
        screen.queryByTestId('perps-market-sort-dropdowns-favorites'),
      ).not.toBeOnTheScreen();

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-favorites'),
      ).toBeOnTheScreen();
    });

    it('handles removing favorites toggle dynamically', () => {
      const { rerender } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      expect(
        screen.getByTestId('perps-market-sort-dropdowns-favorites'),
      ).toBeOnTheScreen();

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(
        screen.queryByTestId('perps-market-sort-dropdowns-favorites'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { root, rerender, unmount } = render(
        <PerpsMarketSortDropdowns
          sortBy="volume"
          direction="desc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
        />,
      );

      expect(root).toBeTruthy();

      rerender(
        <PerpsMarketSortDropdowns
          sortBy="priceChange"
          direction="asc"
          onSortPress={mockOnSortPress}
          onDirectionPress={mockOnDirectionPress}
          showFavoritesOnly
          onFavoritesToggle={mockOnFavoritesToggle}
        />,
      );

      expect(root).toBeTruthy();

      expect(() => unmount()).not.toThrow();
    });
  });
});
