import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PredictMarketList from './PredictMarketList';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../components/MarketListContent', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockMarketListContent({ category }: { category: string }) {
    return (
      <View testID={`market-list-content-${category}`}>
        <Text testID={`category-${category}`}>{category} markets</Text>
      </View>
    );
  };
});

jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: jest.fn(() => ({
    balance: 100,
    hasNoBalance: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadBalance: jest.fn(),
  })),
}));

let mockOnChangeTab:
  | ((changeInfo: { i: number; ref: unknown }) => void)
  | undefined;

jest.mock('../../../../../component-library/components-temp/Tabs', () => {
  const { View } = jest.requireActual('react-native');

  return {
    TabsList: function MockTabsList({
      children,
      onChangeTab,
      testID,
    }: {
      children: React.ReactNode;
      onChangeTab?: (changeInfo: { i: number; ref: unknown }) => void;
      testID?: string;
    }) {
      mockOnChangeTab = onChangeTab;
      return <View testID={testID}>{children}</View>;
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.category.trending': 'Trending',
      'predict.category.new': 'New',
      'predict.category.sports': 'Sports',
      'predict.category.crypto': 'Crypto',
      'predict.category.politics': 'Politics',
    };
    return translations[key] || key;
  }),
}));

describe('PredictMarketList', () => {
  const mockNavigation = {
    canGoBack: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    navigate: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    getState: jest.fn(),
    getId: jest.fn(),
    getParent: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
  };

  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  const createMockSharedValue = (initialValue: number) => ({
    value: initialValue,
    get: jest.fn(() => initialValue),
    set: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    modify: jest.fn(),
  });

  const createMockScrollCoordinator = (overrides = {}) => ({
    balanceCardOffset: createMockSharedValue(0),
    balanceCardHeight: createMockSharedValue(0),
    setBalanceCardHeight: jest.fn(),
    setCurrentCategory: jest.fn(),
    getTabScrollPosition: jest.fn(() => 0),
    setTabScrollPosition: jest.fn(),
    getScrollHandler: jest.fn(),
    isBalanceCardHidden: jest.fn(() => false),
    updateBalanceCardHiddenState: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnChangeTab = undefined;
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as NavigationProp<ParamListBase>,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('default view (no search)', () => {
    it('displays tab view with all market categories', () => {
      render(<PredictMarketList isSearchVisible={false} searchQuery="" />);

      expect(
        screen.getByTestId('market-list-content-trending'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('market-list-content-new')).toBeOnTheScreen();
      expect(
        screen.getByTestId('market-list-content-sports'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('market-list-content-crypto'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('market-list-content-politics'),
      ).toBeOnTheScreen();
    });

    it('displays correct category labels for all tabs', () => {
      render(<PredictMarketList isSearchVisible={false} searchQuery="" />);

      expect(screen.getByTestId('category-trending')).toHaveTextContent(
        'trending markets',
      );
      expect(screen.getByTestId('category-new')).toHaveTextContent(
        'new markets',
      );
      expect(screen.getByTestId('category-sports')).toHaveTextContent(
        'sports markets',
      );
      expect(screen.getByTestId('category-crypto')).toHaveTextContent(
        'crypto markets',
      );
      expect(screen.getByTestId('category-politics')).toHaveTextContent(
        'politics markets',
      );
    });
  });

  describe('search mode', () => {
    it('hides tab view when search is active without query', () => {
      render(<PredictMarketList isSearchVisible searchQuery="" />);

      expect(
        screen.queryByTestId('market-list-content-trending'),
      ).not.toBeOnTheScreen();
    });

    it('displays search results when query is provided', () => {
      render(<PredictMarketList isSearchVisible searchQuery="test" />);

      expect(
        screen.getByTestId('market-list-content-trending'),
      ).toBeOnTheScreen();
    });
  });

  describe('callbacks', () => {
    it('calls onTabChange when tab changes', () => {
      const mockOnTabChangeCallback = jest.fn();

      render(
        <PredictMarketList
          isSearchVisible={false}
          searchQuery=""
          onTabChange={mockOnTabChangeCallback}
        />,
      );

      mockOnChangeTab?.({ i: 2, ref: null });

      expect(mockOnTabChangeCallback).toHaveBeenCalledWith('sports');
    });

    it('updates scrollCoordinator when tab changes', () => {
      const mockSetCurrentCategory = jest.fn();
      const mockScrollCoordinator = createMockScrollCoordinator({
        setCurrentCategory: mockSetCurrentCategory,
      });

      render(
        <PredictMarketList
          isSearchVisible={false}
          searchQuery=""
          scrollCoordinator={mockScrollCoordinator}
        />,
      );

      mockOnChangeTab?.({ i: 1, ref: null });

      expect(mockSetCurrentCategory).toHaveBeenCalledWith('new');
    });

    it('handles tab change with both scrollCoordinator and onTabChange', () => {
      const mockOnTabChangeCallback = jest.fn();
      const mockSetCurrentCategory = jest.fn();
      const mockScrollCoordinator = createMockScrollCoordinator({
        setCurrentCategory: mockSetCurrentCategory,
      });

      render(
        <PredictMarketList
          isSearchVisible={false}
          searchQuery=""
          scrollCoordinator={mockScrollCoordinator}
          onTabChange={mockOnTabChangeCallback}
        />,
      );

      mockOnChangeTab?.({ i: 4, ref: null });

      expect(mockSetCurrentCategory).toHaveBeenCalledWith('politics');
      expect(mockOnTabChangeCallback).toHaveBeenCalledWith('politics');
    });

    it('does not call callbacks when tab index is out of bounds', () => {
      const mockOnTabChangeCallback = jest.fn();
      const mockSetCurrentCategory = jest.fn();
      const mockScrollCoordinator = createMockScrollCoordinator({
        setCurrentCategory: mockSetCurrentCategory,
      });

      render(
        <PredictMarketList
          isSearchVisible={false}
          searchQuery=""
          scrollCoordinator={mockScrollCoordinator}
          onTabChange={mockOnTabChangeCallback}
        />,
      );

      mockOnChangeTab?.({ i: 10, ref: null });

      expect(mockSetCurrentCategory).not.toHaveBeenCalled();
      expect(mockOnTabChangeCallback).not.toHaveBeenCalled();
    });
  });

  describe('with scrollCoordinator', () => {
    it('renders with scrollCoordinator prop', () => {
      const mockScrollCoordinator = createMockScrollCoordinator();

      render(
        <PredictMarketList
          isSearchVisible={false}
          searchQuery=""
          scrollCoordinator={mockScrollCoordinator}
        />,
      );

      expect(
        screen.getByTestId('market-list-content-trending'),
      ).toBeOnTheScreen();
    });
  });
});
