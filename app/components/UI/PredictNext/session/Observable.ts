/**
 * Tiny observable base used by POC services in place of BaseController + a
 * local Messenger. The full PredictNext design wires every stateful service
 * through @metamask/base-controller; here, the POC needs working flows more
 * than framework symmetry, and the dev-menu entrypoint shouldn't have to wire
 * a parallel messenger graph.
 *
 * Trade-off captured in `docs/kalshi-poc-plan.md` section 1, decision 8:
 * "Self-contained composition root (own PredictController bootstrap + local
 * messenger graph), not global Engine.context." A future cleanup can swap
 * this for BaseController without changing the service API.
 */
export type Listener<S> = (state: S) => void;

export class Observable<S> {
  private state: S;
  private listeners = new Set<Listener<S>>();

  constructor(initial: S) {
    this.state = initial;
  }

  getState(): S {
    return this.state;
  }

  protected setState(next: S | ((prev: S) => S)): void {
    const value = typeof next === 'function' ? (next as (p: S) => S)(this.state) : next;
    if (Object.is(value, this.state)) return;
    this.state = value;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  subscribe(listener: Listener<S>): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
