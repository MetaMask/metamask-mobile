import StorageWrapper from '../../../../store/storage-wrapper';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import {
  SNAPSHOT_MAX_AGE_MS,
  SNAPSHOT_MAX_ROWS,
  buildSnapshotKey,
  hasOrderChanged,
  readSnapshot,
  writeSnapshot,
} from './leaderboardSnapshot';

jest.mock('../../../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockSetItem = jest.mocked(StorageWrapper.setItem);

const KEY_PARTS = { type: 'all', sort: 'pnl', timeframe: '7d' };

const buildTrader = (overrides: Partial<TopTrader> = {}): TopTrader => ({
  id: 'trader-1',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'alpha.eth',
  avatarUri: 'https://example.com/a.png',
  percentageChange: 43,
  pnlValue: 963146.8,
  winRatePercent: 92,
  pnlPerChain: { base: 963146.8 },
  followerCount: 48707,
  isFollowing: false,
  ...overrides,
});

const storedPayload = (traders: TopTrader[], timestamp = Date.now()) =>
  JSON.stringify({
    timestamp,
    traders: traders.map(({ isFollowing: _f, rank: _r, ...rest }) => rest),
  });

describe('leaderboardSnapshot', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('buildSnapshotKey', () => {
    it('scopes the key to type, sort, and timeframe', () => {
      const key = buildSnapshotKey(KEY_PARTS);

      expect(key).toContain('all');
      expect(key).toContain('pnl');
      expect(key).toContain('7d');
    });

    it('gives different rankings different keys', () => {
      expect(buildSnapshotKey(KEY_PARTS)).not.toBe(
        buildSnapshotKey({ ...KEY_PARTS, sort: 'winRate' }),
      );
      expect(buildSnapshotKey(KEY_PARTS)).not.toBe(
        buildSnapshotKey({ ...KEY_PARTS, timeframe: '30d' }),
      );
    });
  });

  describe('readSnapshot', () => {
    it('returns null when nothing is stored', () => {
      mockGetItemSync.mockReturnValue(null);

      expect(readSnapshot(KEY_PARTS)).toBeNull();
    });

    it('returns the stored rows in their persisted order', () => {
      mockGetItemSync.mockReturnValue(
        storedPayload([
          buildTrader({ id: 'a', username: 'a.eth' }),
          buildTrader({ id: 'b', username: 'b.eth' }),
        ]),
      );

      const result = readSnapshot(KEY_PARTS);

      expect(result?.map((t) => t.id)).toEqual(['a', 'b']);
      expect(result?.[0].username).toBe('a.eth');
    });

    it('derives rank from array order rather than trusting disk', () => {
      mockGetItemSync.mockReturnValue(
        storedPayload([
          buildTrader({ id: 'a' }),
          buildTrader({ id: 'b' }),
          buildTrader({ id: 'c' }),
        ]),
      );

      expect(readSnapshot(KEY_PARTS)?.map((t) => t.rank)).toEqual([1, 2, 3]);
    });

    it('never restores a stale follow state', () => {
      mockGetItemSync.mockReturnValue(
        storedPayload([buildTrader({ isFollowing: true })]),
      );

      expect(readSnapshot(KEY_PARTS)?.[0].isFollowing).toBe(false);
    });

    it('discards a snapshot older than the max age', () => {
      mockGetItemSync.mockReturnValue(
        storedPayload([buildTrader()], Date.now() - SNAPSHOT_MAX_AGE_MS - 1),
      );

      expect(readSnapshot(KEY_PARTS)).toBeNull();
    });

    it('keeps a snapshot just inside the max age', () => {
      mockGetItemSync.mockReturnValue(
        storedPayload([buildTrader()], Date.now() - SNAPSHOT_MAX_AGE_MS + 5000),
      );

      expect(readSnapshot(KEY_PARTS)).not.toBeNull();
    });

    it('returns null for malformed JSON rather than throwing', () => {
      mockGetItemSync.mockReturnValue('{not json');

      expect(() => readSnapshot(KEY_PARTS)).not.toThrow();
      expect(readSnapshot(KEY_PARTS)).toBeNull();
    });

    it('returns null when a row is missing required fields', () => {
      mockGetItemSync.mockReturnValue(
        JSON.stringify({
          timestamp: Date.now(),
          traders: [{ id: 'a', username: 'a.eth' }],
        }),
      );

      expect(readSnapshot(KEY_PARTS)).toBeNull();
    });

    it('returns null for an empty stored list', () => {
      mockGetItemSync.mockReturnValue(
        JSON.stringify({ timestamp: Date.now(), traders: [] }),
      );

      expect(readSnapshot(KEY_PARTS)).toBeNull();
    });
  });

  describe('writeSnapshot', () => {
    it('persists rows under the ranking-scoped key', () => {
      writeSnapshot(KEY_PARTS, [buildTrader()]);

      expect(mockSetItem).toHaveBeenCalledWith(
        buildSnapshotKey(KEY_PARTS),
        expect.any(String),
      );
    });

    it('caps how many rows are stored', () => {
      const traders = Array.from({ length: SNAPSHOT_MAX_ROWS + 10 }, (_, i) =>
        buildTrader({ id: `trader-${i}` }),
      );

      writeSnapshot(KEY_PARTS, traders);

      const [, payload] = mockSetItem.mock.calls[0];
      expect(JSON.parse(payload).traders).toHaveLength(SNAPSHOT_MAX_ROWS);
    });

    it('does not persist derived fields', () => {
      writeSnapshot(KEY_PARTS, [buildTrader({ isFollowing: true, rank: 4 })]);

      const [, payload] = mockSetItem.mock.calls[0];
      const [stored] = JSON.parse(payload).traders;
      expect(stored).not.toHaveProperty('isFollowing');
      expect(stored).not.toHaveProperty('rank');
    });

    it('skips an empty list', () => {
      writeSnapshot(KEY_PARTS, []);

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('swallows a write failure so render is never blocked', async () => {
      mockSetItem.mockRejectedValueOnce(new Error('disk full'));

      expect(() => writeSnapshot(KEY_PARTS, [buildTrader()])).not.toThrow();
      await Promise.resolve();
    });

    it('round-trips through readSnapshot', () => {
      writeSnapshot(KEY_PARTS, [
        buildTrader({ id: 'a' }),
        buildTrader({ id: 'b' }),
      ]);
      const [, payload] = mockSetItem.mock.calls[0];
      mockGetItemSync.mockReturnValue(payload);

      expect(readSnapshot(KEY_PARTS)?.map((t) => t.id)).toEqual(['a', 'b']);
    });
  });

  describe('hasOrderChanged', () => {
    it('is false for the same ids in the same order', () => {
      const before = [buildTrader({ id: 'a' }), buildTrader({ id: 'b' })];
      const after = [buildTrader({ id: 'a' }), buildTrader({ id: 'b' })];

      expect(hasOrderChanged(before, after)).toBe(false);
    });

    it('is false when only a value changed but the order held', () => {
      const before = [buildTrader({ id: 'a', pnlValue: 1 })];
      const after = [buildTrader({ id: 'a', pnlValue: 999 })];

      expect(hasOrderChanged(before, after)).toBe(false);
    });

    it('is true when two traders swapped places', () => {
      const before = [buildTrader({ id: 'a' }), buildTrader({ id: 'b' })];
      const after = [buildTrader({ id: 'b' }), buildTrader({ id: 'a' })];

      expect(hasOrderChanged(before, after)).toBe(true);
    });

    it('is false when the snapshot is a matching prefix of the fresh list', () => {
      // The real shape: writeSnapshot caps at SNAPSHOT_MAX_ROWS while the list
      // fetches LEADERBOARD_LIMIT, so these lengths never match in production.
      const before = Array.from({ length: SNAPSHOT_MAX_ROWS }, (_, i) =>
        buildTrader({ id: `t${i}` }),
      );
      const after = Array.from({ length: 50 }, (_, i) =>
        buildTrader({ id: `t${i}` }),
      );

      expect(hasOrderChanged(before, after)).toBe(false);
    });

    it('is true when a remembered row moved inside a longer fresh list', () => {
      const before = [buildTrader({ id: 'a' }), buildTrader({ id: 'b' })];
      const after = [
        buildTrader({ id: 'b' }),
        buildTrader({ id: 'a' }),
        buildTrader({ id: 'c' }),
      ];

      expect(hasOrderChanged(before, after)).toBe(true);
    });

    it('is true when remembered rows dropped out of the fresh list', () => {
      const before = [
        buildTrader({ id: 'a' }),
        buildTrader({ id: 'b' }),
        buildTrader({ id: 'c' }),
      ];
      const after = [buildTrader({ id: 'a' })];

      expect(hasOrderChanged(before, after)).toBe(true);
    });

    it('is false when the list merely grew beneath the remembered rows', () => {
      // A newcomer appearing below everyone the user saw is not a reorder --
      // nothing they remember has moved, so there is nothing to animate.
      const before = [buildTrader({ id: 'a' })];
      const after = [buildTrader({ id: 'a' }), buildTrader({ id: 'b' })];

      expect(hasOrderChanged(before, after)).toBe(false);
    });

    it('is true when a newcomer pushed a remembered row down', () => {
      const before = [buildTrader({ id: 'a' })];
      const after = [buildTrader({ id: 'b' }), buildTrader({ id: 'a' })];

      expect(hasOrderChanged(before, after)).toBe(true);
    });
  });
});
