import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PredictMarketList from './PredictMarketList';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      wrapper: {},
      tabView: {},
      tabContent: {},
    },
  })),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingLG: 'HeadingLG',
      BodyMD: 'BodyMD',
      BodySM: 'BodySM',
    },
    TextColor: {
      Default: 'Default',
      Primary: 'Primary',
      Alternative: 'Alternative',
      Muted: 'Muted',
      Success: 'Success',
      Error: 'Error',
    },
  };
});

jest.mock('../../../../Base/TabBar', () => {
  const { View } = jest.requireActual('react-native');
  return function MockTabBar({ textStyle }: { textStyle: object }) {
    return <View accessibilityRole="none" accessible={false} testID="tab-bar" style={textStyle} />;
  };
});

jest.mock('../../components/MarketListContent', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockMarketListContent({ category }: { category: string }) {
    return (
      <View accessibilityRole="none" accessible={false} testID={`market-list-content-${category}`}>
        <Text testID={`category-${category}`}>{category} markets</Text>
      </View>
    );
  };
});

jest.mock('../../components/PredictBalance/PredictBalance', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPredictBalance() {
    return (
      <View accessibilityRole="none" accessible={false} testID="predict-balance">
        <Text>Balance: $100.00</Text>
      </View>
    );
  };
});

jest.mock('../../components/SearchBox', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return function MockSearchBox({
    isVisible,
    onCancel,
    onSearch,
  }: {
    isVisible: boolean;
    onCancel: () => void;
    onSearch: (query: string) => void;
  }) {
    return (
      <View accessibilityRole="none" accessible={false} testID="search-box">
        <Text>Search Box Visible: {String(isVisible)}</Text>
        <TouchableOpacity testID="search-cancel-button" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="search-input-button"
          onPress={() => onSearch('test query')}
        >
          <Text>Search</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({
    children,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    testID?: string;
    [key: string]: unknown;
  }) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View accessibilityRole="none" accessible={false} testID={testID} {...props}>
        {children}
      </View>
    );
  },
  BoxFlexDirection: {
    Row: 'row',
  },
  BoxAlignItems: {
    Center: 'center',
  },
  BoxJustifyContent: {
    Between: 'space-between',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => args.join(' ')),
  })),
}));

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockIcon({
      name,
      testID,
    }: {
      name: string;
      testID?: string;
    }) {
      return <View accessibilityRole="none" accessible={false} testID={testID || `icon-${name}`} />;
    },
    IconName: {
      Search: 'Search',
      AddSquare: 'AddSquare',
    },
    IconSize: {
      Lg: 'Lg',
      Md: 'Md',
    },
    IconColor: {
      Default: 'Default',
      Primary: 'Primary',
      Alternative: 'Alternative',
      Muted: 'Muted',
    },
  };
});

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockAvatar({
      variant,
      testID,
    }: {
      variant: string;
      testID?: string;
    }) {
      return <View accessibilityRole="none" accessible={false} testID={testID || `avatar-${variant}`} />;
    },
    AvatarVariant: {
      Icon: 'Icon',
    },
    AvatarSize: {
      Md: 'Md',
      Sm: 'Sm',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockButton({
      onPress,
      children,
      label,
      testID,
    }: {
      onPress?: () => void;
      children?: React.ReactNode;
      label?: string;
      testID?: string;
    }) {
      return (
        <TouchableOpacity onPress={onPress} testID={testID || 'button'}>
          <Text>{label || children}</Text>
        </TouchableOpacity>
      );
    },
    ButtonVariants: {
      Link: 'Link',
      Primary: 'Primary',
      Secondary: 'Secondary',
    },
    ButtonSize: {
      Md: 'Md',
      Sm: 'Sm',
      Lg: 'Lg',
    },
    ButtonWidthTypes: {
      Auto: 'Auto',
      Full: 'Full',
    },
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

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
  formatVolume: jest.fn((value: number) => value.toLocaleString()),
}));

jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockScrollableTabView({
      children,
      renderTabBar,
      style,
    }: {
      children?: React.ReactNode;
      renderTabBar?: false | (() => React.ReactNode);
      style?: object;
    }) {
      return (
        <View accessibilityRole="none" accessible={false} testID="scrollable-tab-view" style={style}>
          {renderTabBar && typeof renderTabBar === 'function' && renderTabBar()}
          {children}
        </View>
      );
    },
  };
});

jest.mock('../../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(),
}));

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

jest.mock('../../../../../../e2e/selectors/Predict/Predict.selectors', () => ({
  PredictMarketListSelectorsIDs: {
    CONTAINER: 'predict-market-list-container',
    TRENDING_TAB: 'predict-market-list-trending-tab',
    NEW_TAB: 'predict-market-list-new-tab',
    SPORTS_TAB: 'predict-market-list-sports-tab',
    CRYPTO_TAB: 'predict-market-list-crypto-tab',
    POLITICS_TAB: 'predict-market-list-politics-tab',
  },
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: {
        default: '#ffffff',
      },
      text: {
        default: '#121314',
      },
    },
  })),
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

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as NavigationProp<ParamListBase>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the scrollable tab view when search is not visible', () => {
      render(<PredictMarketList isSearchVisible={false} searchQuery="" />);

      expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
    });

    it('renders the tab bar when search is not visible', () => {
      render(<PredictMarketList isSearchVisible={false} searchQuery="" />);

      expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
    });
  });

  describe('Tab Content', () => {
    it('renders all market list content components for each category', () => {
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

    it('displays correct category labels', () => {
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

  describe('Component Structure', () => {
    it('renders with correct component hierarchy when search is not visible', () => {
      render(<PredictMarketList isSearchVisible={false} searchQuery="" />);

      expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
    });

    it('renders all required market categories', () => {
      render(<PredictMarketList isSearchVisible={false} searchQuery="" />);

      const categories = ['trending', 'new', 'sports', 'crypto', 'politics'];
      categories.forEach((category) => {
        expect(
          screen.getByTestId(`market-list-content-${category}`),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('Search Functionality', () => {
    it('hides main tab view when search is visible without query', () => {
      const { queryByTestId } = render(
        <PredictMarketList isSearchVisible searchQuery="" />,
      );

      // Main tab content should not be visible when search is active
      expect(queryByTestId('scrollable-tab-view')).not.toBeOnTheScreen();
    });

    it('shows search results when search query is provided', () => {
      render(<PredictMarketList isSearchVisible searchQuery="test" />);

      // Search results should be displayed
      expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
      expect(
        screen.getByTestId('market-list-content-trending'),
      ).toBeOnTheScreen();
    });

    it('shows main tab view when search is not visible', () => {
      render(<PredictMarketList isSearchVisible={false} searchQuery="" />);

      // Main tab content should be visible
      expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
    });

    it('hides tab bar when search is active with query', () => {
      const { queryByTestId } = render(
        <PredictMarketList isSearchVisible searchQuery="test" />,
      );

      // Tab bar should not be visible during search
      expect(queryByTestId('tab-bar')).not.toBeOnTheScreen();
    });
  });
});
