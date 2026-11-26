// Module-local state for the avatar DOM overlay (no window.* globals).

import type { AvatarMarker } from '../../messages/contract';

/**
 * One drawn face of a marker group: a single trader's avatar + its buy/sell
 * badge. Markers are grouped per candle (merged further when groups overlap on
 * screen) and each group draws at most MAX_FACES faces — see grouping.ts. Tap
 * membership (all n group members) is tracked separately in index.ts
 * (`tapGroupByMarkerId`), not by this structure.
 */
export interface AvatarCluster {
  /** Stable per-face identity, `g:<groupKey>:<slot>`. */
  key: string;
  /** The marker whose avatar this face draws. */
  marker: AvatarMarker;
  /** Center X in overlay px (null when not currently visible). */
  x: number | null;
  /**
   * Anchor PRICE (the group's topmost candle high) until positioning converts
   * it to a pixel Y; null when unknown.
   */
  y: number | null;
}

/** Avatar url key -> resolved `data:` URI, sent once by RN per update. */
export type AvatarImageTable = Record<string, string>;

let markers: AvatarMarker[] | null = null;
let avatarImages: AvatarImageTable = {};
/** Face key -> its DOM wrapper element currently in the overlay container. */
const elementsByClusterKey = new Map<string, HTMLDivElement>();

export function getAvatarMarkers(): AvatarMarker[] | null {
  return markers;
}

export function setAvatarMarkers(next: AvatarMarker[] | null): void {
  markers = next;
}

export function getAvatarImages(): AvatarImageTable {
  return avatarImages;
}

export function setAvatarImages(next: AvatarImageTable | null): void {
  avatarImages = next ?? {};
}

export function getAvatarElements(): Map<string, HTMLDivElement> {
  return elementsByClusterKey;
}

export function clearAvatarElements(): void {
  for (const el of elementsByClusterKey.values()) {
    try {
      el.remove();
    } catch {
      // Element may already be detached.
    }
  }
  elementsByClusterKey.clear();
}

/** Test-only reset. */
export function __resetAvatarMarkerStateForTests(): void {
  markers = null;
  avatarImages = {};
  elementsByClusterKey.clear();
}
