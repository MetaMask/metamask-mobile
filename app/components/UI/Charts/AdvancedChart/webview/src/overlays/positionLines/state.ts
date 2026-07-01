// Module-local state for position line shape IDs.
// Kept separate from core/state.ts per convention: overlay-specific state
// lives in the overlay's own state module.

import type { TVShapeId } from '../../core/types';

let shapeIds: TVShapeId[] = [];

export function getPositionShapeIds(): TVShapeId[] {
  return shapeIds;
}

export function pushPositionShapeId(id: TVShapeId): void {
  shapeIds.push(id);
}

export function clearPositionShapeIds(): void {
  shapeIds = [];
}

export function __resetPositionLineStateForTests(): void {
  shapeIds = [];
}
