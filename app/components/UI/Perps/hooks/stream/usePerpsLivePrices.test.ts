import type {
  PerpsProviderType,
  PriceUpdate,
} from '@metamask/perps-controller';
import { act, renderHook } from '@testing-library/react-hooks';
import type { usePerpsStream } from '../../providers/PerpsStreamManager';
import { usePerpsLivePrices } from './usePerpsLivePrices';

type SubscribeToSymbolsParams = Parameters<
  ReturnType<typeof usePerpsStream>['prices']['subscribeToSymbols']
>[0];

const mockSubscribeToSymbols = jest.fn((_params: SubscribeToSymbolsParams) =>
  jest.fn(),
);
const mockStream = { prices: { subscribeToSymbols: mockSubscribeToSymbols } };

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => mockStream,
}));

const quote = (
  symbol: string,
  price: string,
  providerId: PerpsProviderType,
): PriceUpdate => ({
  symbol,
  price,
  providerId,
  timestamp: 1,
  isTradable: true,
});

describe('usePerpsLivePrices', () => {
  beforeEach(() => {
    mockSubscribeToSymbols.mockClear();
  });

  it('keeps earlier symbols across incremental ticks and clears them on cache reset', () => {
    const { result } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['BTC', 'ETH'] }),
    );
    const [{ callback }] = mockSubscribeToSymbols.mock.calls[0];
    const btc = quote('BTC', '100', 'hyperliquid');
    const eth = quote('ETH', '20', 'hyperliquid');

    act(() => callback({ BTC: btc }));
    act(() => callback({ ETH: eth }));

    expect(result.current).toEqual({ BTC: btc, ETH: eth });

    act(() => callback({}));

    expect(result.current).toEqual({});
  });

  it('waits for the new venue quote when the symbol stays the same', () => {
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: PerpsProviderType }) =>
        usePerpsLivePrices({ symbols: ['BTC'], providerId }),
      { initialProps: { providerId: 'hyperliquid' } },
    );
    const [{ callback: hyperliquid }] = mockSubscribeToSymbols.mock.calls[0];
    const btcHyperliquid = quote('BTC', '100', 'hyperliquid');
    act(() => hyperliquid({ BTC: btcHyperliquid }));
    expect(result.current).toEqual({ BTC: btcHyperliquid });

    rerender({ providerId: 'lighter' });
    act(() => hyperliquid({ BTC: btcHyperliquid }));

    expect(result.current).toEqual({});

    const [{ callback: lighter }] = mockSubscribeToSymbols.mock.calls[1];
    const btcLighter = quote('BTC', '200', 'lighter');
    act(() => lighter({ BTC: btcLighter }));

    expect(result.current).toEqual({ BTC: btcLighter });
  });
});
