/**
 * Hand-rolled runtime contract for WidgetControllerState.
 *
 * Why hand-rolled instead of zod? Two reasons:
 *  1. No new dependency required — this can ship today.
 *  2. The contract is co-owned by the controller team, who maintain
 *     `WidgetControllerState`, and the UI team, who maintain mocks. A
 *     dedicated module keeps the boundary visible in PR diffs.
 *
 * In a real repo you'd swap in `zod`/`io-ts` for free composability, but
 * the PROCESS is what matters: every component-view test that supplies a
 * mocked controller slice must pass through `assertWidgetState`.
 */
import type { WidgetControllerState, Widget } from '../src/WidgetController';

export class ControllerContractError extends Error {
  constructor(message: string) {
    super(`[ControllerContract] ${message}`);
    this.name = 'ControllerContractError';
  }
}

function assertWidget(value: unknown, path: string): asserts value is Widget {
  if (!value || typeof value !== 'object') {
    throw new ControllerContractError(`${path}: expected object, got ${typeof value}`);
  }
  const v = value as Record<string, unknown>;
  for (const key of ['id', 'label'] as const) {
    if (typeof v[key] !== 'string') {
      throw new ControllerContractError(`${path}.${key}: expected string`);
    }
  }
  for (const key of ['price', 'priceCents'] as const) {
    if (typeof v[key] !== 'number') {
      throw new ControllerContractError(`${path}.${key}: expected number`);
    }
  }
}

export function assertWidgetState(
  value: unknown,
): asserts value is WidgetControllerState {
  if (!value || typeof value !== 'object') {
    throw new ControllerContractError(`expected object, got ${typeof value}`);
  }
  const v = value as Record<string, unknown>;

  if (!v.widgets || typeof v.widgets !== 'object') {
    throw new ControllerContractError('widgets: expected object map');
  }
  for (const [id, w] of Object.entries(v.widgets as Record<string, unknown>)) {
    assertWidget(w, `widgets["${id}"]`);
  }
  if (typeof v.loading !== 'boolean') {
    throw new ControllerContractError('loading: expected boolean');
  }
  if (v.lastSyncedAt !== null && typeof v.lastSyncedAt !== 'number') {
    throw new ControllerContractError('lastSyncedAt: expected number | null');
  }
}

/**
 * Wrap any mocked state literal with this in component tests.
 * If the literal drifts from the real controller's shape, the test fails
 * at setup time with a clear, surgical error instead of silently passing.
 *
 *     const state = mockWidgetState({ widgets: { 'w-1': {...} }, loading: false, lastSyncedAt: 0 });
 */
export function mockWidgetState(state: WidgetControllerState): WidgetControllerState {
  assertWidgetState(state);
  return state;
}
