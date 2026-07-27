import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketCategoryBadges from './PerpsMarketCategoryBadges';
import type { PerpsCategory } from '../../hooks/usePerpsCategories';

const DEFAULT_CATEGORIES: PerpsCategory[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'stock', label: 'Stocks' },
  { id: 'commodity', label: 'Commodities' },
  { id: 'forex', label: 'Forex' },
];

jest.mock('../../hooks/usePerpsCategories', () => ({
  usePerpsCategories: () => DEFAULT_CATEGORIES,
  NEW_CATEGORY: { id: 'new', label: 'New' },
}));

jest.mock('../../hooks/useHasNewMarkets', () => ({
  useHasNewMarkets: () => false,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.home.tabs.all': 'All',
      'perps.home.tabs.new': 'New',
      'perps.watchlist.filter_badge_label': 'Watchlist',
    };
    return translations[key] ?? key;
  },
}));

describe('PerpsMarketCategoryBadges', () => {
  const defaultProps = {
    selectedCategory: 'all' as const,
    onCategorySelect: jest.fn(),
    testID: 'category-badges',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('All state (no category selected)', () => {
    it('renders All and all category badges when selectedCategory is "all"', () => {
      const { getByText } = render(
        <PerpsMarketCategoryBadges {...defaultProps} />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(getByText('Commodities')).toBeTruthy();
      expect(getByText('Forex')).toBeTruthy();
    });

    it('calls onCategorySelect with category when badge is pressed', () => {
      const onCategorySelect = jest.fn();
      const { getByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          onCategorySelect={onCategorySelect}
        />,
      );

      fireEvent.press(getByText('Crypto'));
      expect(onCategorySelect).toHaveBeenCalledWith('crypto');

      fireEvent.press(getByText('Stocks'));
      expect(onCategorySelect).toHaveBeenCalledWith('stock');
    });

    it('calls onCategorySelect with "all" when All badge is pressed', () => {
      const onCategorySelect = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
          onCategorySelect={onCategorySelect}
        />,
      );

      fireEvent.press(getByTestId('category-badges-all'));
      expect(onCategorySelect).toHaveBeenCalledWith('all');
    });
  });

  describe('Selected state (category selected)', () => {
    it('shows all badges when a category is selected', () => {
      const { getByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
        />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(getByText('Commodities')).toBeTruthy();
      expect(getByText('Forex')).toBeTruthy();
    });

    it('calls onCategorySelect with new category when unselected badge is tapped', () => {
      const onCategorySelect = jest.fn();
      const { getByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
          onCategorySelect={onCategorySelect}
        />,
      );

      fireEvent.press(getByText('Stocks'));
      expect(onCategorySelect).toHaveBeenCalledWith('stock');
    });

    it('renders all badges for each selected category type', () => {
      const categories = ['crypto', 'stock', 'commodity', 'forex'] as const;
      const allLabels = ['All', 'Crypto', 'Stocks', 'Commodities', 'Forex'];

      categories.forEach((category) => {
        const { getByText } = render(
          <PerpsMarketCategoryBadges
            {...defaultProps}
            selectedCategory={category}
          />,
        );

        allLabels.forEach((label) => {
          expect(getByText(label)).toBeTruthy();
        });
      });
    });
  });

  describe('watchlist filter', () => {
    it('renders watchlist badge inside the group when showWatchlistBadge is true', () => {
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          showWatchlistBadge
          onWatchlistToggle={jest.fn()}
        />,
      );

      expect(getByTestId('category-badges-watchlist')).toBeOnTheScreen();
    });

    it('calls onWatchlistToggle when watchlist badge is pressed', () => {
      const onWatchlistToggle = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          showWatchlistBadge
          onWatchlistToggle={onWatchlistToggle}
        />,
      );

      fireEvent.press(getByTestId('category-badges-watchlist'));
      expect(onWatchlistToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onCategorySelect with "all" and onWatchlistToggle when All is pressed while watchlist is active', () => {
      const onCategorySelect = jest.fn();
      const onWatchlistToggle = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          showWatchlistBadge
          isWatchlistSelected
          onCategorySelect={onCategorySelect}
          onWatchlistToggle={onWatchlistToggle}
        />,
      );

      fireEvent.press(getByTestId('category-badges-all'));
      expect(onCategorySelect).toHaveBeenCalledWith('all');
      expect(onWatchlistToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('has correct testIDs for all badges', () => {
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges {...defaultProps} testID="badges" />,
      );

      expect(getByTestId('badges-all')).toBeOnTheScreen();
      expect(getByTestId('badges-crypto')).toBeOnTheScreen();
      expect(getByTestId('badges-stock')).toBeOnTheScreen();
      expect(getByTestId('badges-commodity')).toBeOnTheScreen();
      expect(getByTestId('badges-forex')).toBeOnTheScreen();
    });
  });
});
