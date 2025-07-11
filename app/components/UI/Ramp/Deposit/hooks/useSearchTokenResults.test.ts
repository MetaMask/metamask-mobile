import { renderHook } from '@testing-library/react-hooks';
import useSearchTokenResults from './useSearchTokenResults';
import { DepositCryptoCurrency } from '../constants';

const mockTokens: DepositCryptoCurrency[] = [
  {
    assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 'eip155:1',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  {
    assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 'eip155:1',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
];

describe('useSearchTokenResults', () => {
  it('should return an empty array when an empty array is passed', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({ tokens: [], searchString: 'BTC' }),
    );
    expect(result.current).toEqual([]);
  });

  it('should return the same input when searchString is an empty string', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({ tokens: mockTokens, searchString: '' }),
    );
    expect(result.current).toEqual(mockTokens);
  });

  it('should match tokens by symbol', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({ tokens: mockTokens, searchString: 'USDT' }),
    );
    expect(result.current[0].symbol).toBe('USDT');
  });

  it('should match tokens by name', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({ tokens: mockTokens, searchString: 'USD Coin' }),
    );
    expect(result.current[0].name).toBe('USD Coin');
  });

  it('should return an empty array when no matches are found', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: mockTokens,
        searchString: 'NONEXISTENT',
      }),
    );
    expect(result.current).toEqual([]);
  });
});
