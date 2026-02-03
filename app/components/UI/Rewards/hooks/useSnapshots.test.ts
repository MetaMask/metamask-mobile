import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useSnapshots } from './useSnapshots';
import Engine from '../../../../core/Engine';
import {
  setSnapshots,
  setSnapshotsLoading,
  setSnapshotsError,
} from '../../../../reducers/rewards';
import {
  selectSeasonId,
  selectSnapshots,
  selectSnapshotsLoading,
  selectSnapshotsError,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSnapshotsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { getSnapshotStatus } from '../components/SnapshotTile/SnapshotTile.utils';
import type { SnapshotDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setSnapshots: jest.fn(),
  setSnapshotsLoading: jest.fn(),
  setSnapshotsError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectSeasonId: jest.fn(),
  selectSnapshots: jest.fn(),
  selectSnapshotsLoading: jest.fn(),
  selectSnapshotsError: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/rewards', () => ({
  selectSnapshotsRewardsEnabledFlag: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('../components/SnapshotTile/SnapshotTile.utils', () => ({
  getSnapshotStatus: jest.fn(),
}));

/**
 * Creates a test snapshot with customizable overrides
 */
const createTestSnapshot = (
  overrides: Partial<SnapshotDto> = {},
): SnapshotDto => ({
  id: `snapshot-${Math.random().toString(36).substr(2, 9)}`,
  seasonId: 'season-1',
  name: 'Test Snapshot',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 'Ethereum',
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  backgroundImage: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  ...overrides,
});

describe('useSnapshots', () => {
  const mockDispatch = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockSetSnapshots = setSnapshots as jest.MockedFunction<
    typeof setSnapshots
  >;
  const mockSetSnapshotsLoading = setSnapshotsLoading as jest.MockedFunction<
    typeof setSnapshotsLoading
  >;
  const mockSetSnapshotsError = setSnapshotsError as jest.MockedFunction<
    typeof setSnapshotsError
  >;
  const mockUseInvalidateByRewardEvents =
    useInvalidateByRewardEvents as jest.MockedFunction<
      typeof useInvalidateByRewardEvents
    >;
  const mockGetSnapshotStatus = getSnapshotStatus as jest.MockedFunction<
    typeof getSnapshotStatus
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockSetSnapshots.mockReturnValue({
      type: 'rewards/setSnapshots',
      payload: null,
    });
    mockSetSnapshotsLoading.mockReturnValue({
      type: 'rewards/setSnapshotsLoading',
      payload: false,
    });
    mockSetSnapshotsError.mockReturnValue({
      type: 'rewards/setSnapshotsError',
      payload: false,
    });
    mockUseFocusEffect.mockClear();
    mockUseInvalidateByRewardEvents.mockClear();
  });

  const setupSelectorMocks = (
    options: {
      seasonId?: string | null;
      subscriptionId?: string | null;
      snapshots?: SnapshotDto[] | null;
      isLoading?: boolean;
      hasError?: boolean;
      isSnapshotsEnabled?: boolean;
    } = {},
  ) => {
    const {
      seasonId = 'season-1',
      subscriptionId = 'subscription-1',
      snapshots = null,
      isLoading = false,
      hasError = false,
      isSnapshotsEnabled = true,
    } = options;

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return seasonId;
      if (selector === selectRewardsSubscriptionId) return subscriptionId;
      if (selector === selectSnapshots) return snapshots;
      if (selector === selectSnapshotsLoading) return isLoading;
      if (selector === selectSnapshotsError) return hasError;
      if (selector === selectSnapshotsRewardsEnabledFlag)
        return isSnapshotsEnabled;
      return undefined;
    });
  };

  describe('initial state', () => {
    it('returns initial state from selectors', () => {
      const testSnapshots = [createTestSnapshot()];
      setupSelectorMocks({
        snapshots: testSnapshots,
        isLoading: false,
        hasError: false,
      });
      mockGetSnapshotStatus.mockReturnValue('live');

      const { result } = renderHook(() => useSnapshots());

      expect(result.current.snapshots).toEqual(testSnapshots);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(typeof result.current.fetchSnapshots).toBe('function');
    });
  });

  describe('fetchSnapshots', () => {
    it('calls Engine controller when fetching snapshots', async () => {
      setupSelectorMocks();
      const mockSnapshotsData = [createTestSnapshot()];
      mockEngineCall.mockResolvedValueOnce(mockSnapshotsData);
      mockGetSnapshotStatus.mockReturnValue('live');

      const { result } = renderHook(() => useSnapshots());

      await act(async () => {
        await result.current.fetchSnapshots();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSnapshots',
        'season-1',
        'subscription-1',
      );
    });

    it('dispatches loading state before fetch', async () => {
      setupSelectorMocks();
      mockEngineCall.mockResolvedValueOnce([]);
      mockGetSnapshotStatus.mockReturnValue('live');

      const { result } = renderHook(() => useSnapshots());

      await act(async () => {
        await result.current.fetchSnapshots();
      });

      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsError(false));
    });

    it('dispatches snapshots on successful fetch', async () => {
      setupSelectorMocks();
      const mockSnapshotsData = [createTestSnapshot()];
      mockEngineCall.mockResolvedValueOnce(mockSnapshotsData);
      mockGetSnapshotStatus.mockReturnValue('live');

      const { result } = renderHook(() => useSnapshots());

      await act(async () => {
        await result.current.fetchSnapshots();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetSnapshots(mockSnapshotsData),
      );
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsLoading(false));
    });

    it('dispatches error state on fetch failure', async () => {
      setupSelectorMocks();
      const mockError = new Error('Network failed');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockGetSnapshotStatus.mockReturnValue('live');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useSnapshots());

      await act(async () => {
        await result.current.fetchSnapshots();
      });

      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsError(true));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsLoading(false));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching snapshots');

      consoleErrorSpy.mockRestore();
    });

    it('does not fetch when subscriptionId is null', async () => {
      setupSelectorMocks({ subscriptionId: null });
      mockGetSnapshotStatus.mockReturnValue('live');

      const { result } = renderHook(() => useSnapshots());

      await act(async () => {
        await result.current.fetchSnapshots();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshots(null));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsLoading(false));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsError(false));
    });

    it('does not fetch when seasonId is null', async () => {
      setupSelectorMocks({ seasonId: null });
      mockGetSnapshotStatus.mockReturnValue('live');

      const { result } = renderHook(() => useSnapshots());

      await act(async () => {
        await result.current.fetchSnapshots();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshots(null));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsLoading(false));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsError(false));
    });

    it('does not fetch when isSnapshotsEnabled is false', async () => {
      setupSelectorMocks({ isSnapshotsEnabled: false });
      mockGetSnapshotStatus.mockReturnValue('live');

      const { result } = renderHook(() => useSnapshots());

      await act(async () => {
        await result.current.fetchSnapshots();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshots(null));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsLoading(false));
      expect(mockDispatch).toHaveBeenCalledWith(mockSetSnapshotsError(false));
    });
  });

  describe('categorizedSnapshots', () => {
    it('categorizes snapshots by status (live to active, upcoming to upcoming, others to previous)', () => {
      const liveSnapshot = createTestSnapshot({ id: 'live-1' });
      const upcomingSnapshot1 = createTestSnapshot({ id: 'upcoming-1' });
      const upcomingSnapshot2 = createTestSnapshot({ id: 'upcoming-2' });
      const calculatingSnapshot = createTestSnapshot({ id: 'calculating-1' });
      const distributingSnapshot = createTestSnapshot({ id: 'distributing-1' });
      const completeSnapshot = createTestSnapshot({ id: 'complete-1' });

      const allSnapshots = [
        liveSnapshot,
        upcomingSnapshot1,
        upcomingSnapshot2,
        calculatingSnapshot,
        distributingSnapshot,
        completeSnapshot,
      ];

      setupSelectorMocks({ snapshots: allSnapshots });

      mockGetSnapshotStatus.mockImplementation((snapshot) => {
        switch (snapshot.id) {
          case 'live-1':
            return 'live';
          case 'upcoming-1':
          case 'upcoming-2':
            return 'upcoming';
          case 'calculating-1':
            return 'calculating';
          case 'distributing-1':
            return 'distributing';
          case 'complete-1':
            return 'complete';
          default:
            return 'upcoming';
        }
      });

      const { result } = renderHook(() => useSnapshots());

      expect(result.current.categorizedSnapshots.active).toHaveLength(1);
      expect(result.current.categorizedSnapshots.active[0].id).toBe('live-1');

      expect(result.current.categorizedSnapshots.upcoming).toHaveLength(2);
      expect(
        result.current.categorizedSnapshots.upcoming.map((s) => s.id),
      ).toContain('upcoming-1');
      expect(
        result.current.categorizedSnapshots.upcoming.map((s) => s.id),
      ).toContain('upcoming-2');

      expect(result.current.categorizedSnapshots.previous).toHaveLength(3);
      expect(
        result.current.categorizedSnapshots.previous.map((s) => s.id),
      ).toContain('calculating-1');
      expect(
        result.current.categorizedSnapshots.previous.map((s) => s.id),
      ).toContain('distributing-1');
      expect(
        result.current.categorizedSnapshots.previous.map((s) => s.id),
      ).toContain('complete-1');
    });

    it('sorts upcoming by opensAt ascending', () => {
      const upcomingEarlier = createTestSnapshot({
        id: 'upcoming-earlier',
        opensAt: '2025-03-01T00:00:00.000Z',
      });
      const upcomingLater = createTestSnapshot({
        id: 'upcoming-later',
        opensAt: '2025-03-15T00:00:00.000Z',
      });
      const upcomingMiddle = createTestSnapshot({
        id: 'upcoming-middle',
        opensAt: '2025-03-08T00:00:00.000Z',
      });

      setupSelectorMocks({
        snapshots: [upcomingLater, upcomingEarlier, upcomingMiddle],
      });

      mockGetSnapshotStatus.mockReturnValue('upcoming');

      const { result } = renderHook(() => useSnapshots());

      const upcomingIds = result.current.categorizedSnapshots.upcoming.map(
        (s) => s.id,
      );

      expect(upcomingIds).toEqual([
        'upcoming-earlier',
        'upcoming-middle',
        'upcoming-later',
      ]);
    });

    it('sorts previous by closesAt descending', () => {
      const previousEarlier = createTestSnapshot({
        id: 'previous-earlier',
        closesAt: '2025-01-01T00:00:00.000Z',
      });
      const previousLater = createTestSnapshot({
        id: 'previous-later',
        closesAt: '2025-03-15T00:00:00.000Z',
      });
      const previousMiddle = createTestSnapshot({
        id: 'previous-middle',
        closesAt: '2025-02-08T00:00:00.000Z',
      });

      setupSelectorMocks({
        snapshots: [previousEarlier, previousLater, previousMiddle],
      });

      mockGetSnapshotStatus.mockReturnValue('complete');

      const { result } = renderHook(() => useSnapshots());

      const previousIds = result.current.categorizedSnapshots.previous.map(
        (s) => s.id,
      );

      expect(previousIds).toEqual([
        'previous-later',
        'previous-middle',
        'previous-earlier',
      ]);
    });

    it('returns empty categories when snapshots is null', () => {
      setupSelectorMocks({ snapshots: null });

      const { result } = renderHook(() => useSnapshots());

      expect(result.current.categorizedSnapshots).toEqual({
        active: [],
        upcoming: [],
        previous: [],
      });
    });
  });

  describe('useFocusEffect integration', () => {
    it('registers focus effect callback', () => {
      setupSelectorMocks();
      mockGetSnapshotStatus.mockReturnValue('live');

      renderHook(() => useSnapshots());

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });

    it('fetches snapshots when focus effect is triggered', async () => {
      setupSelectorMocks();
      const mockSnapshotsData = [createTestSnapshot()];
      mockEngineCall.mockResolvedValueOnce(mockSnapshotsData);
      mockGetSnapshotStatus.mockReturnValue('live');

      renderHook(() => useSnapshots());

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

      const focusCallback = mockUseFocusEffect.mock.calls[0][0];

      await act(async () => {
        focusCallback();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSnapshots',
        'season-1',
        'subscription-1',
      );
    });
  });

  describe('useInvalidateByRewardEvents integration', () => {
    it('registers invalidation events', () => {
      setupSelectorMocks();
      mockGetSnapshotStatus.mockReturnValue('live');

      renderHook(() => useSnapshots());

      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        ['RewardsController:accountLinked', 'RewardsController:balanceUpdated'],
        expect.any(Function),
      );
    });

    it('passes fetchSnapshots as callback to invalidation hook', async () => {
      setupSelectorMocks();
      const mockSnapshotsData = [createTestSnapshot()];
      mockEngineCall.mockResolvedValueOnce(mockSnapshotsData);
      mockGetSnapshotStatus.mockReturnValue('live');

      renderHook(() => useSnapshots());

      const invalidationCallback =
        mockUseInvalidateByRewardEvents.mock.calls[0][1];

      await act(async () => {
        await invalidationCallback();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSnapshots',
        'season-1',
        'subscription-1',
      );
    });
  });
});
