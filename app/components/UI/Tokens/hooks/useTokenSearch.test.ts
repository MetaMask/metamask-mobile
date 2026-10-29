import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { FlashListAssetKey } from '../TokenList/TokenList';
import { useTokenSearch } from './useTokenSearch';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

const ETH_KEY: FlashListAssetKey = {
  address: 'eip155:1/slip44:60',
  chainId: '0x1',
  isStaked: false,
};
const USDC_KEY: FlashListAssetKey = {
  address: 'eip155:1/erc20:0xa0b8',
  chainId: '0x1',
  isStaked: false,
};
const SOL_KEY: FlashListAssetKey = {
  address: 'solana:abc/slip44:501',
  chainId: 'solana:abc',
  isStaked: false,
};
const STAKED_ETH_KEY: FlashListAssetKey = { ...ETH_KEY, isStaked: true };

const ASSETS = {
  '0x1': [
    {
      assetId: ETH_KEY.address,
      chainId: '0x1',
      symbol: 'ETH',
      name: 'Ethereum',
    },
    {
      assetId: USDC_KEY.address,
      chainId: '0x1',
      symbol: 'USDC',
      name: 'USD Coin',
    },
  ],
  'solana:abc': [
    {
      assetId: SOL_KEY.address,
      chainId: 'solana:abc',
      symbol: 'SOL',
      name: 'Solana',
    },
  ],
};

describe('useTokenSearch', () => {
  const tokenKeys = [ETH_KEY, USDC_KEY, SOL_KEY];

  beforeEach(() => {
    jest.mocked(useSelector).mockReturnValue(ASSETS);
  });

  it('returns the same array reference when the query is empty', () => {
    const { result } = renderHook(() => useTokenSearch(tokenKeys, ''));

    expect(result.current).toBe(tokenKeys);
  });

  it('returns the same array reference when the query is only whitespace', () => {
    const { result } = renderHook(() => useTokenSearch(tokenKeys, '   '));

    expect(result.current).toBe(tokenKeys);
  });

  it('matches by symbol case-insensitively', () => {
    const { result } = renderHook(() => useTokenSearch(tokenKeys, 'eTh'));

    expect(result.current).toEqual([ETH_KEY]);
  });

  it('matches by name', () => {
    const { result } = renderHook(() => useTokenSearch(tokenKeys, 'coin'));

    expect(result.current).toEqual([USDC_KEY]);
  });

  it('trims the query', () => {
    const { result } = renderHook(() => useTokenSearch(tokenKeys, '  sol  '));

    expect(result.current).toEqual([SOL_KEY]);
  });

  it('returns an empty array when nothing matches', () => {
    const { result } = renderHook(() => useTokenSearch(tokenKeys, 'zzz'));

    expect(result.current).toEqual([]);
  });

  it('matches staked rows using the underlying asset symbol', () => {
    const { result } = renderHook(() =>
      useTokenSearch([ETH_KEY, STAKED_ETH_KEY], 'eth'),
    );

    expect(result.current).toEqual([ETH_KEY, STAKED_ETH_KEY]);
  });

  it('excludes keys that have no matching asset data', () => {
    jest.mocked(useSelector).mockReturnValue({});

    const { result } = renderHook(() => useTokenSearch(tokenKeys, 'eth'));

    expect(result.current).toEqual([]);
  });
});
