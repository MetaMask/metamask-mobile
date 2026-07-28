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
  /** Bumped on every pulse; a newer pulse cancels the previous animation loop. */
  pulseGeneration: number;
}

const state: TradeMarkerState = {
  shapeIds: [],
  shapesByMarkerId: new Map(),
  markers: null,
  placementGeneration: 0,
  pulseGeneration: 0,
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

export function bumpPulseGeneration(): number {
  state.pulseGeneration += 1;
  return state.pulseGeneration;
}

export function getPulseGeneration(): number {
  return state.pulseGeneration;
}

/** Test-only: reset every slice between test cases. */
export function __resetTradeMarkerStateForTests(): void {
  state.shapeIds = [];
  state.shapesByMarkerId = new Map();
  state.markers = null;
  state.placementGeneration = 0;
  state.pulseGeneration = 0;
}
