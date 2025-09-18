import { renderHook } from '@testing-library/react-hooks';
import { handleFetch } from '@metamask/controller-utils';
import useFetchTokenRatesMulti from './useTokenRates';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';


jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));

// Mock tokens directly in the test file to avoid import chain issues
const MOCK_USDC_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: 'eip155:1',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
};

const MOCK_USDT_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: 'eip155:1',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
};

describe('useFetchTokenRatesMulti', () => {
  const mockTokens = [MOCK_USDC_TOKEN, MOCK_USDT_TOKEN];
  const mockFiatCurrency = 'USD';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch token rates successfully', async () => {
    const mockResponse = {
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        usd: 1.0,
      },
      'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7': {
        usd: 1.0,
      },
    };

    (handleFetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchTokenRatesMulti({
        tokens: mockTokens,
        fiatCurrency: mockFiatCurrency,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.rates).toEqual({});

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.rates).toEqual({
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1.0,
      'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7': 1.0,
    });

    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://price.api.cx.metamask.io/v3/spot-prices?assetIds=eip155%3A1%2Ferc20%3A0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48%2Ceip155%3A1%2Ferc20%3A0xdAC17F958D2ee523a2206206994597C13D831ec7&vsCurrency=USD',
      ),
    );
  });

  it('should handle API errors', async () => {
    const mockError = new Error('API Error');
    (handleFetch as jest.Mock).mockRejectedValueOnce(mockError);

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchTokenRatesMulti({
        tokens: mockTokens,
        fiatCurrency: mockFiatCurrency,
      }),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(result.current.rates).toEqual({});
  });

  it('should handle missing token rates', async () => {
    const mockResponse = {
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        usd: 1.0,
      },
    };

    (handleFetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result, waitForNextUpdate } = renderHook(() =>
      useFetchTokenRatesMulti({
        tokens: mockTokens,
        fiatCurrency: mockFiatCurrency,
      }),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.rates).toEqual({
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1.0,
      'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7': null,
    });
  });

  it('should refetch when tokens or fiat currency changes', async () => {
    const mockResponse = {
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        usd: 1.0,
      },
    };

    (handleFetch as jest.Mock).mockResolvedValue(mockResponse);

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ tokens, fiatCurrency }) =>
        useFetchTokenRatesMulti({ tokens, fiatCurrency }),
      {
        initialProps: {
          tokens: [MOCK_USDC_TOKEN],
          fiatCurrency: 'USD',
        },
      },
    );

    await waitForNextUpdate();

    rerender({
      tokens: [MOCK_USDT_TOKEN],
      fiatCurrency: 'USD',
    });

    expect(result.current.isLoading).toBe(true);
    await waitForNextUpdate();

    expect(handleFetch).toHaveBeenCalledTimes(2);
  });
});
