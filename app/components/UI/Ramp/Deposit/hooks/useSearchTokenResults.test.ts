import { renderHook } from '@testing-library/react-hooks';
import useSearchTokenResults from './useSearchTokenResults';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk/dist/Deposit';

const mockTokens: DepositCryptoCurrency[] = [
  {
    assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 'eip155:1',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
  },
  {
    assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 'eip155:1',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
  },
  {
    assetId: 'eip155:56/erc20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    chainId: 'eip155:56',
    name: 'USD Coin (BSC)',
    symbol: 'USDC',
    decimals: 18,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/erc20/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.png',
  },
];

function mapToAssetIds(tokens: DepositCryptoCurrency[]) {
  return tokens.map((token) => token.assetId);
}

describe('useSearchTokenResults', () => {
  it('should return an empty array when an empty array is passed', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: [],
        networkFilter: null,
        searchString: 'BTC',
      }),
    );
    expect(result.current).toEqual([]);
  });

  it('should return the same input when searchString is an empty string', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: mockTokens,
        networkFilter: null,
        searchString: '',
      }),
    );
    expect(mapToAssetIds(result.current)).toEqual(mapToAssetIds(mockTokens));
  });

  it('should filter tokens by networkFilter', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: mockTokens,
        networkFilter: ['eip155:56'], // BSC network
        searchString: '',
      }),
    );
    expect(mapToAssetIds(result.current)).toEqual([
      'eip155:56/erc20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    ]);
  });

  it('should match tokens by symbol within the networkFilter', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: mockTokens,
        networkFilter: ['eip155:1'], // Ethereum network
        searchString: 'USDT',
      }),
    );
    expect(result.current[0].symbol).toBe('USDT');
  });

  it('should match tokens by name within the networkFilter', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: mockTokens,
        networkFilter: ['eip155:1'], // Ethereum network
        searchString: 'USD Coin',
      }),
    );
    expect(result.current[0].name).toBe('USD Coin');
  });

  it('should return an empty array when no matches are found within the networkFilter', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: mockTokens.filter((token) => token.chainId !== 'eip155:56'),
        networkFilter: ['eip155:56'], // BSC network
        searchString: 'USDT',
      }),
    );
    expect(result.current).toEqual([]);
  });

  it('should return all tokens when networkFilter is null', () => {
    const { result } = renderHook(() =>
      useSearchTokenResults({
        tokens: mockTokens,
        networkFilter: null,
        searchString: '',
      }),
    );
    expect(mapToAssetIds(result.current)).toEqual(mapToAssetIds(mockTokens));
  });
});
