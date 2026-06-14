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
}));

jest.mock('../../hooks/useHasNewMarkets', () => ({
  useHasNewMarkets: () => false,
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
    it('renders all category badges when selectedCategory is "all"', () => {
      const { getByText } = render(
        <PerpsMarketCategoryBadges {...defaultProps} />,
      );

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
  });

  describe('Selected state (category selected)', () => {
    it('shows all badges when a category is selected, without dismiss icons', () => {
      const { getByText, queryByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
        />,
      );

      // All badges should remain visible
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(getByText('Commodities')).toBeTruthy();
      expect(getByText('Forex')).toBeTruthy();

      expect(queryByTestId('category-badges-crypto-dismiss')).toBeNull();
      expect(queryByTestId('category-badges-stock-dismiss')).toBeNull();
      expect(queryByTestId('category-badges-commodity-dismiss')).toBeNull();
      expect(queryByTestId('category-badges-forex-dismiss')).toBeNull();
    });

    it('calls onCategorySelect with "all" when selected badge is tapped again (toggle off)', () => {
      const onCategorySelect = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
          onCategorySelect={onCategorySelect}
        />,
      );

      // Tapping the already-selected badge should deselect (back to 'all')
      fireEvent.press(getByTestId('category-badges-crypto'));
      expect(onCategorySelect).toHaveBeenCalledWith('all');
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

      // Tapping a different badge should select that category
      fireEvent.press(getByText('Stocks'));
      expect(onCategorySelect).toHaveBeenCalledWith('stock');
    });

    it('renders all badges for each selected category type', () => {
      const categories = ['crypto', 'stock', 'commodity', 'forex'] as const;
      const allLabels = ['Crypto', 'Stocks', 'Commodities', 'Forex'];

      categories.forEach((category) => {
        const { getByText } = render(
          <PerpsMarketCategoryBadges
            {...defaultProps}
            selectedCategory={category}
          />,
        );

        // All badges should be visible regardless of which is selected
        allLabels.forEach((label) => {
          expect(getByText(label)).toBeTruthy();
        });
      });
    });
  });

  describe('edge cases', () => {
    it('has correct testIDs for all badges', () => {
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges {...defaultProps} testID="badges" />,
      );

      expect(getByTestId('badges-crypto')).toBeOnTheScreen();
      expect(getByTestId('badges-stock')).toBeOnTheScreen();
      expect(getByTestId('badges-commodity')).toBeOnTheScreen();
      expect(getByTestId('badges-forex')).toBeOnTheScreen();
    });
  });
});
