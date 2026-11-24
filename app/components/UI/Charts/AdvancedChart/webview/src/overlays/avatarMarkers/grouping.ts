// Pure (chart/DOM-independent) grouping helpers for the follower avatar
// overlay — ASSETS-4102. Kept separate from index.ts so they can be unit-tested
// directly.
//
// Rule set:
// - The smallest group is ONE candle: every marker snapped to the same bar
//   joins the same group, so zooming in never splits a single candle.
// - A group always draws at a fixed width: at most MAX_FACES overlapping faces
//   (+ a count badge when it holds more), independent of how many trades it has.
// - Adjacent groups whose drawn footprints would overlap are merged left to
//   right; as the user zooms in (bars spread apart) multi-candle groups split.
//   A small hysteresis keeps a pair merged until it clearly separates, so the
//   grouping doesn't flicker at the threshold during a pinch.

import type { AvatarMarker } from '../../messages/contract';
import type { AvatarCluster } from './state';

/** Avatar circle diameter (px). */
export const AVATAR_SIZE = 28;
/** Horizontal step (px) between overlapping faces in a group (~40% overlap). */
export const AVATAR_FAN_PX = Math.round(AVATAR_SIZE * 0.6);
/** Max faces drawn per group; the rest are represented by the count badge. */
export const MAX_FACES = 3;
/** Minimum gap (px) kept between two drawn groups before they merge. */
export const GROUP_GAP_PX = 4;
/** Extra gap (px) a previously-merged pair needs before it is allowed to split. */
export const HYSTERESIS_PX = 4;

/** Per-marker on-screen layout, resolved once per positioning pass. */
export interface MarkerLayout {
  marker: AvatarMarker;
  /** Index of the bar the marker snaps to. */
  barIdx: number;
  /** Center X of the marker's candle, in overlay px. */
  x: number;
  /** Y anchor price (candle high), or null when unavailable. */
  anchorPrice: number | null;
}

/** A rendered group: one or more adjacent candles' worth of markers. */
export interface MarkerGroup {
  /** All markers in the group, ascending by time. */
  members: MarkerLayout[];
  /** Center X of the drawn group, in overlay px. */
  x: number;
  /** Topmost candle high across the group's candles (null if none known). */
  anchorPrice: number | null;
  /** Leftmost / rightmost bar index covered by the group. */
  minBarIdx: number;
  maxBarIdx: number;
  /** Center X of the leftmost / rightmost candle (used to re-center on merge). */
  minX: number;
  maxX: number;
}

/** Stable marker id as a string. */
export function markerIdOf(layout: MarkerLayout): string {
  return String(layout.marker.id);
}

/** Number of faces actually drawn for a group of `n` markers. */
export function faceCount(n: number): number {
  return Math.max(0, Math.min(n, MAX_FACES));
}

/** Fixed on-screen width (px) of a group of `n` markers. */
export function groupWidthPx(n: number): number {
  const faces = faceCount(n);
  if (faces === 0) return 0;
  return AVATAR_SIZE + (faces - 1) * AVATAR_FAN_PX;
}

