import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ActivityScreen from './ActivityScreen';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import Routes from '../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((value) => ({ value })),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => <View testID={testID}>{children}</View>,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { Text, TextInput, TouchableOpacity, View } =
    jest.requireActual('react-native');

  return {
    Box: ({
      children,
      onLayout,
      testID,
    }: {
      children?: React.ReactNode;
      onLayout?: (event: object) => void;
      testID?: string;
    }) => (
      <View
        testID={testID}
        onLayout={() => onLayout?.({ nativeEvent: { layout: { height: 42 } } })}
      >
        {children}
      </View>
    ),
    HeaderStandardAnimated: ({
      onBack,
      testID,
      title,
    }: {
      onBack: () => void;
      testID?: string;
      title: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onBack}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Text: ({ children }: { children?: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
    TextFieldSearch: ({
      onChangeText,
      onPressClearButton,
      placeholder,
      testID,
      value,
    }: {
      onChangeText: (value: string) => void;
      onPressClearButton: () => void;
      placeholder: string;
      testID?: string;
      value: string;
    }) => (
      <View>
        <TextInput
          placeholder={placeholder}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
        />
        <TouchableOpacity testID="clear-search" onPress={onPressClearButton} />
      </View>
    ),
    TextVariant: { HeadingLg: 'HeadingLg' },
  };
});

jest.mock('../ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../ActivityList', () => {
  const { TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      header,
      onScroll,
    }: {
      header?: React.ReactNode;
      onScroll?: (event: object) => void;
    }) => (
      <View testID="mock-activity-list">
        {header}
        <TouchableOpacity
          testID="mock-list-scroll"
          onPress={() =>
            onScroll?.({ nativeEvent: { contentOffset: { y: 12 } } })
          }
        />
      </View>
    ),
  };
});

jest.mock('./components/ActivityTypeFilterSheet', () => ({
  __esModule: true,
  ACTIVITY_TYPE_FILTER_LABEL_KEY: {
    all: 'activity_view.type_filter.all',
    transactions: 'activity_view.type_filter.transactions',
    swaps: 'activity_view.type_filter.swaps',
    money: 'activity_view.type_filter.money',
    perps: 'activity_view.type_filter.perps',
    predictions: 'activity_view.type_filter.predictions',
    buy_sell: 'activity_view.type_filter.buy_sell',
    metamask_card: 'activity_view.type_filter.metamask_card',
  },
  default: ({
    onClose,
    onSelect,
  }: {
    onClose: () => void;
    onSelect: (filter: string) => void;
  }) => {
    const { TouchableOpacity, View } = jest.requireActual('react-native');
    return (
      <View testID="mock-type-sheet">
        <TouchableOpacity
          testID="select-money"
          onPress={() => onSelect('money')}
        />
        <TouchableOpacity testID="close-type-sheet" onPress={onClose} />
      </View>
    );
  },
}));

jest.mock('./components/AssetListControlBar', () => {
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      networkLabel,
      onNetworkPress,
      onTypePress,
      typeLabel,
    }: {
      networkLabel: string;
      onNetworkPress: () => void;
      onTypePress: () => void;
      typeLabel: string;
    }) => (
      <View>
        <Text>{networkLabel}</Text>
        <Text>{typeLabel}</Text>
        <TouchableOpacity
          testID="open-network-sheet"
          onPress={onNetworkPress}
        />
        <TouchableOpacity testID="open-type-sheet" onPress={onTypePress} />
      </View>
    ),
  };
});

jest.mock(
  '../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenNetworkBottomSheet',
  () => ({
    TrendingTokenNetworkBottomSheet: ({
      isVisible,
      onClose,
      onNetworkSelect,
    }: {
      isVisible: boolean;
      onClose: () => void;
      onNetworkSelect: (chainIds: string[] | null) => void;
    }) => {
      const { TouchableOpacity, View } = jest.requireActual('react-native');
      return isVisible ? (
        <View testID="mock-network-sheet">
          <TouchableOpacity
            testID="select-linea"
            onPress={() => onNetworkSelect(['eip155:59144'])}
          />
          <TouchableOpacity testID="close-network-sheet" onPress={onClose} />
        </View>
      ) : null;
    },
  }),
);

jest.mock('../../UI/Trending/utils/trendingNetworksList', () => ({
  TRENDING_NETWORKS_LIST: [{ caipChainId: 'eip155:59144', name: 'Linea' }],
}));

const mockCanGoBack = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

describe('ActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
      navigate: mockNavigate,
    });
  });

  it('renders the activity shell, header, search input, filters, and list', () => {
    render(<ActivityScreen />);

    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.SAFE_AREA_VIEW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.SEARCH_INPUT),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-activity-list')).toBeOnTheScreen();
  });

  it('handles back navigation fallback and stateful filter/search interactions', () => {
    mockCanGoBack.mockReturnValueOnce(true).mockReturnValueOnce(false);
    render(<ActivityScreen />);

    fireEvent.press(screen.getByTestId(ActivityScreenSelectorsIDs.HEADER));
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId(ActivityScreenSelectorsIDs.HEADER));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS);

    fireEvent.changeText(
      screen.getByTestId(ActivityScreenSelectorsIDs.SEARCH_INPUT),
      'swap',
    );
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.SEARCH_INPUT),
    ).toHaveProp('value', 'swap');
    fireEvent.press(screen.getByTestId('clear-search'));
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.SEARCH_INPUT),
    ).toHaveProp('value', '');

    fireEvent.press(screen.getByTestId('open-type-sheet'));
    expect(screen.getByTestId('mock-type-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('select-money'));
    fireEvent.press(screen.getByTestId('close-type-sheet'));
    expect(screen.queryByTestId('mock-type-sheet')).toBeNull();

    fireEvent.press(screen.getByTestId('open-network-sheet'));
    expect(screen.getByTestId('mock-network-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('select-linea'));
    expect(screen.getByText('Network: Linea')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('close-network-sheet'));
    expect(screen.queryByTestId('mock-network-sheet')).toBeNull();

    fireEvent.press(screen.getByTestId('mock-list-scroll'));
  });
});
