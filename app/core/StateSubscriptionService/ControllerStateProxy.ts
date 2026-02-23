import type { Patch } from 'immer';
import { applyPatches } from 'immer';

type Listener = () => void;

/**
 * Per-controller external store satisfying the useSyncExternalStore contract.
 *
 * Two update paths: setState (direct reference, in-process) and
 * applyPatches (Immer patches, cross-process).
 *
 * Notification is deferred — callers must invoke notify() (or
 * StateSubscriptionService.flush()) to fire subscribers.
 * This enables two-phase apply/notify for torn-read prevention.
 */
export class ControllerStateProxy<S> {
  #snapshot: S;
  #listeners = new Set<Listener>();
  #dirty = false;

  constructor(initialState: S) {
    this.#snapshot = initialState;
  }

  /**
   * Safe for direct reference assignment — BaseControllerV2 state is
   * Immer-frozen. Does not notify; sets dirty flag for deferred flush.
   */
  setState(state: S): void {
    if (state === this.#snapshot) return;
    this.#snapshot = state;
    this.#dirty = true;
  }

  applyPatches(patches: Patch[]): void {
    if (patches.length === 0) return;
    this.#snapshot = applyPatches(this.#snapshot, patches) as S;
    this.#dirty = true;
  }

  getSnapshot = (): S => this.#snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  notify(): void {
    if (!this.#dirty) return;
    this.#dirty = false;
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
