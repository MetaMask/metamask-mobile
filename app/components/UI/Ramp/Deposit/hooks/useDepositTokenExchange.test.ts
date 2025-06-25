import { renderHook } from '@testing-library/react-hooks';
import useDepsositTokenExchange from './useDepositTokenExchange';
import { DepositCryptoCurrency, USD_CURRENCY } from '../constants';
import { useFetchTokenRatesMulti } from './useTokenRates';

jest.mock('./useTokenRates', () => ({
  useFetchTokenRatesMulti: jest.fn(),
}));

describe('useDepsositTokenExchange', () => {
  const mockToken: DepositCryptoCurrency = {
    assetId: 'eip155:1/erc20:0x123',
    chainId: 'eip155:1',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    iconUrl: 'https://example.com/usdc.png',
    address: '0x123',
    logo: 'https://example.com/usdc.png',
  };

  const mockTokens: DepositCryptoCurrency[] = [mockToken];

  it('should calculate token amount correctly when rate is available', () => {
    const mockRates = {
      'eip155:1/erc20:0x123': 0.99978,
    };

    (useFetchTokenRatesMulti as jest.Mock).mockReturnValue({
      rates: mockRates,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useDepsositTokenExchange({
        fiatCurrency: USD_CURRENCY,
        fiatAmount: '100',
        token: mockToken,
        tokens: mockTokens,
      }),
    );

    expect(result.current.rate).toBe(0.99978);
    expect(result.current.tokenAmount).toBe('99.978000');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return zero token amount when rate is not available', () => {
    (useFetchTokenRatesMulti as jest.Mock).mockReturnValue({
      rates: {},
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useDepsositTokenExchange({
        fiatCurrency: USD_CURRENCY,
        fiatAmount: '1000',
        token: mockToken,
        tokens: mockTokens,
      }),
    );

    expect(result.current.rate).toBe(null);
    expect(result.current.tokenAmount).toBe('0');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle loading state', () => {
    (useFetchTokenRatesMulti as jest.Mock).mockReturnValue({
      rates: {},
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() =>
      useDepsositTokenExchange({
        fiatCurrency: USD_CURRENCY,
        fiatAmount: '1000',
        token: mockToken,
        tokens: mockTokens,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.tokenAmount).toBe('0');
  });

  it('should handle error state', () => {
    const mockError = new Error('Failed to fetch rates');
    (useFetchTokenRatesMulti as jest.Mock).mockReturnValue({
      rates: {},
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() =>
      useDepsositTokenExchange({
        fiatCurrency: USD_CURRENCY,
        fiatAmount: '1000',
        token: mockToken,
        tokens: mockTokens,
      }),
    );

    expect(result.current.error).toBe(mockError);
    expect(result.current.tokenAmount).toBe('0');
  });
});
