import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketFiltersBar from './PerpsMarketFiltersBar';
import { type MarketTypeFilter } from '@metamask/perps-controller';

jest.mock('../../../../components/PerpsMarketSortDropdowns', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      selectedOptionId,
      onSortPress,
      testID,
    }: {
      selectedOptionId: string;
      onSortPress: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onSortPress}>
        <Text>{selectedOptionId}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../../components/PerpsMarketCategoryBadges', () => {
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      selectedCategory,
      onCategorySelect,
      testID,
    }: {
      selectedCategory: MarketTypeFilter;
      onCategorySelect: (category: MarketTypeFilter) => void;
      testID?: string;
    }) => (
      <View testID={testID}>
        <Text testID={`${testID}-selected`}>{selectedCategory}</Text>
        {['crypto', 'stock', 'commodity', 'forex'].map((cat: string) => (
          <TouchableOpacity
            key={cat}
            testID={`${testID}-${cat}`}
            onPress={() => onCategorySelect(cat as MarketTypeFilter)}
          >
            <Text>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

jest.mock(
  '../../../../../../../component-library/components/Icons/Icon',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ name, testID }: { name: string; testID?: string }) => (
        <Text testID={testID}>{name}</Text>
      ),
      IconName: {
        Star: 'Star',
        StarFilled: 'StarFilled',
      },
      IconSize: { Sm: 'sm' },
    };
  },
);

jest.mock(
  '../../../../../../../component-library/components/Texts/Text',
  () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      }) => <RNText testID={testID}>{children}</RNText>,
      TextVariant: { BodyMD: 'BodyMD', BodySM: 'BodySM' },
      TextColor: { Alternative: 'Alternative', Default: 'Default' },
    };
  },
);

describe('PerpsMarketFiltersBar', () => {
  const mockOnSortPress = jest.fn();
  const mockOnCategorySelect = jest.fn();

  const defaultProps = {
    selectedOptionId: 'volume' as const,
    onSortPress: mockOnSortPress,
    marketTypeFilter: 'all' as MarketTypeFilter,
    onCategorySelect: mockOnCategorySelect,
    marketCount: 42,
    testID: 'filters-bar',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<PerpsMarketFiltersBar {...defaultProps} />);

      expect(toJSON()).toBeTruthy();
    });

    it('renders category badges component', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} />,
      );

      expect(getByTestId('filters-bar-categories')).toBeTruthy();
    });

    it('renders sort dropdown', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} />,
      );

      expect(getByTestId('filters-bar-sort')).toBeTruthy();
    });

    it('renders both rows (categories and sort)', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} />,
      );

      expect(getByTestId('filters-bar-categories')).toBeTruthy();
      expect(getByTestId('filters-bar-sort')).toBeTruthy();
    });
  });

  describe('Category Badges', () => {
    it('passes correct selected category to badges', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} marketTypeFilter="crypto" />,
      );

      expect(getByTestId('filters-bar-categories-selected')).toHaveTextContent(
        'crypto',
      );
    });

    it('calls onCategorySelect when a category badge is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} />,
      );

      fireEvent.press(getByTestId('filters-bar-categories-crypto'));
      expect(mockOnCategorySelect).toHaveBeenCalledWith('crypto');

      fireEvent.press(getByTestId('filters-bar-categories-stock'));
      expect(mockOnCategorySelect).toHaveBeenCalledWith('stock');
    });
  });

  describe('Sort Dropdown', () => {
    it('calls onSortPress when sort dropdown is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} />,
      );

      fireEvent.press(getByTestId('filters-bar-sort'));
      expect(mockOnSortPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Market Count', () => {
    it('displays the market count string', () => {
      const { getByText } = render(
        <PerpsMarketFiltersBar {...defaultProps} marketCount={42} />,
      );

      expect(getByText('42 markets')).toBeTruthy();
    });

    it('updates displayed count when marketCount prop changes', () => {
      const { getByText, rerender } = render(
        <PerpsMarketFiltersBar {...defaultProps} marketCount={10} />,
      );

      expect(getByText('10 markets')).toBeTruthy();

      rerender(<PerpsMarketFiltersBar {...defaultProps} marketCount={3} />);
      expect(getByText('3 markets')).toBeTruthy();
    });

    it('displays zero markets correctly', () => {
      const { getByText } = render(
        <PerpsMarketFiltersBar {...defaultProps} marketCount={0} />,
      );

      expect(getByText('0 markets')).toBeTruthy();
    });

    it('displays singular market count when there is exactly one market', () => {
      const { getByText, queryByText } = render(
        <PerpsMarketFiltersBar {...defaultProps} marketCount={1} />,
      );

      expect(getByText('1 market')).toBeTruthy();
      expect(queryByText('1 markets')).toBeNull();
    });

    it('renders market count with the derived testID', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} testID="filters-bar" />,
      );

      expect(getByTestId('filters-bar-market-count')).toBeTruthy();
    });

    it('does not render market count when watchlist filter is active', () => {
      const { queryByTestId } = render(
        <PerpsMarketFiltersBar
          {...defaultProps}
          isWatchlistSelected
          onWatchlistToggle={jest.fn()}
        />,
      );

      // The entire sort row (including count) is hidden when watchlist is active
      expect(queryByTestId('filters-bar-market-count')).toBeNull();
      expect(queryByTestId('filters-bar-sort')).toBeNull();
    });
  });

  describe('Test IDs', () => {
    it('applies custom testID and derived testIDs', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} testID="custom-filters" />,
      );

      expect(getByTestId('custom-filters')).toBeTruthy();
      expect(getByTestId('custom-filters-categories')).toBeTruthy();
      expect(getByTestId('custom-filters-sort')).toBeTruthy();
      expect(getByTestId('custom-filters-market-count')).toBeTruthy();
    });

    it('handles missing testID gracefully', () => {
      const { toJSON } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          marketTypeFilter="all"
          onCategorySelect={mockOnCategorySelect}
          marketCount={0}
        />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Filter State Combinations', () => {
    it('renders with all filter selected', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar {...defaultProps} marketTypeFilter="all" />,
      );

      expect(getByTestId('filters-bar-categories-selected')).toHaveTextContent(
        'all',
      );
    });

    it('renders with specific category selected', () => {
      const categories: MarketTypeFilter[] = [
        'crypto',
        'stock',
        'commodity',
        'forex',
      ];

      categories.forEach((category) => {
        const { getByTestId } = render(
          <PerpsMarketFiltersBar
            {...defaultProps}
            marketTypeFilter={category}
          />,
        );

        expect(
          getByTestId('filters-bar-categories-selected'),
        ).toHaveTextContent(category);
      });
    });
  });
});