function maxAnchor(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function byTimeThenId(a: MarkerLayout, b: MarkerLayout): number {
  if (a.marker.time !== b.marker.time) return a.marker.time - b.marker.time;
  const ia = markerIdOf(a);
  const ib = markerIdOf(b);
  if (ia === ib) return 0;
  return ia < ib ? -1 : 1;
}

/**
 * Buckets layouts by candle (`barIdx`): one group per bar with at least one
 * marker, sorted ascending by X.
 */
export function bucketByCandle(
  layouts: readonly MarkerLayout[],
): MarkerGroup[] {
  const byBar = new Map<number, MarkerGroup>();
  for (const layout of layouts) {
    const existing = byBar.get(layout.barIdx);
    if (existing) {
      existing.members.push(layout);
      existing.anchorPrice = maxAnchor(
        existing.anchorPrice,
        layout.anchorPrice,
      );
      continue;
    }
    byBar.set(layout.barIdx, {
      members: [layout],
      x: layout.x,
      anchorPrice: layout.anchorPrice,
      minBarIdx: layout.barIdx,
      maxBarIdx: layout.barIdx,
      minX: layout.x,
      maxX: layout.x,
    });
  }
  const groups = Array.from(byBar.values());
  for (const g of groups) g.members.sort(byTimeThenId);
  groups.sort((a, b) => a.x - b.x);
  return groups;
}

/** Stable group identity: sorted, joined member ids. */
export function groupKeyOf(group: MarkerGroup): string {
  return group.members.map(markerIdOf).sort().join('|');
}

function mergeTwo(a: MarkerGroup, b: MarkerGroup): MarkerGroup {
  const minX = Math.min(a.minX, b.minX);
  const maxX = Math.max(a.maxX, b.maxX);
  return {
    members: a.members.concat(b.members).sort(byTimeThenId),
    x: (minX + maxX) / 2,
    anchorPrice: maxAnchor(a.anchorPrice, b.anchorPrice),
    minBarIdx: Math.min(a.minBarIdx, b.minBarIdx),
    maxBarIdx: Math.max(a.maxBarIdx, b.maxBarIdx),
    minX,
    maxX,
  };
}

/**
 * Merges X-sorted groups whose fixed-width footprints would overlap (closer
 * than `gapPx`), left to right, repeating until stable (a merge re-centers and
 * can widen a group, which may then touch its neighbour).
 *
 * `prevMergedKeys` holds the group keys rendered last frame. Two groups whose
 * members all belonged to one previous group need `gapPx + hysteresisPx` of
 * clearance before splitting, which prevents flicker at the threshold.
 */
export function mergeOverlappingGroups(
  groups: readonly MarkerGroup[],
  gapPx: number = GROUP_GAP_PX,
  prevMergedKeys: ReadonlySet<string> = new Set(),
  hysteresisPx: number = HYSTERESIS_PX,
): MarkerGroup[] {
  // markerId -> previous group key, to detect "was merged last frame".
  const prevGroupOf = new Map<string, string>();
  for (const key of prevMergedKeys) {
    for (const id of key.split('|')) prevGroupOf.set(id, key);
  }
  const wereTogether = (a: MarkerGroup, b: MarkerGroup): boolean => {
    const ka = prevGroupOf.get(markerIdOf(a.members[0]));
    if (!ka) return false;
    return ka === prevGroupOf.get(markerIdOf(b.members[0]));
  };

  let current = groups.slice().sort((a, b) => a.x - b.x);
  let changed = true;
  while (changed && current.length > 1) {
    changed = false;
    const next: MarkerGroup[] = [];
    for (const group of current) {
      const prev = next[next.length - 1];
      if (!prev) {
        next.push(group);
        continue;
      }
      const prevRight = prev.x + groupWidthPx(prev.members.length) / 2;
      const left = group.x - groupWidthPx(group.members.length) / 2;
      const required = gapPx + (wereTogether(prev, group) ? hysteresisPx : 0);
      if (left - prevRight < required) {
        next[next.length - 1] = mergeTwo(prev, group);
        changed = true;
      } else {
        next.push(group);
      }
    }
    current = next.sort((a, b) => a.x - b.x);
  }
  return current;
}

/** Clamps a group's center so its full footprint stays inside the plot. */
export function clampGroupX(
  x: number,
  width: number,
  plotWidth: number,
): number {
  const half = width / 2;
  if (plotWidth <= width) return plotWidth / 2;
  return Math.min(Math.max(x, half), plotWidth - half);
}

function traderKeyOf(marker: AvatarMarker): string {
  return marker.traderName ?? marker.avatarUrl ?? `id:${String(marker.id)}`;
}

/**
 * Picks up to `max` faces for a group: the most recent marker of each distinct
 * trader, newest traders first, returned in ascending time order (left = older).
 * Distinct traders only: a trader with several trades in the group shows once
 * (the count badge accounts for the rest).
 */
export function pickFaces(
  members: readonly MarkerLayout[],
  max: number = MAX_FACES,
): MarkerLayout[] {
  const picked: MarkerLayout[] = [];
  const seen = new Set<string>();
  for (let i = members.length - 1; i >= 0 && picked.length < max; i--) {
    const key = traderKeyOf(members[i].marker);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(members[i]);
  }
  return picked.sort(byTimeThenId);
}

/**
 * Badge label (total trade count) for a group of `n` markers drawn with
 * `facesShown` faces; null when every trade already has a visible face. With
 * distinct-trader faces this is normally `n > MAX_FACES`, but it also covers a
 * single trader with several trades (1 face, n > 1).
 */
export function countBadgeLabel(
  n: number,
  facesShown: number = faceCount(n),
): string | null {
  if (n <= facesShown) return null;
  return n > 99 ? '99+' : String(n);
}

/** Everything the DOM layer needs to draw one frame of grouped markers. */
export interface GroupRenderPlan {
  /** One entry per drawn face (at most MAX_FACES per group). `y` = anchor price. */
  faces: AvatarCluster[];
  /** Face key -> count label, for the single face per group carrying the disc. */
  badgeByFaceKey: Map<string, string>;
  /** markerId -> every member id of its group (what a tap reports). */
  tapIdsByMarkerId: Map<string, string[]>;
  /** Keys of the groups in this frame (fed back for merge hysteresis). */
  groupKeys: Set<string>;
}

/**
 * Turns merged groups into drawable faces: picks up to MAX_FACES distinct-trader
 * faces per group, fans them around the (plot-clamped) group center, and records
 * the count label and tap membership. Face keys are `g:<groupKey>:<slot>`, so a
 * key only changes when the group's membership changes (merge/split/new data),
 * never on a pure reposition frame.
 */
export function planGroupRender(
  groups: readonly MarkerGroup[],
  plotWidth: number,
): GroupRenderPlan {
  const faces: AvatarCluster[] = [];
  const badgeByFaceKey = new Map<string, string>();
  const tapIdsByMarkerId = new Map<string, string[]>();
  const groupKeys = new Set<string>();

  for (const group of groups) {
    if (!group.members.length) continue;
    const key = groupKeyOf(group);
    groupKeys.add(key);
    const ids = key.split('|');
    for (const member of group.members) {
      tapIdsByMarkerId.set(markerIdOf(member), ids);
    }

    const picked = pickFaces(group.members);
    const width = groupWidthPx(picked.length);
    const cx = clampGroupX(group.x, width, plotWidth);
    const mid = (picked.length - 1) / 2;
    picked.forEach((face, slot) => {
      faces.push({
        key: `g:${key}:${slot}`,
        marker: face.marker,
        x: cx + (slot - mid) * AVATAR_FAN_PX,
        y: group.anchorPrice,
      });
    });

    const label = countBadgeLabel(group.members.length, picked.length);
    if (label) badgeByFaceKey.set(`g:${key}:${Math.floor(mid)}`, label);
  }

  return { faces, badgeByFaceKey, tapIdsByMarkerId, groupKeys };
}
