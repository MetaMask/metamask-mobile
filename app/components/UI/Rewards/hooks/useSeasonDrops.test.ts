import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useSeasonDrops } from './useSeasonDrops';
import Engine from '../../../../core/Engine';
import {
  setSeasonDrops,
  setSeasonDropsLoading,
  setSeasonDropsError,
} from '../../../../reducers/rewards';
import {
  DropStatus,
  SeasonDropDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setSeasonDrops: jest.fn(),
  setSeasonDropsLoading: jest.fn(),
  setSeasonDropsError: jest.fn(),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
}));

describe('useSeasonDrops', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockDispatch = jest.fn();

  const mockSeasonId = 'season-123';
  const mockSubscriptionId = 'sub-456';

  const mockDrops: SeasonDropDto[] = [
    {
      id: 'drop-1',
      status: DropStatus.OPEN,
      opensAt: '2026-02-15T00:00:00Z',
      closesAt: '2026-02-20T00:00:00Z',
    } as SeasonDropDto,
    {
      id: 'drop-2',
      status: DropStatus.UPCOMING,
      opensAt: '2026-02-25T00:00:00Z',
      closesAt: '2026-03-01T00:00:00Z',
    } as SeasonDropDto,
    {
      id: 'drop-3',
      status: DropStatus.CLOSED,
      opensAt: '2026-02-01T00:00:00Z',
      closesAt: '2026-02-10T00:00:00Z',
    } as SeasonDropDto,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    // Default selector returns
    let selectorIndex = 0;
    mockUseSelector.mockImplementation(() => {
      const values = [
        mockSeasonId, // selectSeasonId
        mockSubscriptionId, // selectRewardsSubscriptionId
        null, // selectSeasonDrops
        false, // selectSeasonDropsLoading
        false, // selectSeasonDropsError
        true, // selectDropsRewardsEnabledFlag
      ];
      return values[selectorIndex++];
    });
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useSeasonDrops());

      expect(result.current.drops).toBeNull();
      expect(result.current.categorizedDrops).toEqual({
        active: [],
        upcoming: [],
        previous: [],
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(typeof result.current.fetchDrops).toBe('function');
    });
  });

  describe('fetchDrops function', () => {
    it('should successfully fetch drops', async () => {
      mockEngineCall.mockResolvedValueOnce(mockDrops);
      const { result } = renderHook(() => useSeasonDrops());

      await act(async () => {
        await result.current.fetchDrops();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonDrops',
        mockSeasonId,
        mockSubscriptionId,
      );
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonDropsLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonDrops(mockDrops));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonDropsLoading(false));
    });

    it('should handle fetch error', async () => {
      mockEngineCall.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useSeasonDrops());

      await act(async () => {
        await result.current.fetchDrops();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonDropsError(true));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonDropsLoading(false));
    });

    it('should skip fetch when subscriptionId is missing', async () => {
      let selectorIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [
          mockSeasonId,
          null, // Missing subscriptionId
          null,
          false,
          false,
          true,
        ];
        return values[selectorIndex++];
      });

      const { result } = renderHook(() => useSeasonDrops());

      await act(async () => {
        await result.current.fetchDrops();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonDrops(null));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonDropsLoading(false));
    });

    it('should skip fetch when seasonId is missing', async () => {
      let selectorIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [
          null, // Missing seasonId
          mockSubscriptionId,
          null,
          false,
          false,
          true,
        ];
        return values[selectorIndex++];
      });

      const { result } = renderHook(() => useSeasonDrops());

      await act(async () => {
        await result.current.fetchDrops();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should skip fetch when drops feature is disabled', async () => {
      let selectorIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [
          mockSeasonId,
          mockSubscriptionId,
          null,
          false,
          false,
          false, // isDropsEnabled = false
        ];
        return values[selectorIndex++];
      });

      const { result } = renderHook(() => useSeasonDrops());

      await act(async () => {
        await result.current.fetchDrops();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
    });
  });

  describe('categorizedDrops', () => {
    it('should categorize drops correctly', () => {
      let selectorIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [
          mockSeasonId,
          mockSubscriptionId,
          mockDrops, // selectSeasonDrops returns data
          false,
          false,
          true,
        ];
        return values[selectorIndex++];
      });

      const { result } = renderHook(() => useSeasonDrops());

      expect(result.current.categorizedDrops.active).toHaveLength(1);
      expect(result.current.categorizedDrops.active[0].id).toBe('drop-1');
      expect(result.current.categorizedDrops.upcoming).toHaveLength(1);
      expect(result.current.categorizedDrops.upcoming[0].id).toBe('drop-2');
      expect(result.current.categorizedDrops.previous).toHaveLength(1);
      expect(result.current.categorizedDrops.previous[0].id).toBe('drop-3');
    });

    it('should sort upcoming drops by opensAt', () => {
      const unsortedDrops = [
        {
          id: 'drop-2',
          status: DropStatus.UPCOMING,
          opensAt: '2026-03-01T00:00:00Z',
          closesAt: '2026-03-05T00:00:00Z',
        },
        {
          id: 'drop-1',
          status: DropStatus.UPCOMING,
          opensAt: '2026-02-25T00:00:00Z',
          closesAt: '2026-03-01T00:00:00Z',
        },
      ];

      let selectorIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [
          mockSeasonId,
          mockSubscriptionId,
          unsortedDrops,
          false,
          false,
          true,
        ];
        return values[selectorIndex++];
      });

      const { result } = renderHook(() => useSeasonDrops());

      expect(result.current.categorizedDrops.upcoming[0].id).toBe('drop-1');
      expect(result.current.categorizedDrops.upcoming[1].id).toBe('drop-2');
    });

    it('should sort previous drops by closesAt descending', () => {
      const previousDrops = [
        {
          id: 'drop-1',
          status: DropStatus.CLOSED,
          opensAt: '2026-01-01T00:00:00Z',
          closesAt: '2026-01-10T00:00:00Z',
        },
        {
          id: 'drop-2',
          status: DropStatus.CLOSED,
          opensAt: '2026-02-01T00:00:00Z',
          closesAt: '2026-02-10T00:00:00Z',
        },
      ];

      let selectorIndex = 0;
      mockUseSelector.mockImplementation(() => {
        const values = [
          mockSeasonId,
          mockSubscriptionId,
          previousDrops,
          false,
          false,
          true,
        ];
        return values[selectorIndex++];
      });

      const { result } = renderHook(() => useSeasonDrops());

      expect(result.current.categorizedDrops.previous[0].id).toBe('drop-2');
      expect(result.current.categorizedDrops.previous[1].id).toBe('drop-1');
    });
  });
});
