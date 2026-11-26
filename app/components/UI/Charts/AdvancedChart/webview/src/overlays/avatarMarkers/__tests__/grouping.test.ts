import type { AvatarMarker } from '../../../messages/contract';
import {
  AVATAR_FAN_PX,
  AVATAR_SIZE,
  GROUP_GAP_PX,
  HYSTERESIS_PX,
  MAX_FACES,
  bucketByCandle,
  clampGroupX,
  countBadgeLabel,
  groupKeyOf,
  groupWidthPx,
  mergeOverlappingGroups,
  pickFaces,
  planGroupRender,
  type MarkerLayout,
} from '../grouping';

const MAX_WIDTH = AVATAR_SIZE + (MAX_FACES - 1) * AVATAR_FAN_PX;

let nextId = 0;
const layout = (
  overrides: {
    barIdx?: number;
    x?: number;
    anchorPrice?: number | null;
    time?: number;
    trader?: string;
    id?: string;
  } = {},
): MarkerLayout => {
  const id = overrides.id ?? `m${nextId++}`;
  const marker: AvatarMarker = {
    id,
    time: overrides.time ?? nextId,
    intent: 'enter',
    traderName: overrides.trader ?? `trader-${id}`,
  };
  return {
    marker,
    barIdx: overrides.barIdx ?? 0,
    x: overrides.x ?? 100,
    anchorPrice:
      overrides.anchorPrice === undefined ? 10 : overrides.anchorPrice,
  };
};

/** `n` markers on one candle with distinct traders. */
const candle = (
  barIdx: number,
  x: number,
  n: number,
  high = 10,
): MarkerLayout[] =>
  Array.from({ length: n }, (_, i) =>
    layout({ barIdx, x, anchorPrice: high, time: barIdx * 1000 + i }),
  );

