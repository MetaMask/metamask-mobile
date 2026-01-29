import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketCategoryBadges from './PerpsMarketCategoryBadges';

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.home.tabs.crypto': 'Crypto',
      'perps.home.tabs.stocks': 'Stocks',
      'perps.home.tabs.commodities': 'Commodities',
      'perps.home.tabs.forex': 'Forex',
    };
    return translations[key] || key;
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
      expect(onCategorySelect).toHaveBeenCalledWith('stocks');
    });

    it('filters badges based on availableCategories', () => {
      const { getByText, queryByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          availableCategories={['crypto', 'stocks']}
        />,
      );

      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(queryByText('Commodities')).toBeNull();
      expect(queryByText('Forex')).toBeNull();
    });
  });

  describe('Selected state (category selected)', () => {
    it('shows only selected badge with dismiss icon when category is selected', () => {
      const { getByText, queryByText, getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
        />,
      );

      expect(getByText('Crypto')).toBeTruthy();
      expect(getByTestId('category-badges-crypto-dismiss')).toBeTruthy();
      expect(queryByText('Stocks')).toBeNull();
      expect(queryByText('Commodities')).toBeNull();
      expect(queryByText('Forex')).toBeNull();
    });

    it('calls onCategorySelect with "all" when dismiss is pressed', () => {
      const onCategorySelect = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
          onCategorySelect={onCategorySelect}
        />,
      );

      // Press the badge (which triggers dismiss when showDismiss is true)
      fireEvent.press(getByTestId('category-badges-crypto'));
      expect(onCategorySelect).toHaveBeenCalledWith('all');
    });

    it('renders selected badge for each category type', () => {
      const categories = ['crypto', 'stocks', 'commodities', 'forex'] as const;
      const labels = ['Crypto', 'Stocks', 'Commodities', 'Forex'];

      categories.forEach((category, index) => {
        const { getByText } = render(
          <PerpsMarketCategoryBadges
            {...defaultProps}
            selectedCategory={category}
          />,
        );

        expect(getByText(labels[index])).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('falls back to "all" view when selected category is not in availableCategories', () => {
      const onCategorySelect = jest.fn();
      const { getByText, queryByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="forex"
          availableCategories={['crypto', 'stocks']}
          onCategorySelect={onCategorySelect}
        />,
      );

      // Should show available categories (fallback to "all" view)
      // No auto-reset - user must explicitly dismiss via badge click
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      // Forex is not in availableCategories, so it shouldn't show
      expect(queryByText('Forex')).toBeNull();
      // No auto-reset - filter is only reset when user clicks dismiss on a selected badge
      expect(onCategorySelect).not.toHaveBeenCalled();
    });

    it('shows all default categories when availableCategories is empty', () => {
      const { getByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          availableCategories={[]}
        />,
      );

      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(getByText('Commodities')).toBeTruthy();
      expect(getByText('Forex')).toBeTruthy();
    });

    it('has correct testIDs for all badges', () => {
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges {...defaultProps} testID="badges" />,
      );

      expect(getByTestId('badges-crypto')).toBeTruthy();
      expect(getByTestId('badges-stocks')).toBeTruthy();
      expect(getByTestId('badges-commodities')).toBeTruthy();
      expect(getByTestId('badges-forex')).toBeTruthy();
    });
  });
});
