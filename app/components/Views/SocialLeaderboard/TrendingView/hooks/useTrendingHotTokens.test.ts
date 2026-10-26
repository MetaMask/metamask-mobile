import { renderHook } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import {
  useSocialFeed,
  type SocialFeedState,
} from '../../../../UI/SocialFeed/data/useSocialFeed';
import { mockOpenPerpsFeedItem } from '../../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type { SocialFeedSource } from '../../../../UI/SocialFeed/data/socialFeedSource';
import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';
import { useTrendingHotTokens } from './useTrendingHotTokens';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => null),
}));

jest.mock('../../../../UI/SocialFeed/data/useSocialFeed', () => ({
  useSocialFeed: jest.fn(),
}));

const mockIsEntryHidden = jest.fn((_entry: { postId: string }) => false);
jest.mock(
  '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet',
  () => ({
    useSocialEntryModeration: () => ({ isEntryHidden: mockIsEntryHidden }),
  }),
);

const mockUseSocialFeed = jest.mocked(useSocialFeed);
const mockUseIsFocused = jest.mocked(useIsFocused);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

const source: SocialFeedSource = { kind: 'all', audience: 'all' };

const perpPost = (symbol: string): SocialV1FeedPost => ({
  id: `post-${symbol}`,
  authorHandle: 'ada',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({
    id: `item-${symbol}`,
    asset: {
      symbol,
      avatar: {
        positionId: `position-${symbol}`,
        chain: 'hyperliquid',
        tokenAddress: '',
        tokenImageUrl: null,
        tokenSymbol: symbol,
      },
    },
  }),
});

const feedState = (
  overrides: Partial<SocialFeedState> = {},
): SocialFeedState => ({
  posts: [],
  rows: [],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMore: jest.fn(),
  error: null,
  refresh: jest.fn(async () => undefined),
  dataUpdatedAt: 1,
  ...overrides,
});

const renderHotTokens = (hasBeenActive = true) =>
  renderHook(() =>
    useTrendingHotTokens(source, { hasBeenActive, selectedTokenId: null }),
  );

describe('useTrendingHotTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSocialFeed.mockReturnValue(feedState());
    mockUseIsFocused.mockReturnValue(true);
    mockUseNetworkTier.mockReturnValue(null);
    mockIsEntryHidden.mockReturnValue(false);
  });

  it('reads the given source with only the fetch gate', () => {
    renderHotTokens();

    expect(mockUseSocialFeed).toHaveBeenCalledWith(source, { enabled: true });
    expect(mockUseSocialFeed.mock.lastCall?.[0]).toBe(source);
  });

  it.each([
    ['before the tab is first opened', false, true, null, false],
    ['while unfocused', true, false, null, false],
    ['offline', true, true, 'NONE', false],
    ['on an unknown network', true, true, null, true],
    ['on slow cellular', true, true, 'SLOW_CELLULAR', true],
  ] as const)(
    'gates the fetch %s',
    (_label, hasBeenActive, isFocused, networkTier, expected) => {
      mockUseIsFocused.mockReturnValue(isFocused);
      mockUseNetworkTier.mockReturnValue(networkTier);

      renderHotTokens(hasBeenActive);

      expect(mockUseSocialFeed.mock.lastCall?.[1]?.enabled).toBe(expected);
    },
  );

  it('ranks the loaded posts into chips with their asset ids', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({
        posts: [perpPost('BTC'), perpPost('ETH'), perpPost('BTC')],
      }),
    );

    const { result } = renderHotTokens();

    expect(result.current.isLoading).toBe(false);
    expect(
      result.current.tokens.map(({ id, assetIds }) => ({ id, assetIds })),
    ).toEqual([
      { id: 'asset:BTC', assetIds: ['eip155:999/perp:BTC'] },
      { id: 'asset:ETH', assetIds: ['eip155:999/perp:ETH'] },
    ]);
  });

  it('drops hidden posts before ranking', () => {
    mockIsEntryHidden.mockImplementation(
      ({ postId }: { postId: string }) => postId === 'post-ETH',
    );
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [perpPost('BTC'), perpPost('ETH')] }),
    );

    const { result } = renderHotTokens();

    expect(result.current.tokens.map((token) => token.id)).toEqual([
      'asset:BTC',
    ]);
  });

  it('reports loading until the first page arrives', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({ isLoading: true, dataUpdatedAt: undefined }),
    );

    const { result } = renderHotTokens();

    expect(result.current).toEqual({ tokens: [], isLoading: true });
  });
});
