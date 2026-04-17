import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useGameDetailsTabs } from './useGameDetailsTabs';
import type { PredictOutcomeGroup, PredictPosition } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUseSelector = useSelector as jest.Mock;

const createMockPosition = (id = 'pos-1'): PredictPosition =>
  ({ id }) as PredictPosition;

const createGroup = (key: string): PredictOutcomeGroup => ({
  key,
  outcomes: [],
});

const defaultParams = {
  activePositions: [] as PredictPosition[],
  claimablePositions: [] as PredictPosition[],
  league: 'nba' as const,
  outcomeGroups: [] as PredictOutcomeGroup[],
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

  describe('groupMap', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('returns a Map keyed by group key', () => {
      const groups = [createGroup('game_lines'), createGroup('touchdowns')];

      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, outcomeGroups: groups }),
      );

      expect(result.current.groupMap).toBeInstanceOf(Map);
      expect(result.current.groupMap.size).toBe(2);
      expect(result.current.groupMap.get('game_lines')).toBe(groups[0]);
      expect(result.current.groupMap.get('touchdowns')).toBe(groups[1]);
    });

    it('returns empty Map when no outcomeGroups', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.groupMap.size).toBe(0);
    });
  });

  describe('chips', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('returns chip items derived from outcomeGroups', () => {
      const groups = [createGroup('game_lines'), createGroup('touchdowns')];

      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, outcomeGroups: groups }),
      );

      expect(result.current.chips).toEqual([
        { key: 'game_lines', label: 'Game Lines' },
        { key: 'touchdowns', label: 'Touchdowns' },
      ]);
    });

    it('returns empty array when no outcomeGroups', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.chips).toEqual([]);
    });
  });

  describe('activeChipKey', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('initializes to first group key', () => {
      const groups = [createGroup('game_lines'), createGroup('touchdowns')];

      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, outcomeGroups: groups }),
      );

      expect(result.current.activeChipKey).toBe('game_lines');
    });

    it('initializes to empty string when no groups', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.activeChipKey).toBe('');
    });

    it('updates when handleChipSelect is called', () => {
      const groups = [createGroup('game_lines'), createGroup('touchdowns')];

      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, outcomeGroups: groups }),
      );

      act(() => {
        result.current.handleChipSelect('touchdowns');
      });

      expect(result.current.activeChipKey).toBe('touchdowns');
    });

    it('resets to first group key when selected key no longer exists', () => {
      const initialGroups = [
        createGroup('game_lines'),
        createGroup('touchdowns'),
      ];

      const { result, rerender } = renderHook(
        (props) => useGameDetailsTabs(props),
        { initialProps: { ...defaultParams, outcomeGroups: initialGroups } },
      );

      act(() => {
        result.current.handleChipSelect('touchdowns');
      });
      expect(result.current.activeChipKey).toBe('touchdowns');

      rerender({
        ...defaultParams,
        outcomeGroups: [createGroup('game_lines')],
      });

      expect(result.current.activeChipKey).toBe('game_lines');
    });

    it('preserves activeChipKey when key still exists after rerender', () => {
      const groups = [createGroup('game_lines'), createGroup('touchdowns')];

      const { result, rerender } = renderHook(
        (props) => useGameDetailsTabs(props),
        { initialProps: { ...defaultParams, outcomeGroups: groups } },
      );

      act(() => {
        result.current.handleChipSelect('touchdowns');
      });
      expect(result.current.activeChipKey).toBe('touchdowns');

      rerender({
        ...defaultParams,
        outcomeGroups: [createGroup('game_lines'), createGroup('touchdowns')],
      });

      expect(result.current.activeChipKey).toBe('touchdowns');
    });
  });

  describe('showChips', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(['nba']);
    });

    it('returns true when enabled with chips and outcomes visible', () => {
      const groups = [createGroup('game_lines')];

      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, outcomeGroups: groups }),
      );

      expect(result.current.showChips).toBe(true);
    });

    it('returns false when no outcomeGroups', () => {
      const { result } = renderHook(() => useGameDetailsTabs(defaultParams));

      expect(result.current.showChips).toBe(false);
    });

    it('returns false when disabled', () => {
      mockUseSelector.mockReturnValue([]);
      const groups = [createGroup('game_lines')];

      const { result } = renderHook(() =>
        useGameDetailsTabs({ ...defaultParams, outcomeGroups: groups }),
      );

      expect(result.current.showChips).toBe(false);
    });
  });
});
