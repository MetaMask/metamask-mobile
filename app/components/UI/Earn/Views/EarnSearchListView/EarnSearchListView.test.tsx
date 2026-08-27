import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import type { EarnSearchItem } from '../../../../Views/TrendingView/feeds/earn/earnSearchTypes';
import { useEarnSearchFeed } from '../../../../Views/TrendingView/feeds/earn/useEarnSearchFeed';
import EarnSearchListView from './EarnSearchListView';

const mockGoBack = jest.fn();
const mockUseEarnSearchFeed = jest.mocked(useEarnSearchFeed);

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: jest.fn(() => ({
    navigateToMoneyHome: jest.fn(),
  })),
}));

jest.mock(
  '../../../../Views/TrendingView/feeds/earn/useEarnSearchFeed',
  () => ({
    useEarnSearchFeed: jest.fn(),
  }),
);

jest.mock(
  '../../../../Views/TrendingView/feeds/earn/EarnMoneyAccountRow',
  () => ({
    __esModule: true,
    default: (props: {
      onPress: (item: EarnSearchItem) => void;
      item: EarnSearchItem;
    }) => {
      const ReactActual = jest.requireActual<typeof import('react')>('react');
      const { Pressable: MockPressable, Text: MockText } =
        jest.requireActual<typeof import('react-native')>('react-native');

      return ReactActual.createElement(
        MockPressable,
        {
          testID: 'earn-search-list-money-row',
          onPress: () => props.onPress(props.item),
        },
        ReactActual.createElement(MockText, null, 'Money account'),
      );
    },
  }),
);

jest.mock(
  '../../../../Views/TrendingView/feeds/earn/EarnSearchAssetRow',
  () => ({
    __esModule: true,
    default: (props: {
      onPress: (item: EarnSearchItem) => void;
      item: EarnSearchItem;
    }) => {
      const ReactActual = jest.requireActual<typeof import('react')>('react');
      const { Pressable: MockPressable, Text: MockText } =
        jest.requireActual<typeof import('react-native')>('react-native');

      return ReactActual.createElement(
        MockPressable,
        {
          testID: `earn-search-list-asset-row-${props.item.id}`,
          onPress: () => props.onPress(props.item),
        },
        ReactActual.createElement(MockText, null, props.item.id),
      );
    },
  }),
);

jest.mock('@shopify/flash-list', () => ({
  FlashList: (props: {
    data: EarnSearchItem[];
    renderItem: (info: {
      item: EarnSearchItem;
      index: number;
    }) => React.ReactNode;
    keyExtractor: (item: EarnSearchItem, index: number) => string;
    testID?: string;
  }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { View: MockView } =
      jest.requireActual<typeof import('react-native')>('react-native');

    return ReactActual.createElement(
      MockView,
      { testID: props.testID },
      props.data.map((item, index) =>
        ReactActual.createElement(
          ReactActual.Fragment,
          { key: props.keyExtractor(item, index) },
          props.renderItem({ item, index }),
        ),
      ),
    );
  },
}));

const moneyItem = {
  kind: 'money-account',
  id: 'money-account',
  isBalanceLoading: false,
  rateStatus: 'ready',
} as EarnSearchItem;

const assetItem = {
  kind: 'asset',
  id: 'eip155:1/erc20:usdc',
  asset: {},
} as unknown as EarnSearchItem;

describe('EarnSearchListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigation).mockReturnValue({
      goBack: mockGoBack,
    } as ReturnType<typeof useNavigation>);
    mockUseEarnSearchFeed.mockReturnValue({
      data: [moneyItem, assetItem],
      isLoading: false,
    });
  });

  it('renders Money and every matching Earn asset', () => {
    render(<EarnSearchListView />);

    expect(screen.getByTestId('earn-search-list-money-row')).toBeOnTheScreen();
    expect(
      screen.getByTestId('earn-search-list-asset-row-eip155:1/erc20:usdc'),
    ).toBeOnTheScreen();
  });

  it('passes local search text to the shared Earn feed', () => {
    render(<EarnSearchListView />);

    fireEvent.changeText(screen.getByTestId('earn-search-list-search'), 'usdc');

    expect(mockUseEarnSearchFeed).toHaveBeenLastCalledWith({ query: 'usdc' });
  });

  it('renders loading state without rows', () => {
    mockUseEarnSearchFeed.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<EarnSearchListView />);

    expect(screen.getByTestId('earn-search-list-loading')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('earn-search-list-money-row'),
    ).not.toBeOnTheScreen();
  });

  it('renders the existing empty state when no assets match', () => {
    mockUseEarnSearchFeed.mockReturnValue({ data: [], isLoading: false });

    render(<EarnSearchListView />);

    expect(screen.getByTestId('earn-search-list-empty')).toBeOnTheScreen();
  });
});
