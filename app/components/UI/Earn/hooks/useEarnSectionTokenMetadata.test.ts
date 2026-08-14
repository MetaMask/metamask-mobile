import { renderHook, waitFor } from '@testing-library/react-native';
import {
  fetchTokenAssets,
  type TokenAsset,
} from '../../../hooks/useTokensData/useTokensData';
import useEarnSectionTokenMetadata from './useEarnSectionTokenMetadata';

jest.mock('../../../hooks/useTokensData/useTokensData', () => ({
  fetchTokenAssets: jest.fn(),
}));

const mockFetchTokenAssets = jest.mocked(fetchTokenAssets);

const USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DAI_ASSET_ID =
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';

const createTokenAsset = (overrides: Partial<TokenAsset> = {}): TokenAsset => ({
  assetId: USDC_ASSET_ID,
  decimals: 6,
  iconUrl: 'usdc.png',
  name: 'USD Coin',
  symbol: 'USDC',
  ...overrides,
});

describe('useEarnSectionTokenMetadata', () => {
  beforeEach(() => {
    mockFetchTokenAssets.mockReset();
  });

  it('loads and indexes token metadata by lowercase asset ID', async () => {
    const returnedAssetId = USDC_ASSET_ID.replace('a0b', 'A0B');
    const token = createTokenAsset({ assetId: returnedAssetId });
    mockFetchTokenAssets.mockResolvedValue([token]);

    const { result } = renderHook(() =>
      useEarnSectionTokenMetadata([returnedAssetId]),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchTokenAssets).toHaveBeenCalledWith([USDC_ASSET_ID]);
    expect(result.current.tokensByAssetId).toEqual({ [USDC_ASSET_ID]: token });
    expect(result.current.error).toBeNull();
  });

  it('deduplicates asset IDs that differ only by casing', async () => {
    mockFetchTokenAssets.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useEarnSectionTokenMetadata([USDC_ASSET_ID, USDC_ASSET_ID.toUpperCase()]),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchTokenAssets).toHaveBeenCalledWith([USDC_ASSET_ID]);
  });

  it('clears metadata when no asset IDs remain', async () => {
    const token = createTokenAsset();
    mockFetchTokenAssets.mockResolvedValue([token]);
    const { result, rerender } = renderHook(
      ({ assetIds }) => useEarnSectionTokenMetadata(assetIds),
      { initialProps: { assetIds: [USDC_ASSET_ID] } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ assetIds: [] });

    expect(result.current).toEqual({
      tokensByAssetId: {},
      isLoading: false,
      error: null,
    });
  });

  it('exposes the fetch error when token metadata cannot load', async () => {
    const error = new Error('Token service unavailable');
    mockFetchTokenAssets.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useEarnSectionTokenMetadata([DAI_ASSET_ID]),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tokensByAssetId).toEqual({});
    expect(result.current.error).toBe(error);
  });

  it('creates a descriptive error when token metadata rejects a non-Error value', async () => {
    mockFetchTokenAssets.mockRejectedValue('Token service unavailable');

    const { result } = renderHook(() =>
      useEarnSectionTokenMetadata([DAI_ASSET_ID]),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(
      new Error('Failed to load Earn asset metadata'),
    );
  });
});
