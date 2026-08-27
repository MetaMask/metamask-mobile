import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  TrendingQuickBuySheetProvider,
  useTrendingQuickBuySheet,
} from './TrendingQuickBuySheetContext';

const mockTrendingQuickBuy = jest.fn();
jest.mock('../components/TrendingQuickBuy/TrendingQuickBuy', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockTrendingQuickBuy(props);
    return null;
  },
}));

const makeToken = (overrides: Partial<TrendingAsset> = {}): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  price: '1.00',
  marketCap: 75_000_000_000,
  aggregatedUsdVolume: 900_000_000,
  ...overrides,
});

const StatusReader: React.FC = () => {
  const { isQuickBuyOpen } = useTrendingQuickBuySheet();
  return (
    <Text testID="quick-buy-open-status">
      {isQuickBuyOpen ? 'open' : 'closed'}
    </Text>
  );
};

const OpenButton: React.FC<{
  token: TrendingAsset;
  source?: 'explore_crypto' | 'explore_rwas';
}> = ({ token, source }) => {
  const { openQuickBuy } = useTrendingQuickBuySheet();
  return (
    <Pressable
      testID="open-quick-buy"
      onPress={() => openQuickBuy(token, source)}
    />
  );
};

const CloseButton: React.FC = () => {
  const { closeQuickBuy } = useTrendingQuickBuySheet();
  return <Pressable testID="close-quick-buy" onPress={closeQuickBuy} />;
};

describe('TrendingQuickBuySheetContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports closed when no token is open', () => {
    render(
      <TrendingQuickBuySheetProvider>
        <StatusReader />
      </TrendingQuickBuySheetProvider>,
    );

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'closed',
    );
    expect(mockTrendingQuickBuy).toHaveBeenCalledWith(
      expect.objectContaining({ token: null }),
    );
  });

  it('opens Quick Buy with the given token and source', () => {
    const token = makeToken();

    render(
      <TrendingQuickBuySheetProvider>
        <StatusReader />
        <OpenButton token={token} source="explore_crypto" />
      </TrendingQuickBuySheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-quick-buy'));

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'open',
    );
    expect(mockTrendingQuickBuy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        token,
        source: 'explore_crypto',
      }),
    );
  });

  it('closes Quick Buy and clears the hosted token', () => {
    const token = makeToken({ symbol: 'ETH' });

    render(
      <TrendingQuickBuySheetProvider>
        <StatusReader />
        <OpenButton token={token} source="explore_rwas" />
        <CloseButton />
      </TrendingQuickBuySheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-quick-buy'));
    fireEvent.press(screen.getByTestId('close-quick-buy'));

    expect(screen.getByTestId('quick-buy-open-status').props.children).toBe(
      'closed',
    );
    expect(mockTrendingQuickBuy).toHaveBeenLastCalledWith(
      expect.objectContaining({ token: null }),
    );
  });

  it('throws when useTrendingQuickBuySheet is used outside the provider', () => {
    const Outside: React.FC = () => {
      useTrendingQuickBuySheet();
      return null;
    };

    expect(() => render(<Outside />)).toThrow(
      'useTrendingQuickBuySheet must be used within TrendingQuickBuySheetProvider',
    );
  });
});
