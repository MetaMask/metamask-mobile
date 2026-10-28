/**
 * The rail and the Trending feed observe one TanStack query. These cases render
 * the real `TrendingView` and `useSocialFeed`, so they prove the feed, not the
 * rail, starts the shared fetch with the initial data-fetch trace.
 */
import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  measureSocialDataFetch,
  type SocialPerformanceContext,
} from '../../../../../util/social/socialPerformance';
import {
  mockFeedResponse,
  mockPerpFeedItem,
} from '../../../../UI/SocialFeed/mocks/coreFeed.mock';
import TrendingView from '../TrendingView';

const mockCall = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
    // No SocialRealtimeService: Trending streams, but no socket events arrive.
    context: {},
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => true),
}));

jest.mock('../../../../../util/social/socialPerformance', () => ({
  ...jest.requireActual('../../../../../util/social/socialPerformance'),
  measureSocialDataFetch: jest.fn(
    ({ request }: { request: () => Promise<unknown> }) => request(),
  ),
}));

jest.mock('../../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../analytics', () => ({
  ...jest.requireActual('../../analytics/socialEvents'),
  useSocialInteraction: () => jest.fn(),
}));

jest.mock('../../MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: null }),
}));

jest.mock('../../SocialV1View/feed/components', () => ({
  HotTokensCarousel: () => null,
}));

jest.mock('../../SocialV1View/feed/components/PopularTradersCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => null,
}));

jest.mock('../../../../UI/SocialFeed/live/SocialLivePricesContext', () => ({
  useSocialLivePrices: () => null,
}));

jest.mock(
  '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet',
  () => ({
    useSocialEntryModeration: () => ({ isEntryHidden: () => false }),
  }),
);

jest.mock('../../../../UI/SocialFeed/socialFeedTracking', () => ({
  SocialFeedTrackingProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useSocialFeedTracking: () => ({}),
  useSocialFeedScreenView: jest.fn(),
  socialFeedTracksLocation: () => false,
}));

jest.mock(
  '../../SocialV1View/performance/useSocialTabFirstContentTrace',
  () => ({ useSocialTabFirstContentTrace: jest.fn() }),
);

jest.mock('../../../../UI/SocialFeed/components/SocialFeedPostShell', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock(
  '../../../../UI/SocialFeed/components/FeedItemEntryAnimation',
  () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children,
    createFeedItemEntryScheduler: () => () => 0,
    FEED_ROW_LAYOUT_TRANSITION: undefined,
    FEED_ROW_LAYOUT_TRANSITION_LOW: undefined,
  }),
);

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useAnimatedScrollHandler: jest.fn(() => undefined),
    useComposedEventHandler: jest.fn(() => undefined),
  };
});

const mockMeasureSocialDataFetch = jest.mocked(measureSocialDataFetch);

const performance: SocialPerformanceContext = {
  enabled: true,
  hardwareTier: null,
  isActive: true,
  isFocused: true,
  networkTier: 'WIFI',
};

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const renderWithClient = (ui: React.ReactElement, client = createClient()) => {
  const view = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
  return { client, view };
};

describe('useTrendingHotTokens with the Trending feed mounted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue(mockFeedResponse([mockPerpFeedItem()]));
  });

  it('records the initial data-fetch trace exactly once', async () => {
    renderWithClient(<TrendingView performance={performance} />);

    await waitFor(() => expect(mockCall).toHaveBeenCalled());
    expect(mockMeasureSocialDataFetch).toHaveBeenCalledTimes(1);
    expect(mockMeasureSocialDataFetch).toHaveBeenCalledWith(
      expect.objectContaining({ tab: 'trending', cacheState: 'cold' }),
    );
  });

  it('records it once when Trending is opened after the app lands elsewhere', async () => {
    const client = createClient();
    const { view } = renderWithClient(
      <TrendingView isActive={false} performance={performance} />,
      client,
    );
    const callsWhileClosed = mockCall.mock.calls.length;

    act(() => {
      view.rerender(
        <QueryClientProvider client={client}>
          <TrendingView isActive performance={performance} />
        </QueryClientProvider>,
      );
    });

    await waitFor(() => expect(mockCall).toHaveBeenCalled());
    expect(callsWhileClosed).toBe(0);
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockMeasureSocialDataFetch).toHaveBeenCalledTimes(1);
  });
});