describe('avatar marker grouping', () => {
  beforeEach(() => {
    nextId = 0;
  });

  describe('groupWidthPx', () => {
    it('is fixed once a group reaches MAX_FACES, whatever its size', () => {
      expect(groupWidthPx(1)).toBe(AVATAR_SIZE);
      expect(groupWidthPx(2)).toBe(AVATAR_SIZE + AVATAR_FAN_PX);
      expect(groupWidthPx(3)).toBe(MAX_WIDTH);
      expect(groupWidthPx(100)).toBe(MAX_WIDTH);
    });
  });

  describe('bucketByCandle', () => {
    it('collapses every trade on one candle into a single group', () => {
      const groups = bucketByCandle(candle(5, 200, 100));

      expect(groups).toHaveLength(1);
      expect(groups[0].members).toHaveLength(100);
      expect(groups[0].x).toBe(200);
    });

    it('creates one group per candle, sorted by x, with the max high as anchor', () => {
      const groups = bucketByCandle([
        layout({ barIdx: 2, x: 300, anchorPrice: 5 }),
        layout({ barIdx: 1, x: 100, anchorPrice: 7 }),
        layout({ barIdx: 2, x: 300, anchorPrice: 9 }),
      ]);

      expect(groups.map((g) => g.minBarIdx)).toEqual([1, 2]);
      expect(groups[1].anchorPrice).toBe(9);
    });
  });

  describe('mergeOverlappingGroups', () => {
    it('merges neighbouring candles whose footprints overlap', () => {
      const groups = bucketByCandle([
        ...candle(0, 100, 3, 10),
        ...candle(1, 110, 2, 20),
      ]);

      const merged = mergeOverlappingGroups(groups);

      expect(merged).toHaveLength(1);
      expect(merged[0].members).toHaveLength(5);
      expect(merged[0].x).toBe(105);
      expect(merged[0].anchorPrice).toBe(20);
    });

    it('keeps groups apart once the gap exceeds the threshold (zoomed in)', () => {
      const spacing = MAX_WIDTH + GROUP_GAP_PX + 1;
      const groups = bucketByCandle([
        ...candle(0, 100, 3),
        ...candle(1, 100 + spacing, 3),
      ]);

      expect(mergeOverlappingGroups(groups)).toHaveLength(2);
    });

    it('never splits a single candle regardless of size', () => {
      const merged = mergeOverlappingGroups(bucketByCandle(candle(0, 100, 50)));

      expect(merged).toHaveLength(1);
      expect(merged[0].members).toHaveLength(50);
    });

    it('cascades merges when a merged group then touches its neighbour', () => {
      const groups = bucketByCandle([
        ...candle(0, 100, 3),
        ...candle(1, 140, 3),
        ...candle(2, 180, 3),
      ]);

      expect(mergeOverlappingGroups(groups)).toHaveLength(1);
    });

    it('applies hysteresis: a pair merged last frame needs extra clearance to split', () => {
      // Gap between footprints sits just above GROUP_GAP_PX but below
      // GROUP_GAP_PX + HYSTERESIS_PX.
      const gap = GROUP_GAP_PX + HYSTERESIS_PX / 2;
      const groups = bucketByCandle([
        ...candle(0, 100, 3),
        ...candle(1, 100 + MAX_WIDTH + gap, 3),
      ]);
      const prevKey = groupKeyOf({
        ...groups[0],
        members: [...groups[0].members, ...groups[1].members],
      });

      expect(mergeOverlappingGroups(groups)).toHaveLength(2);
      expect(
        mergeOverlappingGroups(groups, GROUP_GAP_PX, new Set([prevKey])),
      ).toHaveLength(1);
    });
  });

  describe('clampGroupX', () => {
    it('keeps the full footprint inside the plot', () => {
      expect(clampGroupX(5, 60, 300)).toBe(30);
      expect(clampGroupX(295, 60, 300)).toBe(270);
      expect(clampGroupX(150, 60, 300)).toBe(150);
    });
  });

  describe('pickFaces', () => {
    it('returns at most MAX_FACES distinct traders, most recent, in time order', () => {
      const members = [
        layout({ trader: 'a', time: 1 }),
        layout({ trader: 'b', time: 2 }),
        layout({ trader: 'c', time: 3 }),
        layout({ trader: 'd', time: 4 }),
        layout({ trader: 'd', time: 5 }),
      ];

      const faces = pickFaces(members);

      expect(faces.map((f) => f.marker.traderName)).toEqual(['b', 'c', 'd']);
      expect(faces[2].marker.time).toBe(5);
    });

    it('shows a trader once even with several trades', () => {
      const members = [1, 2, 3].map((time) => layout({ trader: 'solo', time }));

      expect(pickFaces(members)).toHaveLength(1);
    });
  });

  describe('countBadgeLabel', () => {
    it('shows the total only when trades outnumber drawn faces', () => {
      expect(countBadgeLabel(3)).toBeNull();
      expect(countBadgeLabel(4)).toBe('4');
      expect(countBadgeLabel(100)).toBe('99+');
      expect(countBadgeLabel(3, 1)).toBe('3');
    });
  });

  describe('planGroupRender', () => {
    it('draws at most 3 faces + a total badge, and taps report all members', () => {
      const groups = mergeOverlappingGroups(
        bucketByCandle(candle(0, 150, 100)),
      );

      const plan = planGroupRender(groups, 400);

      expect(plan.faces).toHaveLength(MAX_FACES);
      expect(plan.badgeByFaceKey.size).toBe(1);
      expect([...plan.badgeByFaceKey.values()]).toEqual(['99+']);
      expect(plan.badgeByFaceKey.has(plan.faces[1].key)).toBe(true);
      const tapped = plan.tapIdsByMarkerId.get(String(plan.faces[0].marker.id));
      expect(tapped).toHaveLength(100);
      expect(plan.tapIdsByMarkerId.size).toBe(100);
    });

    it('fans faces around the clamped center and omits the badge for small groups', () => {
      const groups = bucketByCandle(candle(0, 0, 2));

      const plan = planGroupRender(groups, 400);

      const width = AVATAR_SIZE + AVATAR_FAN_PX;
      expect(plan.faces.map((f) => f.x)).toEqual([
        width / 2 - AVATAR_FAN_PX / 2,
        width / 2 + AVATAR_FAN_PX / 2,
      ]);
      expect(plan.badgeByFaceKey.size).toBe(0);
    });

    it('uses face keys that stay stable when only positions change', () => {
      const a = planGroupRender(bucketByCandle(candle(0, 100, 4)), 400);
      nextId = 0;
      const b = planGroupRender(bucketByCandle(candle(0, 180, 4)), 400);

      expect(a.faces.map((f) => f.key)).toEqual(b.faces.map((f) => f.key));
    });
  });
});
