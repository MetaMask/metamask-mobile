/**
 * Which live cards may roll their figures. Only cards on screen while the list
 * is at rest are in the set; every other card swaps its figures as plain text,
 * so a fling never mounts the digit reels of the cards it passes.
 */
export class SocialLiveMotionGate {
  #ids: ReadonlySet<string> = new Set();

  readonly #listeners = new Set<() => void>();

  has(id: string): boolean {
    return this.#ids.has(id);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  set(ids: Iterable<string>): void {
    const next = new Set(ids);
    if (
      next.size === this.#ids.size &&
      [...next].every((id) => this.#ids.has(id))
    ) {
      return;
    }
    this.#ids = next;
    this.#listeners.forEach((listener) => listener());
  }

  clear(): void {
    this.set([]);
  }
}
