import { renderHook, act } from '@testing-library/react-native';
import { type PriceUpdate } from '@metamask/perps-controller';
import { usePerpsLivePrices } from './usePerpsLivePrices';

type PricesCallback = (prices: Record<string, PriceUpdate> | null) => void;

const mockSubscribeToSymbols = jest.fn();
const mockStream = {
  prices: {
    subscribeToSymbols: mockSubscribeToSymbols,
  },
};

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => mockStream,
}));

const BTC_PRICE: PriceUpdate = {
  symbol: 'BTC',
  price: '50000',
  markPrice: '50050',
  percentChange24h: '2.5',
  timestamp: 123,
  isTradable: true,
};

const renderWithCapturedCallback = () => {
  let capturedCallback: PricesCallback = jest.fn();
  mockSubscribeToSymbols.mockImplementation(
    (params: { callback: PricesCallback }) => {
      capturedCallback = params.callback;
      return jest.fn();
    },
  );
  const hook = renderHook(() => usePerpsLivePrices({ symbols: ['BTC'] }));
  return {
    ...hook,
    emit: (prices: Record<string, PriceUpdate> | null) => {
      act(() => {
        capturedCallback(prices);
      });
    },
  };
};

describe('usePerpsLivePrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToSymbols.mockReturnValue(jest.fn());
  });

  it('does not subscribe without symbols', () => {
    renderHook(() => usePerpsLivePrices({ symbols: [] }));

    expect(mockSubscribeToSymbols).not.toHaveBeenCalled();
  });

  it('returns prices delivered by the stream', () => {
    const { result, emit } = renderWithCapturedCallback();

    emit({ BTC: BTC_PRICE });

    expect(result.current.BTC.price).toBe('50000');
  });

  it('keeps the previous reference when a tick repeats the same values', () => {
    const { result, emit } = renderWithCapturedCallback();
    emit({ BTC: BTC_PRICE });
    const firstPrices = result.current;

    emit({ BTC: { ...BTC_PRICE, timestamp: 456 } });

    expect(result.current).toBe(firstPrices);
  });

  it('updates when a tick changes the price', () => {
    const { result, emit } = renderWithCapturedCallback();
    emit({ BTC: BTC_PRICE });

    emit({ BTC: { ...BTC_PRICE, price: '51000' } });

    expect(result.current.BTC.price).toBe('51000');
  });

  it('ignores empty deliveries', () => {
    const { result, emit } = renderWithCapturedCallback();

    emit(null);

    expect(result.current).toEqual({});
  });
});
