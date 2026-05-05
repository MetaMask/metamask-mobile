/**
 * Layer 2 for PerpsMini — runtime contract for the controller's state shape.
 *
 * Same pattern as `widgetStateContract.ts`. Any component-view test that
 * supplies a mocked `PerpsMiniState` slice must pass it through
 * `mockPerpsMiniState()` so a hand-rolled mock that drifts from the real
 * controller's shape fails at test setup with a surgical error.
 */
import type { PerpsMiniState, Position, Side } from '../src/PerpsMini';

export class ControllerContractError extends Error {
  constructor(message: string) {
    super(`[PerpsMiniContract] ${message}`);
    this.name = 'ControllerContractError';
  }
}

const VALID_SIDES: Side[] = ['long', 'short'];

function assertPosition(value: unknown, path: string): asserts value is Position {
  if (!value || typeof value !== 'object') {
    throw new ControllerContractError(`${path}: expected object, got ${typeof value}`);
  }
  const v = value as Record<string, unknown>;
  if (!VALID_SIDES.includes(v.side as Side)) {
    throw new ControllerContractError(`${path}.side: expected 'long' | 'short'`);
  }
  for (const key of ['size', 'markPrice'] as const) {
    if (typeof v[key] !== 'number' || !Number.isFinite(v[key] as number)) {
      throw new ControllerContractError(`${path}.${key}: expected finite number`);
    }
  }
}

export function assertPerpsMiniState(
  value: unknown,
): asserts value is PerpsMiniState {
  if (!value || typeof value !== 'object') {
    throw new ControllerContractError(`expected object, got ${typeof value}`);
  }
  const v = value as Record<string, unknown>;
  if (!v.positions || typeof v.positions !== 'object') {
    throw new ControllerContractError('positions: expected object map');
  }
  for (const [symbol, pos] of Object.entries(v.positions as Record<string, unknown>)) {
    assertPosition(pos, `positions["${symbol}"]`);
  }
}

export function mockPerpsMiniState(state: PerpsMiniState): PerpsMiniState {
  assertPerpsMiniState(state);
  return state;
}
