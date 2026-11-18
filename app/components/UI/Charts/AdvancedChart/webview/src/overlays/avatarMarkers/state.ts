// Module-local state for the avatar DOM overlay (no window.* globals).

import type { AvatarMarker } from '../../messages/contract';

let markers: AvatarMarker[] | null = null;
/** Marker id -> its DOM wrapper element currently in the overlay container. */
const elementsByMarkerId = new Map<string, HTMLDivElement>();

export function getAvatarMarkers(): AvatarMarker[] | null {
  return markers;
}

export function setAvatarMarkers(next: AvatarMarker[] | null): void {
  markers = next;
}

export function getAvatarElements(): Map<string, HTMLDivElement> {
  return elementsByMarkerId;
}

export function clearAvatarElements(): void {
  for (const el of elementsByMarkerId.values()) {
    try {
      el.remove();
    } catch {
      // Element may already be detached.
    }
  }
  elementsByMarkerId.clear();
}

/** Test-only reset. */
export function __resetAvatarMarkerStateForTests(): void {
  markers = null;
  elementsByMarkerId.clear();
}
