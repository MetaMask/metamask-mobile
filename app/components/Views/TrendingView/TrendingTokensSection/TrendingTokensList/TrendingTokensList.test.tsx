import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TrendingTokensList from './TrendingTokensList';
import type { TrendingAsset } from '@metamask/assets-controllers';

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      testID,
    }: {
      data: TrendingAsset[];
      renderItem: ({ item }: { item: TrendingAsset }) => React.ReactElement;
      keyExtractor: (item: TrendingAsset) => string;
      testID: string;
    }) => (
      <View accessibilityRole="none" accessible={false} testID={testID}>
        {data.map((item: TrendingAsset) => {
          const key = keyExtractor(item);
          return (
            <View accessibilityRole="none" accessible={false} key={key} testID={`trending-token-item-${key}`}>
              {renderItem({ item })}
            </View>
          );
        })}
      </View>
    ),
  };
});

// Mock TrendingTokenRowItem
jest.mock('./TrendingTokenRowItem/TrendingTokenRowItem', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      token,
      onPress,
    }: {
      token: TrendingAsset;
      onPress: () => void;
    }) => (
      <TouchableOpacity
        testID={`trending-token-row-item-${token.assetId}`}
        onPress={onPress}
      >
        <Text>{token.name}</Text>
      </TouchableOpacity>
    ),
  };
});

const createMockToken = (
  overrides: Partial<TrendingAsset> = {},
): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  price: '1.00',
  aggregatedUsdVolume: 974248822.2,
  marketCap: 75641301011.76,
  ...overrides,
});

describe('TrendingTokensList', () => {
  const mockOnTokenPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully with empty array', () => {
    const { getByTestId } = render(
      <TrendingTokensList
        trendingTokens={[]}
        onTokenPress={mockOnTokenPress}
      />,
    );

    expect(getByTestId('trending-tokens-list')).toBeTruthy();
  });

  it('renders multiple tokens', () => {
    const tokens = [
      createMockToken({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
      }),
      createMockToken({
        assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
        name: 'Tether',
        symbol: 'USDT',
      }),
      createMockToken({
        assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        name: 'Dai Stablecoin',
        symbol: 'DAI',
      }),
    ];

    const { getByTestId, getAllByTestId } = render(
      <TrendingTokensList
        trendingTokens={tokens}
        onTokenPress={mockOnTokenPress}
      />,
    );

    expect(getByTestId('trending-tokens-list')).toBeTruthy();
    expect(getAllByTestId(/trending-token-row-item-/)).toHaveLength(3);
  });

  it('calls onTokenPress when a token is pressed', () => {
    const tokens = [
      createMockToken({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
      }),
    ];

    const { getByTestId } = render(
      <TrendingTokensList
        trendingTokens={tokens}
        onTokenPress={mockOnTokenPress}
      />,
    );

    const tokenItem = getByTestId(
      'trending-token-row-item-eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    );

    fireEvent.press(tokenItem);

    expect(mockOnTokenPress).toHaveBeenCalledTimes(1);
    expect(mockOnTokenPress).toHaveBeenCalledWith(tokens[0]);
  });

  it('calls onTokenPress with correct token for each item', () => {
    const tokens = [
      createMockToken({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
      }),
      createMockToken({
        assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
        name: 'Tether',
        symbol: 'USDT',
      }),
    ];

    const { getByTestId } = render(
      <TrendingTokensList
        trendingTokens={tokens}
        onTokenPress={mockOnTokenPress}
      />,
    );

    // Press first token
    const firstTokenItem = getByTestId(
      'trending-token-row-item-eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    );
    fireEvent.press(firstTokenItem);
    expect(mockOnTokenPress).toHaveBeenCalledWith(tokens[0]);

    // Press second token
    const secondTokenItem = getByTestId(
      'trending-token-row-item-eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
    );
    fireEvent.press(secondTokenItem);
    expect(mockOnTokenPress).toHaveBeenCalledWith(tokens[1]);

    expect(mockOnTokenPress).toHaveBeenCalledTimes(2);
  });
});
