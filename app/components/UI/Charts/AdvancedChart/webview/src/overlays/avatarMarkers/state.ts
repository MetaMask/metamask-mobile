// Module-local state for the avatar DOM overlay (no window.* globals).

import type { AvatarMarker } from '../../messages/contract';

/**
 * One atomic avatar marker to render: a single trader's avatar + its buy/sell
 * badge, anchored to its own candle. Markers are never merged into a combined
 * element — close markers collapse into a tight bunch on screen (see
 * positionAvatarMarkers) with a single count disc for a group of 2+. Tap
 * grouping (surfacing every overlapping trade in the sheet) is handled
 * separately in index.ts (`tapGroupByMarkerId`), not by this structure.
 */
export interface AvatarCluster {
  /** Stable per-marker identity, `m:<markerId>`. */
  key: string;
  /** The single avatar to draw. */
  marker: AvatarMarker;
  /** Last rendered center X in overlay px (null when not currently visible). */
  x: number | null;
  /** Last rendered avatar center Y in overlay px (null when not visible). */
  y: number | null;
}

let markers: AvatarMarker[] | null = null;
/** Cluster key -> its DOM wrapper element currently in the overlay container. */
const elementsByClusterKey = new Map<string, HTMLDivElement>();

export function getAvatarMarkers(): AvatarMarker[] | null {
  return markers;
}

export function setAvatarMarkers(next: AvatarMarker[] | null): void {
  markers = next;
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
  elementsByClusterKey.clear();
}
