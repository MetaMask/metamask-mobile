import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import type { EarnSearchItem } from '../../../../Views/TrendingView/feeds/earn/earnSearchTypes';
import { useEarnSearchFeed } from '../../../../Views/TrendingView/feeds/earn/useEarnSearchFeed';
import { navigateToEarnItem } from '../../../../Views/TrendingView/feeds/earn/earnNavigation';
import EarnMarketListView from './EarnMarketListView';

const mockGoBack = jest.fn();
const mockUseEarnSearchFeed = jest.mocked(useEarnSearchFeed);
const mockNavigateToEarnItem = jest.mocked(navigateToEarnItem);

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

jest.mock('../../../../Views/TrendingView/feeds/earn/earnNavigation', () => ({
  navigateToEarnItem: jest.fn(),
}));

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
          testID: 'earn-market-list-money-row',
          onPress: () => props.onPress(props.item),
        },
        ReactActual.createElement(MockText, null, 'Money account'),
      );
    },
  }),
);

jest.mock('../../../../Views/TrendingView/feeds/earn/EarnAssetRow', () => ({
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
        testID: `earn-market-list-asset-row-${props.item.id}`,
        onPress: () => props.onPress(props.item),
      },
      ReactActual.createElement(MockText, null, props.item.id),
    );
  },
}));

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

describe('EarnMarketListView', () => {
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
    render(<EarnMarketListView />);

    expect(screen.getByTestId('earn-market-list-money-row')).toBeOnTheScreen();
    expect(
      screen.getByTestId('earn-market-list-asset-row-eip155:1/erc20:usdc'),
    ).toBeOnTheScreen();
  });

  it('passes local search text to the shared Earn feed', () => {
    render(<EarnMarketListView />);

    fireEvent.changeText(screen.getByTestId('earn-market-list-search'), 'usdc');

    expect(mockUseEarnSearchFeed).toHaveBeenLastCalledWith({ query: 'usdc' });
  });

  it('renders loading state without rows', () => {
    mockUseEarnSearchFeed.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<EarnMarketListView />);

    expect(screen.getByTestId('earn-market-list-loading')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('earn-market-list-money-row'),
    ).not.toBeOnTheScreen();
  });

  it('renders the existing empty state when no assets match', () => {
    mockUseEarnSearchFeed.mockReturnValue({ data: [], isLoading: false });

    render(<EarnMarketListView />);

    expect(screen.getByTestId('earn-market-list-empty')).toBeOnTheScreen();
  });

  it('delegates row presses to Earn navigation', () => {
    render(<EarnMarketListView />);

    fireEvent.press(screen.getByTestId('earn-market-list-money-row'));

    expect(mockNavigateToEarnItem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      moneyItem,
    );
  });
});
