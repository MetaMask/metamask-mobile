import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useGameDetailsTabs } from './useGameDetailsTabs';
import type { PredictPosition } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUseSelector = useSelector as jest.Mock;

const createMockPosition = (id = 'pos-1'): PredictPosition =>
  ({ id }) as PredictPosition;

const defaultParams = {
  activePositions: [] as PredictPosition[],
  claimablePositions: [] as PredictPosition[],
  league: 'nba' as const,
};

describe('useGameDetailsTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enabled (league in flag)', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba', 'ucl']);
    });

    it('returns enabled true when league is in extendedSportsMarketsLeagues', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, league: 'nba' }),
      );

      expect(result.current.enabled).toBe(true);
    });

    it('returns enabled false when league is not in extendedSportsMarketsLeagues', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, league: 'nfl' }),
      );

      expect(result.current.enabled).toBe(false);
    });

    it('returns enabled false when league is undefined', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, league: undefined }),
      );

      expect(result.current.enabled).toBe(false);
    });
  });

  describe('disabled (empty flag)', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue([]);
    });

    it('returns enabled false', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.enabled).toBe(false);
    });

    it('returns showTabBar false even with positions', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({
          ...defaultParams,
          activePositions: [createMockPosition()],
        }),
      );

      expect(result.current.showTabBar).toBe(false);
    });

    it('defaults activeTab to 0', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.activeTab).toBe(0);
    });
  });

  describe('tabs computation', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('includes only Outcomes tab when no positions exist', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.tabs).toEqual([
        { label: 'predict.tabs.outcomes', key: 'outcomes' },
      ]);
    });

    it('includes Positions and Outcomes tabs when active positions exist', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({
          ...defaultParams,
          activePositions: [createMockPosition()],
        }),
      );

      expect(result.current.tabs).toEqual([
        { label: 'predict.tabs.positions', key: 'positions' },
        { label: 'predict.tabs.outcomes', key: 'outcomes' },
      ]);
    });

    it('includes Positions tab when only claimable positions exist', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({
          ...defaultParams,
          claimablePositions: [createMockPosition()],
        }),
      );

      expect(result.current.tabs).toEqual([
        { label: 'predict.tabs.positions', key: 'positions' },
        { label: 'predict.tabs.outcomes', key: 'outcomes' },
      ]);
    });
  });

  describe('default tab selection (enabled)', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('defaults activeTab to 0', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.activeTab).toBe(0);
    });

    it('preserves activeTab when tabs change', () => {
      const { result, rerender } = renderHook(
        (props) => useGameDetailsTabs(props),
        {
          initialProps: {
            ...defaultParams,
            activePositions: [createMockPosition()],
          },
        },
      );

      act(() => {
        result.current.handleTabPress(1);
      });
      expect(result.current.activeTab).toBe(1);

      rerender({ ...defaultParams, activePositions: [] });
      expect(result.current.activeTab).toBe(1);
    });
  });

  describe('handleTabPress', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('updates activeTab when tab is pressed', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({
          ...defaultParams,
          activePositions: [createMockPosition()],
        }),
      );

      act(() => {
        result.current.handleTabPress(1);
      });

      expect(result.current.activeTab).toBe(1);
    });
  });

  describe('showTabBar', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('returns false when no positions exist', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.showTabBar).toBe(false);
    });

    it('returns true when active positions exist', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({
          ...defaultParams,
          activePositions: [createMockPosition()],
        }),
      );

      expect(result.current.showTabBar).toBe(true);
    });

    it('returns true when claimable positions exist', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({
          ...defaultParams,
          claimablePositions: [createMockPosition()],
        }),
      );

      expect(result.current.showTabBar).toBe(true);
    });
  });
});
