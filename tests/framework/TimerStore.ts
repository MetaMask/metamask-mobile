/** Represents the timing data for a single timer. */
export interface TimerData {
  start: number | null;
  end: number | null;
  duration: number | null;
}

/**
 * Singleton store that manages a registry of named timers.
 * Each timer tracks start time, end time, and computed duration.
 */
class TimerStore {
  private static instance: TimerStore;
  private timers = new Map<string, TimerData>();

  constructor() {
    if (!TimerStore.instance) {
      TimerStore.instance = this;
    }
    return TimerStore.instance;
  }

  /**
   * Retrieves a timer by id, throwing if it does not exist.
   * @param id - Identifier of the timer
   * @returns The TimerData for the requested timer
   * @throws Error if no timer with the given id exists
   */
  private getTimerOrThrow(id: string): TimerData {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer with id "${id}" does not exist.`);
    }
    return timer;
  }

  /**
   * Creates a new timer with the given id.
   * If a timer with the same id already exists, returns the existing timer data.
   * @param id - Unique identifier for the timer
   * @returns The existing TimerData if the id is already taken, otherwise undefined
   */
  createTimer(id: string): TimerData | undefined {
    if (this.timers.has(id)) {
      console.log(`Timer with id "${id}" already exists.`);
      return this.timers.get(id);
    }
    this.timers.set(id, { start: null, end: null, duration: null });
  }

  /**
   * Starts the timer with the given id by recording the current timestamp.
   * @param id - Identifier of an existing timer
   * @throws Error if no timer with the given id exists
   */
  startTimer(id: string): void {
    const timer = this.getTimerOrThrow(id);
    timer.start = Date.now();
  }

  /**
   * Stops the timer with the given id and computes its duration.
   * @param id - Identifier of an existing timer
   * @throws Error if no timer with the given id exists
   */
  stopTimer(id: string): void {
    const timer = this.getTimerOrThrow(id);
    timer.end = Date.now();
    timer.duration = timer.end - (timer.start ?? 0);
  }

  /**
   * Retrieves the timing data for a given timer.
   * @param id - Identifier of an existing timer
   * @returns The TimerData for the requested timer
   * @throws Error if no timer with the given id exists
   */
  getTimer(id: string): TimerData {
    return this.getTimerOrThrow(id);
  }

  /**
   * Renames a timer from oldId to newId, preserving its data.
   * @param oldId - Current identifier of the timer
   * @param newId - New identifier for the timer
   * @throws Error if oldId does not exist or newId already exists
   */
  renameTimer(oldId: string, newId: string): void {
    const timerData = this.getTimerOrThrow(oldId);
    if (this.timers.has(newId)) {
      throw new Error(`Timer with id "${newId}" already exists.`);
    }
    this.timers.delete(oldId);
    this.timers.set(newId, timerData);
  }

  /**
   * Returns all timers as an array of objects including their id and timing data.
   * @returns Array of all timer entries with id, start, end, and duration
   */
  getAllTimers(): (TimerData & { id: string })[] {
    return Array.from(this.timers.entries()).map(([id, timer]) => ({
      id,
      ...timer,
    }));
  }

  /** Removes all timers from the store. */
  resetTimers(): void {
    this.timers.clear();
  }
}

const instance = new TimerStore();
Object.freeze(instance);
export default instance;
