import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  Position,
  SocialFeedEvent,
  SocialFeedEventListener,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import type { SocialRealtimeLeaseStatus } from '../../../../UI/SocialFeed/data/socialRealtimeLease';
import { buildPosition } from '../positionDetailsSheet.fixtures';
import { useLivePosition, type UseLivePositionParams } from './useLivePosition';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: {} },
}));

let mockNetworkTier: string | null = 'WIFI';
jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

const mockRelease = jest.fn();
let mockLeaseStatus: ((status: SocialRealtimeLeaseStatus) => void) | undefined;
const mockAcquire = jest.fn(
  (_scope: string, onStatus?: (status: SocialRealtimeLeaseStatus) => void) => {
    mockLeaseStatus = onStatus;
    return mockRelease;
  },
);
jest.mock('../../../../UI/SocialFeed/data/socialRealtimeLease', () => ({
  acquireSocialRealtime: (
    scope: string,
    onStatus?: (status: SocialRealtimeLeaseStatus) => void,
  ) => mockAcquire(scope, onStatus),
}));

let mockFetchedPosition: Position | undefined;
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockUseTraderPosition = jest.fn(
  (_positionId: string, _options: { enabled: boolean }) => ({
    position: mockFetchedPosition,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
);
jest.mock('../../TraderPositionView/hooks/useTraderPosition', () => ({
  useTraderPosition: (positionId: string, options: { enabled: boolean }) =>
    mockUseTraderPosition(positionId, options),
}));

const mockContext = Engine.context as unknown as Record<string, unknown>;
let listener: SocialFeedEventListener | undefined;
let reconnectListener: (() => void) | undefined;

const lastFetchEnabled = () =>
  mockUseTraderPosition.mock.calls[
    mockUseTraderPosition.mock.calls.length - 1
  ][1].enabled;

const emit = (feedItemId: string, revision: number, data: Position) =>
  act(() => {
    listener?.(
      {
        version: 1,
        kind: 'feed-item',
        eventId: `event-${revision}`,
        feedItemId,
        revision,
        occurredAt: '2026-11-03T00:00:00Z',
        data,
      } as SocialFeedEvent,
      'all',
    );
  });

const snapshot = buildPosition({ tokenSymbol: 'SNAP' });

const renderLivePosition = (params: Partial<UseLivePositionParams> = {}) =>
  renderHook(() =>
    useLivePosition({ positionId: 'position-1', snapshot, ...params }),
  );

describe('useLivePosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkTier = 'WIFI';
    mockFetchedPosition = undefined;
    mockLeaseStatus = undefined;
    listener = undefined;
    reconnectListener = undefined;
    mockContext.SocialRealtimeService = {
      addListener: jest.fn((next: SocialFeedEventListener) => {
        listener = next;
        return jest.fn();
      }),
      addReconnectListener: jest.fn((next: () => void) => {
        reconnectListener = next;
        return jest.fn();
      }),
    };
  });

  it('renders a live snapshot without fetching and leases the all channel', () => {
    const { result } = renderLivePosition({ isSnapshotLive: true });

    expect(result.current.position).toBe(snapshot);
    expect(result.current.isRefreshed).toBe(false);
    expect(lastFetchEnabled()).toBe(false);
    expect(mockAcquire).toHaveBeenCalledWith('all', expect.any(Function));
  });

  it('ignores a cached copy while the live snapshot needs no fetch', () => {
    mockFetchedPosition = buildPosition({ tokenSymbol: 'CACHED' });

    const { result } = renderLivePosition({ isSnapshotLive: true });

    expect(result.current.position).toBe(snapshot);
  });

  it.each([
    ['there is no snapshot', { snapshot: undefined, isSnapshotLive: true }],
    ['the snapshot came from a feed without live updates', {}],
  ])('fetches when %s', (_label, params) => {
    renderLivePosition(params);

    expect(lastFetchEnabled()).toBe(true);
  });

  it('fetches and skips the socket when offline', () => {
    mockNetworkTier = 'NONE';

    renderLivePosition({ isSnapshotLive: true });

    expect(lastFetchEnabled()).toBe(true);
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('fetches when the socket cannot go live', () => {
    renderLivePosition({ isSnapshotLive: true });

    act(() => mockLeaseStatus?.('unavailable'));

    expect(lastFetchEnabled()).toBe(true);
  });

  it('applies the newest socket revision for this position only', () => {
    mockFetchedPosition = buildPosition({ tokenSymbol: 'API' });
    const revisionTwo = buildPosition({ tokenSymbol: 'REV2' });
    const { result } = renderLivePosition();

    emit('position-1', 2, revisionTwo);
    emit('position-1', 1, buildPosition({ tokenSymbol: 'REV1' }));
    emit('position-2', 3, buildPosition({ tokenSymbol: 'OTHER' }));

    expect(result.current.position).toBe(revisionTwo);
  });

  it('refetches after a reconnect and shows the caught-up copy', async () => {
    const { result, rerender } = renderLivePosition({ isSnapshotLive: true });
    emit('position-1', 1, buildPosition({ tokenSymbol: 'REV1' }));
    const caughtUp = buildPosition({ tokenSymbol: 'CAUGHT_UP' });
    mockRefetch.mockImplementationOnce(async () => {
      mockFetchedPosition = caughtUp;
    });

    act(() => reconnectListener?.());
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
    rerender({});

    await waitFor(() => expect(result.current.position).toBe(caughtUp));
  });

  it('keeps a revision that arrives while the reconnect fetch is in flight', async () => {
    const { result, rerender } = renderLivePosition({ isSnapshotLive: true });
    emit('position-1', 1, buildPosition({ tokenSymbol: 'REV1' }));
    const duringFetch = buildPosition({ tokenSymbol: 'REV2' });
    let settleFetch: () => void = () => undefined;
    mockRefetch.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          settleFetch = () => {
            mockFetchedPosition = buildPosition({ tokenSymbol: 'API' });
            resolve();
          };
        }),
    );

    act(() => reconnectListener?.());
    emit('position-1', 2, duringFetch);
    await act(async () => settleFetch());
    rerender({});

    expect(result.current.position).toBe(duringFetch);
  });

  it('releases the lease on unmount', () => {
    const { unmount } = renderLivePosition();

    unmount();

    expect(mockRelease).toHaveBeenCalled();
  });
});
