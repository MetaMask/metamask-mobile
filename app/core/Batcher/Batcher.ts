import { DEFAULT_BATCH_FLUSH_TIMER } from './constants';

/**
 * Batcher class for handling batched operations
 * manages a set of items that are processed together after a specified delay
 * might be used for other services as well
 */
export default class Batcher<T> {
  // Set of unique pending items to batch
  private pending: Set<T> = new Set<T>();
  // timer that will trigger the flush()
  private timer: NodeJS.Timeout | null = null;
  // the function to call when we flush the batch
  private handler: (items: T[]) => void;
  // time in ms to wait after the first add() before flushing
  private delay: number;

  constructor(
    handler: (items: T[]) => void,
    delay = DEFAULT_BATCH_FLUSH_TIMER,
  ) {
    this.handler = handler;
    this.delay = delay;
  }

  // add an item to the pending set and schedule a flush if not already pending.
  add(item: T) {
    this.pending.add(item);
    // if no timer is running, start one
    if (this.timer === null) {
      this.timer = setTimeout(() => this.flush(), this.delay);
    }
  }

  // clear the timer, empty the set, and invoke the handler with all pending items
  flush() {
    // cancel the pending timer so we don't call flush twice
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // snapshot the items and clear for the next batch
    const items = Array.from(this.pending);
    this.pending.clear();

    this.handler(items);
  }
}
