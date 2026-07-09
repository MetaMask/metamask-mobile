import { renderHook, act } from '@testing-library/react-hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import { useTokenWatchlist } from './useTokenWatchlist';
import {
  useTokenWatchlistAddItemMutation,
  useTokenWatchlistRemoveItemMutation,
} from './useTokenWatchlistMutations';
import { tokenWatchlistQueryKeys } from './watchlist-query-keys';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
  useQuery: jest.fn(),
}));

jest.mock('./useTokenWatchlistMutations', () => ({
  useTokenWatchlistAddItemMutation: jest.fn(),
  useTokenWatchlistRemoveItemMutation: jest.fn(),
}));

const mockGetQueryData = jest.fn();
const mockMutateAdd = jest.fn();
const mockMutateRemove = jest.fn();

const ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

describe('useTokenWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({
      getQueryData: mockGetQueryData,
    });
    (useTokenWatchlistAddItemMutation as jest.Mock).mockReturnValue({
      mutate: mockMutateAdd,
      isPending: false,
    });
    (useTokenWatchlistRemoveItemMutation as jest.Mock).mockReturnValue({
      mutate: mockMutateRemove,
      isPending: false,
    });
  });

  const mockBlobQuery = (assets: string[]) => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { assets, version: 1 },
    });
  };

  it('returns noop result when assetId is null', () => {
    (useQuery as jest.Mock).mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useTokenWatchlist(null));

    expect(result.current.isWatched).toBe(false);
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.toggle());
    expect(mockMutateAdd).not.toHaveBeenCalled();
    expect(mockMutateRemove).not.toHaveBeenCalled();
  });

  it('returns isWatched=false when blob is empty', () => {
    mockBlobQuery([]);

    const { result } = renderHook(() => useTokenWatchlist(ASSET_ID));

    expect(result.current.isWatched).toBe(false);
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: tokenWatchlistQueryKeys.blob,
      }),
    );
  });

  it('returns isWatched=true when asset is in blob', () => {
    mockBlobQuery([String(ASSET_ID)]);

    const { result } = renderHook(() => useTokenWatchlist(ASSET_ID));

    expect(result.current.isWatched).toBe(true);
  });

  it('returns isWatched=false when blob has no data (undefined)', () => {
    (useQuery as jest.Mock).mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useTokenWatchlist(ASSET_ID));

    expect(result.current.isWatched).toBe(false);
  });

  it('calls addMutation when toggling an unwatched asset', () => {
    mockBlobQuery([]);

    const { result } = renderHook(() => useTokenWatchlist(ASSET_ID));

    act(() => result.current.toggle());

    expect(mockMutateAdd).toHaveBeenCalledWith(ASSET_ID);
    expect(mockMutateRemove).not.toHaveBeenCalled();
  });

  it('calls removeMutation when toggling a watched asset', () => {
    mockBlobQuery([String(ASSET_ID)]);

    const { result } = renderHook(() => useTokenWatchlist(ASSET_ID));

    act(() => result.current.toggle());

    expect(mockMutateRemove).toHaveBeenCalledWith(ASSET_ID);
    expect(mockMutateAdd).not.toHaveBeenCalled();
  });

  it('returns isLoading=true when add mutation is pending', () => {
    (useTokenWatchlistAddItemMutation as jest.Mock).mockReturnValue({
      mutate: mockMutateAdd,
      isPending: true,
    });
    mockBlobQuery([]);

    const { result } = renderHook(() => useTokenWatchlist(ASSET_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading=true when remove mutation is pending', () => {
    (useTokenWatchlistRemoveItemMutation as jest.Mock).mockReturnValue({
      mutate: mockMutateRemove,
      isPending: true,
    });
    mockBlobQuery([String(ASSET_ID)]);

    const { result } = renderHook(() => useTokenWatchlist(ASSET_ID));

    expect(result.current.isLoading).toBe(true);
  });
});
