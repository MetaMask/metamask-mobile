import type { SocialLivePriceKey } from './types';

export interface SocialLivePriceEntry {
  price: number;
}

type Listener = () => void;

export const DEFAULT_LIVE_PRICE_THROTTLE_MS = 1000;

/**
 * Latest streamed price per key, outside React so a tick re-renders only the
 * cards reading that key. Emits at most once per `throttleMs` per key, keeping
 * the newest value for the trailing emit.
 */
export class SocialLivePriceStore {
  readonly #entries = new Map<SocialLivePriceKey, SocialLivePriceEntry>();

  readonly #listeners = new Map<SocialLivePriceKey, Set<Listener>>();

  readonly #lastEmitAt = new Map<SocialLivePriceKey, number>();

  readonly #pending = new Map<SocialLivePriceKey, number>();

  readonly #timers = new Map<
    SocialLivePriceKey,
    ReturnType<typeof setTimeout>
  >();

  #throttleMs: number;

  constructor(throttleMs: number = DEFAULT_LIVE_PRICE_THROTTLE_MS) {
    this.#throttleMs = throttleMs;
  }

  setThrottleMs(throttleMs: number): void {
    this.#throttleMs = throttleMs;
  }

  get(key: SocialLivePriceKey): SocialLivePriceEntry | undefined {
    return this.#entries.get(key);
  }

  publish(key: SocialLivePriceKey, price: number): void {
    if (!Number.isFinite(price) || price <= 0) {
      return;
    }

    if (this.#timers.has(key)) {
      this.#pending.set(key, price);
      return;
    }

    const elapsed = Date.now() - (this.#lastEmitAt.get(key) ?? 0);
    if (elapsed >= this.#throttleMs) {
      this.#emit(key, price);
      return;
    }

    this.#pending.set(key, price);
    this.#timers.set(
      key,
      setTimeout(() => {
        this.#timers.delete(key);
        const pending = this.#pending.get(key);
        this.#pending.delete(key);
        if (pending != null) {
          this.#emit(key, pending);
        }
      }, this.#throttleMs - elapsed),
    );
  }

  subscribe(key: SocialLivePriceKey, listener: Listener): () => void {
    let listeners = this.#listeners.get(key);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(key, listeners);
    }
    listeners.add(listener);

    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) {
        this.#listeners.delete(key);
      }
    };
  }

  /** Drops queued trailing emits. Last known prices are kept. */
  cancelPending(): void {
    this.#timers.forEach((timer) => clearTimeout(timer));
    this.#timers.clear();
    this.#pending.clear();
  }

  #emit(key: SocialLivePriceKey, price: number): void {
    this.#lastEmitAt.set(key, Date.now());
    const previous = this.#entries.get(key);
    if (previous?.price === price) {
      return;
    }
    this.#entries.set(key, { price });
    this.#listeners.get(key)?.forEach((listener) => listener());
  }
}
