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
    },
  };
});

jest.mock('../../../../Base/TabBar', () => {
  const { View } = jest.requireActual('react-native');
  return function MockTabBar({ textStyle }: { textStyle: object }) {
    return <View testID="tab-bar" style={textStyle} />;
  };
});

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
      <View testID={testID} {...props}>
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
      return <View testID={testID || `icon-${name}`} />;
    },
    IconName: {
      Search: 'Search',
    },
    IconSize: {
      Lg: 'Lg',
    },
  };
});

jest.mock('react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockScrollableTabView({
      children,
      renderTabBar,
      style,
    }: {
      children?: React.ReactNode;
      renderTabBar?: () => React.ReactNode;
      style?: object;
    }) {
      return (
        <View testID="scrollable-tab-view" style={style}>
          {renderTabBar?.()}
          {children}
        </View>
      );
    },
  };
});

jest.mock('../../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(),
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

  describe('Component Rendering', () => {
    it('renders the component with title and search icon', () => {
      render(<PredictMarketList />);

      expect(screen.getByText('Predictions')).toBeOnTheScreen();
      expect(screen.getByTestId('icon-Search')).toBeOnTheScreen();
    });

    it('renders the scrollable tab view', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
    });

    it('renders the tab bar', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
    });
  });

  describe('Tab Content', () => {
    it('renders all market list content components for each category', () => {
      render(<PredictMarketList />);

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
      render(<PredictMarketList />);

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
    it('renders with correct component hierarchy', () => {
      render(<PredictMarketList />);

      expect(screen.getByText('Predictions')).toBeOnTheScreen();
      expect(screen.getByTestId('icon-Search')).toBeOnTheScreen();
      expect(screen.getByTestId('scrollable-tab-view')).toBeOnTheScreen();
      expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
    });

    it('renders all required market categories', () => {
      render(<PredictMarketList />);

      const categories = ['trending', 'new', 'sports', 'crypto', 'politics'];
      categories.forEach((category) => {
        expect(
          screen.getByTestId(`market-list-content-${category}`),
        ).toBeOnTheScreen();
      });
    });
  });
});
