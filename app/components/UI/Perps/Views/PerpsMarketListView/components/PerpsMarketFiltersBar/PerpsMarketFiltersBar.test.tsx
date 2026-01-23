import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketFiltersBar from './PerpsMarketFiltersBar';
import type { MarketTypeFilter } from '../../../../controllers/types';

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

jest.mock('../../../../components/PerpsMarketTypeDropdown', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      selectedFilter,
      onPress,
      testID,
    }: {
      selectedFilter: MarketTypeFilter;
      onPress: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text testID={`${testID}-label`}>{selectedFilter}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../../components/PerpsStocksCommoditiesDropdown', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      selectedFilter,
      onPress,
      testID,
    }: {
      selectedFilter: string;
      onPress: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text testID={`${testID}-label`}>{selectedFilter}</Text>
      </TouchableOpacity>
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
      TextVariant: { BodyMD: 'BodyMD' },
    };
  },
);

describe('PerpsMarketFiltersBar', () => {
  const mockOnSortPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('renders sort dropdown with correct props', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          testID="filters-bar"
        />,
      );

      const sortDropdown = getByTestId('filters-bar-sort');
      expect(sortDropdown).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onSortPress when sort dropdown is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
          testID="filters-bar"
        />,
      );

      const sortDropdown = getByTestId('filters-bar-sort');
      fireEvent.press(sortDropdown);

      expect(mockOnSortPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test IDs', () => {
    it('applies custom testID and derived testIDs', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
          testID="custom-filters"
        />,
      );

      expect(getByTestId('custom-filters')).toBeTruthy();
      expect(getByTestId('custom-filters-sort')).toBeTruthy();
    });

    it('handles missing testID gracefully', () => {
      const { toJSON } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Market Type Dropdown', () => {
    const mockOnMarketTypePress = jest.fn();

    beforeEach(() => {
      mockOnMarketTypePress.mockClear();
    });

    it('does not render market type dropdown by default', () => {
      const { queryByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          testID="filters-bar"
        />,
      );

      expect(queryByTestId('filters-bar-market-type')).toBeNull();
    });

    it('renders market type dropdown when showMarketTypeDropdown is true', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showMarketTypeDropdown
          marketTypeFilter="all"
          onMarketTypePress={mockOnMarketTypePress}
          testID="filters-bar"
        />,
      );

      expect(getByTestId('filters-bar-market-type')).toBeTruthy();
    });

    it('does not render market type dropdown when showMarketTypeDropdown is true but onMarketTypePress is missing', () => {
      const { queryByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showMarketTypeDropdown
          marketTypeFilter="all"
          testID="filters-bar"
        />,
      );

      expect(queryByTestId('filters-bar-market-type')).toBeNull();
    });

    it('passes correct filter value to market type dropdown', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showMarketTypeDropdown
          marketTypeFilter="crypto"
          onMarketTypePress={mockOnMarketTypePress}
          testID="filters-bar"
        />,
      );

      expect(getByTestId('filters-bar-market-type-label')).toHaveTextContent(
        'crypto',
      );
    });

    it('calls onMarketTypePress when market type dropdown is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showMarketTypeDropdown
          marketTypeFilter="all"
          onMarketTypePress={mockOnMarketTypePress}
          testID="filters-bar"
        />,
      );

      const marketTypeDropdown = getByTestId('filters-bar-market-type');
      fireEvent.press(marketTypeDropdown);

      expect(mockOnMarketTypePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stocks/Commodities Dropdown', () => {
    const mockOnStocksCommoditiesPress = jest.fn();

    beforeEach(() => {
      mockOnStocksCommoditiesPress.mockClear();
    });

    it('does not render stocks/commodities dropdown by default', () => {
      const { queryByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          testID="filters-bar"
        />,
      );

      expect(queryByTestId('filters-bar-stocks-commodities')).toBeNull();
    });

    it('renders stocks/commodities dropdown when showStocksCommoditiesDropdown is true', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showStocksCommoditiesDropdown
          stocksCommoditiesFilter="all"
          onStocksCommoditiesPress={mockOnStocksCommoditiesPress}
          testID="filters-bar"
        />,
      );

      expect(getByTestId('filters-bar-stocks-commodities')).toBeTruthy();
    });

    it('does not render stocks/commodities dropdown when showStocksCommoditiesDropdown is true but onStocksCommoditiesPress is missing', () => {
      const { queryByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showStocksCommoditiesDropdown
          stocksCommoditiesFilter="all"
          testID="filters-bar"
        />,
      );

      expect(queryByTestId('filters-bar-stocks-commodities')).toBeNull();
    });

    it('passes correct filter value to stocks/commodities dropdown', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showStocksCommoditiesDropdown
          stocksCommoditiesFilter="equity"
          onStocksCommoditiesPress={mockOnStocksCommoditiesPress}
          testID="filters-bar"
        />,
      );

      expect(
        getByTestId('filters-bar-stocks-commodities-label'),
      ).toHaveTextContent('equity');
    });

    it('calls onStocksCommoditiesPress when stocks/commodities dropdown is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showStocksCommoditiesDropdown
          stocksCommoditiesFilter="all"
          onStocksCommoditiesPress={mockOnStocksCommoditiesPress}
          testID="filters-bar"
        />,
      );

      const stocksDropdown = getByTestId('filters-bar-stocks-commodities');
      fireEvent.press(stocksDropdown);

      expect(mockOnStocksCommoditiesPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Combined Dropdowns', () => {
    const mockOnMarketTypePress = jest.fn();
    const mockOnStocksCommoditiesPress = jest.fn();

    beforeEach(() => {
      mockOnMarketTypePress.mockClear();
      mockOnStocksCommoditiesPress.mockClear();
    });

    it('renders all dropdowns when all are enabled', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showMarketTypeDropdown
          marketTypeFilter="stocks_and_commodities"
          onMarketTypePress={mockOnMarketTypePress}
          showStocksCommoditiesDropdown
          stocksCommoditiesFilter="equity"
          onStocksCommoditiesPress={mockOnStocksCommoditiesPress}
          testID="filters-bar"
        />,
      );

      expect(getByTestId('filters-bar-market-type')).toBeTruthy();
      expect(getByTestId('filters-bar-sort')).toBeTruthy();
      expect(getByTestId('filters-bar-stocks-commodities')).toBeTruthy();
    });

    it('each dropdown calls its respective handler', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          showMarketTypeDropdown
          marketTypeFilter="all"
          onMarketTypePress={mockOnMarketTypePress}
          showStocksCommoditiesDropdown
          stocksCommoditiesFilter="all"
          onStocksCommoditiesPress={mockOnStocksCommoditiesPress}
          testID="filters-bar"
        />,
      );

      fireEvent.press(getByTestId('filters-bar-market-type'));
      expect(mockOnMarketTypePress).toHaveBeenCalledTimes(1);
      expect(mockOnSortPress).not.toHaveBeenCalled();
      expect(mockOnStocksCommoditiesPress).not.toHaveBeenCalled();

      fireEvent.press(getByTestId('filters-bar-sort'));
      expect(mockOnSortPress).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('filters-bar-stocks-commodities'));
      expect(mockOnStocksCommoditiesPress).toHaveBeenCalledTimes(1);
    });
  });
});
