import { renderHook, act } from '@testing-library/react-native';
import { useGameDetailsTabs } from './useGameDetailsTabs';
import { usePredictPositions } from '../../../hooks/usePredictPositions';

jest.mock('../../../hooks/usePredictPositions');
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUsePredictPositions = usePredictPositions as jest.Mock;

const setupPositionsMock = ({
  activePositions = [],
  claimablePositions = [],
}: {
  activePositions?: { id: string }[];
  claimablePositions?: { id: string }[];
} = {}) => {
  mockUsePredictPositions.mockImplementation(
    (opts: { claimable: boolean }) => ({
      data: opts.claimable ? claimablePositions : activePositions,
    }),
  );
};

describe('useGameDetailsTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupPositionsMock();
  });

  describe('tabs computation', () => {
    it('includes only Outcomes tab when no positions exist', () => {
      setupPositionsMock();

      const { result } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      expect(result.current.tabs).toEqual([
        { label: 'predict.tabs.outcomes', key: 'outcomes' },
      ]);
    });

    it('includes Positions and Outcomes tabs when active positions exist', () => {
      setupPositionsMock({ activePositions: [{ id: 'pos-1' }] });

      const { result } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      expect(result.current.tabs).toEqual([
        { label: 'predict.tabs.positions', key: 'positions' },
        { label: 'predict.tabs.outcomes', key: 'outcomes' },
      ]);
    });

    it('includes Positions tab when only claimable positions exist', () => {
      setupPositionsMock({ claimablePositions: [{ id: 'pos-1' }] });

      const { result } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      expect(result.current.tabs).toEqual([
        { label: 'predict.tabs.positions', key: 'positions' },
        { label: 'predict.tabs.outcomes', key: 'outcomes' },
      ]);
    });
  });

  describe('default tab selection', () => {
    it('defaults activeTab to 0 on first render', () => {
      setupPositionsMock();

      const { result } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      expect(result.current.activeTab).toBe(0);
    });

    it('resets activeTab to 0 when it exceeds tabs length', () => {
      setupPositionsMock({ activePositions: [{ id: 'pos-1' }] });

      const { result, rerender } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      act(() => {
        result.current.handleTabPress(1);
      });

      expect(result.current.activeTab).toBe(1);

      setupPositionsMock();
      rerender({});

      expect(result.current.activeTab).toBe(0);
    });
  });

  describe('handleTabPress', () => {
    it('updates activeTab when tab is pressed', () => {
      setupPositionsMock({ activePositions: [{ id: 'pos-1' }] });

      const { result } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      act(() => {
        result.current.handleTabPress(1);
      });

      expect(result.current.activeTab).toBe(1);
    });
  });

  describe('stickyHeaderIndices', () => {
    it('returns [2] when enabled', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      expect(result.current.stickyHeaderIndices).toEqual([2]);
    });
  });

  describe('enabled flag', () => {
    it('returns enabled as true', () => {
      const { result } = renderHook(() =>
        useGameDetailsTabs({ marketId: 'market-1' }),
      );

      expect(result.current.enabled).toBe(true);
    });
  });

  describe('position fetching', () => {
    it('calls usePredictPositions with correct params', () => {
      renderHook(() => useGameDetailsTabs({ marketId: 'market-42' }));

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'market-42',
        claimable: false,
        enabled: true,
      });
      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        marketId: 'market-42',
        claimable: true,
        enabled: true,
      });
    });
  });
});
