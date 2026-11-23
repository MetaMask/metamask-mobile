import { renderHook } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { usePerpsSocialTabsPrefetch } from './usePerpsSocialTabsPrefetch';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: jest.fn() }));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));
jest.mock('../../SocialFeed/data/socialFeedQueries', () => ({
  FEED_PAGE_LIMIT: 30,
  buildSocialFeedQueryKey: jest.fn(() => ['feed-key']),
  fetchSocialFeedPage: jest.fn(),
  getSocialFeedNextPageParam: jest.fn(),
}));
jest.mock(
  '../../TokenDetails/components/tabs/holders/tokenHoldersQueries',
  () => ({
    buildTokenHoldersQueryKey: jest.fn(() => ['holders-key']),
    fetchTokenHoldersPage: jest.fn(),
    getTokenHoldersNextPageParam: jest.fn(),
  }),
);

const FEED_ASSET_IDS = [
  'eip155:999/slip44:BTC',
] as const satisfies readonly CaipAssetType[];

describe('usePerpsSocialTabsPrefetch', () => {
  const infiniteQuery = jest.fn().mockResolvedValue(undefined);
  const setQueryDefaults = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({
      infiniteQuery,
      setQueryDefaults,
    });
    (useSelector as jest.Mock).mockReturnValue(true);
    (useNetworkTier as jest.Mock).mockReturnValue('WIFI');
    (getHardwareTier as jest.Mock).mockReturnValue('HIGH');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prefetches the first page of the feed and holders after the delay', () => {
    renderHook(() =>
      usePerpsSocialTabsPrefetch({
        symbol: 'BTC',
        feedAssetIds: FEED_ASSET_IDS,
        enabled: true,
      }),
    );

    expect(infiniteQuery).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1500);

    expect(infiniteQuery).toHaveBeenCalledTimes(2);
    expect(infiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ pages: 1 }),
    );
    expect(setQueryDefaults).toHaveBeenCalledTimes(2);
    expect(setQueryDefaults).toHaveBeenCalledWith(expect.anything(), {
      staleTime: 60000,
    });
  });

  it.each(['NONE', 'SLOW_CELLULAR'])(
    'does not prefetch on a %s network',
    (tier) => {
      (useNetworkTier as jest.Mock).mockReturnValue(tier);

      renderHook(() =>
        usePerpsSocialTabsPrefetch({
          symbol: 'BTC',
          feedAssetIds: FEED_ASSET_IDS,
          enabled: true,
        }),
      );
      jest.advanceTimersByTime(5000);

      expect(infiniteQuery).not.toHaveBeenCalled();
    },
  );

  it('does not prefetch on LOW hardware', () => {
    (getHardwareTier as jest.Mock).mockReturnValue('LOW');

    renderHook(() =>
      usePerpsSocialTabsPrefetch({
        symbol: 'BTC',
        feedAssetIds: FEED_ASSET_IDS,
        enabled: true,
      }),
    );
    jest.advanceTimersByTime(5000);

    expect(infiniteQuery).not.toHaveBeenCalled();
  });

  it('prefetches when the hardware tier is unknown', () => {
    (getHardwareTier as jest.Mock).mockReturnValue(null);

    renderHook(() =>
      usePerpsSocialTabsPrefetch({
        symbol: 'BTC',
        feedAssetIds: FEED_ASSET_IDS,
        enabled: true,
      }),
    );
    jest.advanceTimersByTime(1500);

    expect(infiniteQuery).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending prefetch on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsSocialTabsPrefetch({
        symbol: 'BTC',
        feedAssetIds: FEED_ASSET_IDS,
        enabled: true,
      }),
    );

    unmount();
    jest.advanceTimersByTime(5000);

    expect(infiniteQuery).not.toHaveBeenCalled();
  });
});
