import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';
import { readSnapshot, writeSnapshot } from '../leaderboardSnapshot';
import { REVEAL_DWELL_MS, useLeaderboardReveal } from './useLeaderboardReveal';

jest.mock('react-native-reanimated', () => ({
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('../leaderboardSnapshot', () => ({
  readSnapshot: jest.fn(),
  writeSnapshot: jest.fn(),
  hasOrderChanged: jest.requireActual('../leaderboardSnapshot').hasOrderChanged,
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const mockReadSnapshot = jest.mocked(readSnapshot);
const mockWriteSnapshot = jest.mocked(writeSnapshot);

const KEY_PARTS = { type: 'all', sort: 'pnl', timeframe: '7d' };

const buildTrader = (id: string, rank: number): TopTrader => ({
  id,
  address: `0x${id}`,
  rank,
  overallRank: rank,
  username: `${id}.eth`,
  percentageChange: 10,
  pnlValue: 100,
  winRatePercent: 50,
  pnlPerChain: {},
  followerCount: 10,
  isFollowing: false,
});

const hydrateRow = (trader: TopTrader) => trader;

const renderReveal = (
  overrides: Partial<Parameters<typeof useLeaderboardReveal>[0]> = {},
) =>
  renderHook((props) => useLeaderboardReveal(props), {
    initialProps: {
      freshTraders: [] as TopTrader[],
      hasFetched: false,
      keyParts: KEY_PARTS,
      enabled: true,
      hydrateRow,
      ...overrides,
    },
  });

describe('useLeaderboardReveal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
    mockReadSnapshot.mockReturnValue(null);
  });

  it('falls through to fresh rows when there is no snapshot', () => {
    const fresh = [buildTrader('a', 1)];
    const { result } = renderReveal({ freshTraders: fresh, hasFetched: true });

    expect(result.current.rows).toEqual(fresh);
    expect(result.current.isShowingSnapshot).toBe(false);
  });

  it('renders the snapshot before the query has answered', () => {
    mockReadSnapshot.mockReturnValue([
      buildTrader('a', 1),
      buildTrader('b', 2),
    ]);

    const { result } = renderReveal();

    expect(result.current.rows.map((t) => t.id)).toEqual(['a', 'b']);
    expect(result.current.isShowingSnapshot).toBe(true);
  });

  it('does not read a snapshot when disabled', () => {
    renderReveal({ enabled: false });

    expect(mockReadSnapshot).not.toHaveBeenCalled();
  });

  it('holds the snapshot for the dwell before revealing fresh rows', () => {
    jest.useFakeTimers();
    try {
      mockReadSnapshot.mockReturnValue([
        buildTrader('a', 1),
        buildTrader('b', 2),
      ]);
      const fresh = [buildTrader('b', 1), buildTrader('a', 2)];

      const { result, rerender } = renderReveal();
      rerender({
        freshTraders: fresh,
        hasFetched: true,
        keyParts: KEY_PARTS,
        enabled: true,
        hydrateRow,
      });

      // Still the remembered order, so the slide has somewhere to start.
      expect(result.current.rows.map((t) => t.id)).toEqual(['a', 'b']);

      act(() => {
        jest.advanceTimersByTime(REVEAL_DWELL_MS);
      });

      expect(result.current.rows.map((t) => t.id)).toEqual(['b', 'a']);
      expect(result.current.isShowingSnapshot).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('swaps immediately when the order did not change', () => {
    jest.useFakeTimers();
    try {
      mockReadSnapshot.mockReturnValue([
        buildTrader('a', 1),
        buildTrader('b', 2),
      ]);
      const fresh = [buildTrader('a', 1), buildTrader('b', 2)];

      const { result, rerender } = renderReveal();
      rerender({
        freshTraders: fresh,
        hasFetched: true,
        keyParts: KEY_PARTS,
        enabled: true,
        hydrateRow,
      });

      // No dwell needed: nothing moved, so there is nothing to animate.
      expect(result.current.isShowingSnapshot).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('skips the dwell entirely under Reduce Motion', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const fresh = [buildTrader('b', 1)];

    const { result, rerender } = renderReveal();
    rerender({
      freshTraders: fresh,
      hasFetched: true,
      keyParts: KEY_PARTS,
      enabled: true,
      hydrateRow,
    });

    expect(mockReadSnapshot).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual(fresh);
  });

  it('persists the fresh rows once they are on screen', () => {
    const fresh = [buildTrader('a', 1)];

    renderReveal({ freshTraders: fresh, hasFetched: true });

    expect(mockWriteSnapshot).toHaveBeenCalledWith(KEY_PARTS, fresh);
  });

  it('does not overwrite the snapshot while it is still showing', () => {
    mockReadSnapshot.mockReturnValue([buildTrader('a', 1)]);

    renderReveal();

    expect(mockWriteSnapshot).not.toHaveBeenCalled();
  });

  it('does not persist when disabled', () => {
    renderReveal({
      freshTraders: [buildTrader('a', 1)],
      hasFetched: true,
      enabled: false,
    });

    expect(mockWriteSnapshot).not.toHaveBeenCalled();
  });

  it('re-reads the snapshot when the ranking changes', () => {
    mockReadSnapshot.mockReturnValue([buildTrader('a', 1)]);
    const { rerender } = renderReveal();
    expect(mockReadSnapshot).toHaveBeenCalledTimes(1);

    rerender({
      freshTraders: [],
      hasFetched: false,
      keyParts: { ...KEY_PARTS, sort: 'winRate' },
      enabled: true,
      hydrateRow,
    });

    expect(mockReadSnapshot).toHaveBeenLastCalledWith({
      ...KEY_PARTS,
      sort: 'winRate',
    });
  });

  it('reveals without waiting when the query returns nothing', () => {
    mockReadSnapshot.mockReturnValue([buildTrader('a', 1)]);

    const { result, rerender } = renderReveal();
    rerender({
      freshTraders: [],
      hasFetched: true,
      keyParts: KEY_PARTS,
      enabled: true,
      hydrateRow,
    });

    expect(result.current.isShowingSnapshot).toBe(false);
  });
});
