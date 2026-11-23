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

  it('skips the dwell when a capped snapshot still matches the fresh order', () => {
    jest.useFakeTimers();
    try {
      // Production shape: the snapshot is capped well below the page the list
      // fetches, so the lengths differ even when nothing has moved.
      const remembered = Array.from({ length: 25 }, (_, i) =>
        buildTrader(`t${i}`, i + 1),
      );
      const fresh = Array.from({ length: 50 }, (_, i) =>
        buildTrader(`t${i}`, i + 1),
      );
      mockReadSnapshot.mockReturnValue(remembered);

      const { result, rerender } = renderReveal();
      rerender({
        freshTraders: fresh,
        hasFetched: true,
        keyParts: KEY_PARTS,
        enabled: true,
        hydrateRow,
      });

      // Nothing moved, so the full list should be on screen straight away
      // rather than sitting behind a pointless 400ms wait.
      expect(result.current.isShowingSnapshot).toBe(false);
      expect(result.current.rows).toHaveLength(50);
    } finally {
      jest.useRealTimers();
    }
  });

  it('still dwells when a capped snapshot shows real movement', () => {
    jest.useFakeTimers();
    try {
      const remembered = Array.from({ length: 25 }, (_, i) =>
        buildTrader(`t${i}`, i + 1),
      );
      const fresh = Array.from({ length: 50 }, (_, i) =>
        buildTrader(`t${i}`, i + 1),
      );
      // Top two traders trade places.
      [fresh[0], fresh[1]] = [fresh[1], fresh[0]];
      mockReadSnapshot.mockReturnValue(remembered);

      const { result, rerender } = renderReveal();
      rerender({
        freshTraders: fresh,
        hasFetched: true,
        keyParts: KEY_PARTS,
        enabled: true,
        hydrateRow,
      });

      expect(result.current.isShowingSnapshot).toBe(true);

      act(() => {
        jest.advanceTimersByTime(REVEAL_DWELL_MS);
      });

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

  it('passes fresh rows straight through after a sort change', () => {
    jest.useFakeTimers();
    try {
      mockReadSnapshot.mockReturnValue([buildTrader('a', 1)]);
      const { result, rerender } = renderReveal();
      expect(result.current.isShowingSnapshot).toBe(true);

      // The user asked for a different ranking, so its result must not be held
      // back behind a stored order for the ranking they just left.
      const fresh = [buildTrader('z', 1)];
      rerender({
        freshTraders: fresh,
        hasFetched: true,
        keyParts: { ...KEY_PARTS, sort: 'winRate' },
        enabled: true,
        hydrateRow,
      });

      expect(result.current.isShowingSnapshot).toBe(false);
      expect(result.current.rows).toEqual(fresh);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not re-read a snapshot for the newly chosen ranking', () => {
    mockReadSnapshot.mockReturnValue([buildTrader('a', 1)]);
    const { rerender } = renderReveal();
    expect(mockReadSnapshot).toHaveBeenCalledTimes(1);

    rerender({
      freshTraders: [buildTrader('z', 1)],
      hasFetched: true,
      keyParts: { ...KEY_PARTS, timeframe: '30d' },
      enabled: true,
      hydrateRow,
    });

    // Timeframe is remapped in place with no refetch, so the correct order is
    // already on screen; reading a stored one could only move it backwards.
    expect(mockReadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps persisting under the ranking the user switched to', () => {
    mockReadSnapshot.mockReturnValue([buildTrader('a', 1)]);
    const { rerender } = renderReveal();

    const fresh = [buildTrader('z', 1)];
    const nextKeyParts = { ...KEY_PARTS, sort: 'winRate' };
    rerender({
      freshTraders: fresh,
      hasFetched: true,
      keyParts: nextKeyParts,
      enabled: true,
      hydrateRow,
    });

    expect(mockWriteSnapshot).toHaveBeenCalledWith(nextKeyParts, fresh);
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
