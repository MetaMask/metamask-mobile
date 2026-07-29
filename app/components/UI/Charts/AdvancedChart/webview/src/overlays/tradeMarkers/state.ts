// Module-local state for the Social trade-marker overlay.
//
// Replaces legacy globals `window.tradeMarkerShapeIds`,
// `window.tradeMarkerShapeIdsById`, `window.tradeMarkersData`,
// `window.__tradeMarkerGen`, `window.__tradeMarkerPulseGen` from
// chartLogic.js (lines 29-33, 2649, 2900). Confined to this folder so
// no other module can read or mutate it — the trade-marker lifecycle is
// entirely owned here.

import type { TVShapeId } from '../../core/types';
import type { TradeMarker } from '../../messages/contract';

export interface MarkerShapePair {
  fill: TVShapeId | null;
  ring: TVShapeId | null;
}

interface TradeMarkerState {
  /** Flat list of all drawn entity ids (rings + fills) for bulk removeEntity. */
  shapeIds: TVShapeId[];
  /** marker.id → the ring + fill entity ids for that marker. */
  shapesByMarkerId: Map<string, MarkerShapePair>;
  /** Full marker set from the last SET_TRADE_MARKERS. null when cleared. */
  markers: TradeMarker[] | null;
  /** Bumped on every placement round; stale createShape resolves discard on mismatch. */
  placementGeneration: number;
  /**
   * Per-marker pulse counter (marker.id → generation). A newer pulse cancels
   * the previous animation loop for the SAME marker only, so pulses on other
   * markers run to completion and reset themselves to base size.
   */
  pulseGenerations: Map<string, number>;
}

const state: TradeMarkerState = {
  shapeIds: [],
  shapesByMarkerId: new Map(),
  markers: null,
  placementGeneration: 0,
  pulseGenerations: new Map(),
};

export function getShapeIds(): TVShapeId[] {
  return state.shapeIds;
}

export function pushShapeId(id: TVShapeId): void {
  state.shapeIds.push(id);
}

export function clearShapes(): void {
  state.shapeIds = [];
  state.shapesByMarkerId = new Map();
  // Drop stale per-marker pulse counters so a rebuild starts clean.
  state.pulseGenerations = new Map();
}

export function getShapesByMarkerId(): Map<string, MarkerShapePair> {
  return state.shapesByMarkerId;
}

export function setShapesForMarkerId(id: string, pair: MarkerShapePair): void {
  state.shapesByMarkerId.set(id, pair);
}

export function getMarkers(): TradeMarker[] | null {
  return state.markers;
}

export function setMarkers(markers: TradeMarker[] | null): void {
  state.markers = markers;
}

export function bumpPlacementGeneration(): number {
  state.placementGeneration += 1;
  return state.placementGeneration;
}

export function getPlacementGeneration(): number {
  return state.placementGeneration;
}

export function bumpPulseGeneration(markerId: string): number {
  const next = (state.pulseGenerations.get(markerId) ?? 0) + 1;
  state.pulseGenerations.set(markerId, next);
  return next;
}

export function getPulseGeneration(markerId: string): number {
  return state.pulseGenerations.get(markerId) ?? 0;
}

/** Test-only: reset every slice between test cases. */
export function __resetTradeMarkerStateForTests(): void {
  state.shapeIds = [];
  state.shapesByMarkerId = new Map();
  state.markers = null;
  state.placementGeneration = 0;
  state.pulseGenerations = new Map();
}
