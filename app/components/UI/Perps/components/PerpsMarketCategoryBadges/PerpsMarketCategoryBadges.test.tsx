import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketCategoryBadges from './PerpsMarketCategoryBadges';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.home.all': 'All',
      'perps.home.tabs.crypto': 'Crypto',
      'perps.home.tabs.stocks': 'Stocks',
      'perps.home.tabs.commodities': 'Commodities',
      'perps.home.tabs.forex': 'Forex',
      'perps.home.tabs.new': 'New',
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
    it('renders All segment first followed by category segments', () => {
      const { getByText } = render(
        <PerpsMarketCategoryBadges {...defaultProps} />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(getByText('Commodities')).toBeTruthy();
      expect(getByText('Forex')).toBeTruthy();
      expect(getByText('New')).toBeTruthy();
    });

    it('calls onCategorySelect with category when segment is pressed', () => {
      const onCategorySelect = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          onCategorySelect={onCategorySelect}
        />,
      );

      fireEvent.press(getByTestId('category-badges-crypto'));
      expect(onCategorySelect).toHaveBeenCalledWith('crypto');

      fireEvent.press(getByTestId('category-badges-stocks'));
      expect(onCategorySelect).toHaveBeenCalledWith('stocks');
    });

    it('calls onCategorySelect with all when All segment is pressed', () => {
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

    it('filters segments based on availableCategories', () => {
      const { getByText, queryByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          availableCategories={['crypto', 'stocks']}
        />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(queryByText('Commodities')).toBeNull();
      expect(queryByText('Forex')).toBeNull();
    });
  });

  describe('Selected state (category selected)', () => {
    it('shows all segments when a category is selected', () => {
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

    it('calls onCategorySelect with new category when unselected segment is tapped', () => {
      const onCategorySelect = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="crypto"
          onCategorySelect={onCategorySelect}
        />,
      );

      fireEvent.press(getByTestId('category-badges-stocks'));
      expect(onCategorySelect).toHaveBeenCalledWith('stocks');
    });

    it('renders all segments for each selected category type', () => {
      const categories = ['crypto', 'stocks', 'commodities', 'forex'] as const;
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

  describe('edge cases', () => {
    it('shows All and available categories when selected category is not available', () => {
      const onCategorySelect = jest.fn();
      const { getByText, queryByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          selectedCategory="forex"
          availableCategories={['crypto', 'stocks']}
          onCategorySelect={onCategorySelect}
        />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(queryByText('Forex')).toBeNull();
      expect(onCategorySelect).not.toHaveBeenCalled();
    });

    it('shows all default categories when availableCategories is empty', () => {
      const { getByText } = render(
        <PerpsMarketCategoryBadges
          {...defaultProps}
          availableCategories={[]}
        />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks')).toBeTruthy();
      expect(getByText('Commodities')).toBeTruthy();
      expect(getByText('Forex')).toBeTruthy();
    });

    it('has correct testIDs for all segments', () => {
      const { getByTestId } = render(
        <PerpsMarketCategoryBadges {...defaultProps} testID="badges" />,
      );

      expect(getByTestId('badges-all')).toBeTruthy();
      expect(getByTestId('badges-crypto')).toBeTruthy();
      expect(getByTestId('badges-stocks')).toBeTruthy();
      expect(getByTestId('badges-commodities')).toBeTruthy();
      expect(getByTestId('badges-forex')).toBeTruthy();
      expect(getByTestId('badges-new')).toBeTruthy();
    });
  });
});
