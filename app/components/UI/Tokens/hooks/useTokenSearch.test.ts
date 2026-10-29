import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { FlashListAssetKey } from '../TokenList/TokenList';
import {
  selectAssetsBySelectedAccountGroup,
  selectStakedAssets,
} from '../../../../selectors/assets/assets-list';
import { useTokenSearch } from './useTokenSearch';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
  selectStakedAssets: jest.fn(),
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

const STAKED_ASSETS = [
  {
    chainId: '0x1',
    accountId: 'account-1',
    stakedAsset: {
      assetId: ETH_KEY.address,
      chainId: '0x1',
      symbol: 'ETH',
      name: 'Staked Ethereum',
    },
  },
];

const mockSelectors = (
  assets: Record<string, unknown> = ASSETS,
  stakedAssets: unknown[] = STAKED_ASSETS,
) =>
  jest.mocked(useSelector).mockImplementation((selector: unknown) => {
    if (selector === selectAssetsBySelectedAccountGroup) return assets;
    if (selector === selectStakedAssets) return stakedAssets;
    return undefined;
  });

describe('useTokenSearch', () => {
  const tokenKeys = [ETH_KEY, USDC_KEY, SOL_KEY];

  beforeEach(() => {
    mockSelectors();
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

  it('matches the staked row by its own name', () => {
    const { result } = renderHook(() =>
      useTokenSearch([ETH_KEY, STAKED_ETH_KEY], 'stak'),
    );

    expect(result.current).toEqual([STAKED_ETH_KEY]);
  });

  it('does not match the native row by the staked name', () => {
    const { result } = renderHook(() => useTokenSearch([ETH_KEY], 'staked'));

    expect(result.current).toEqual([]);
  });

  it('matches staked rows using the underlying asset symbol', () => {
    const { result } = renderHook(() =>
      useTokenSearch([ETH_KEY, STAKED_ETH_KEY], 'eth'),
    );

    expect(result.current).toEqual([ETH_KEY, STAKED_ETH_KEY]);
  });

  it('excludes keys that have no matching asset data', () => {
    mockSelectors({}, []);

    const { result } = renderHook(() => useTokenSearch(tokenKeys, 'eth'));

    expect(result.current).toEqual([]);
  });
});
