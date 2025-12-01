import React from 'react';
import { render } from '@testing-library/react-native';
import TrendingTokensList from './TrendingTokensList';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { TimeOption } from '../TrendingTokensBottomSheet';

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
      <View testID={testID}>
        {data.map((item: TrendingAsset) => {
          const key = keyExtractor(item);
          return (
            <View key={key} testID={`trending-token-item-${key}`}>
              {renderItem({ item })}
            </View>
          );
        })}
      </View>
    ),
  };
});

// Mock TrendingTokenRowItem
jest.mock('../TrendingTokenRowItem/TrendingTokenRowItem', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ token }: { token: TrendingAsset }) => (
      <TouchableOpacity testID={`trending-token-row-item-${token.assetId}`}>
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully with empty array', () => {
    const { getByTestId } = render(
      <TrendingTokensList
        trendingTokens={[]}
        selectedTimeOption={TimeOption.TwentyFourHours}
      />,
    );

    expect(getByTestId('trending-tokens-list')).toBeOnTheScreen();
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
        selectedTimeOption={TimeOption.TwentyFourHours}
      />,
    );

    expect(getByTestId('trending-tokens-list')).toBeOnTheScreen();
    expect(getAllByTestId(/trending-token-row-item-/)).toHaveLength(3);
  });
});
