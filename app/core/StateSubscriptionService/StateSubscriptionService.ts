import type { Patch } from 'immer';
import { ControllerStateProxy } from './ControllerStateProxy';

/**
 * Registry of ControllerStateProxy instances with two-phase apply/notify.
 *
 * Phase 1 (applyBatch/updateController): write to proxies without notifying.
 * Phase 2 (flush): notify all dirty proxies atomically.
 *
 * Components reading from multiple controllers always see a consistent snapshot.
 */
export class StateSubscriptionService {
  #proxies = new Map<string, ControllerStateProxy<unknown>>();
  #dirtyKeys = new Set<string>();

  initialize(keyedState: Record<string, unknown>): void {
    for (const [key, state] of Object.entries(keyedState)) {
      if (this.#proxies.has(key)) {
        this.#proxies.get(key)!.setState(state);
      } else {
        this.#proxies.set(key, new ControllerStateProxy(state));
      }
    }
  }

  /**
   * Updates existing proxies in-place (preserving subscribers),
   * creates new proxies for previously unknown controllers.
   */
  reinitialize(keyedState: Record<string, unknown>): void {
    for (const [key, state] of Object.entries(keyedState)) {
      const proxy = this.#proxies.get(key);
      if (proxy) {
        proxy.setState(state);
      } else {
        this.#proxies.set(key, new ControllerStateProxy(state));
      }
    }
    this.flush();
  }

  getProxy<S>(controllerName: string): ControllerStateProxy<S> {
    const proxy = this.#proxies.get(controllerName);
    if (!proxy) {
      throw new Error(
        `StateSubscriptionService: no proxy for "${controllerName}". ` +
          'Was initialize() called with this controller?',
      );
    }
    return proxy as ControllerStateProxy<S>;
  }

  hasProxy(controllerName: string): boolean {
    return this.#proxies.has(controllerName);
  }

  applyBatch(updates: Record<string, Patch[] | unknown>): void {
    for (const [key, value] of Object.entries(updates)) {
      const proxy = this.#proxies.get(key);
      if (!proxy) continue;

      if (Array.isArray(value) && value.length > 0 && isPatch(value[0])) {
        proxy.applyPatches(value as Patch[]);
      } else {
        proxy.setState(value);
      }
      this.#dirtyKeys.add(key);
    }
  }

  updateController(controllerName: string, state: unknown): void {
    const proxy = this.#proxies.get(controllerName);
    if (!proxy) return;
    proxy.setState(state);
    this.#dirtyKeys.add(controllerName);
  }

  flush(): void {
    for (const key of this.#dirtyKeys) {
      this.#proxies.get(key)?.notify();
    }
    this.#dirtyKeys.clear();
  }

  getAllSnapshots(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, proxy] of this.#proxies) {
      result[key] = proxy.getSnapshot();
    }
    return result;
  }
}

function isPatch(value: unknown): value is Patch {
  return (
    typeof value === 'object' &&
    value !== null &&
    'op' in value &&
    'path' in value
  );
}
