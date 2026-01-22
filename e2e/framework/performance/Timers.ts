interface Timer {
  start: number | null;
  end: number | null;
  duration: number | null;
}

interface TimerWithId extends Timer {
  id: string;
}

class Timers {
  private static instance: Timers | null = null;
  private timers: Map<string, Timer>;

  private constructor() {
    this.timers = new Map();
  }

  static getInstance(): Timers {
    if (!Timers.instance) {
      Timers.instance = new Timers();
      Object.freeze(Timers.instance);
    }
    return Timers.instance;
  }

  // Create a new timer
  createTimer(id: string): Timer | undefined {
    if (this.timers.has(id)) {
      // eslint-disable-next-line no-console
      console.log(`Timer with id "${id}" already exists.`);
      return undefined;
    }
    const timer: Timer = { start: null, end: null, duration: null };
    this.timers.set(id, timer);
    return timer;
  }

  // Start a timer
  startTimer(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer with id "${id}" does not exist.`);
    }
    timer.start = Date.now();
  }

  // Stop a timer
  stopTimer(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer with id "${id}" does not exist.`);
    }
    if (timer.start === null) {
      throw new Error(`Timer with id "${id}" was never started.`);
    }
    timer.end = Date.now();
    timer.duration = timer.end - timer.start;
  }

  // Get the value of a timer
  getTimer(id: string): Timer {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer with id "${id}" does not exist.`);
    }
    return timer;
  }

  // Rename a timer
  renameTimer(oldId: string, newId: string): void {
    const timerData = this.timers.get(oldId);
    if (!timerData) {
      throw new Error(`Timer with id "${oldId}" does not exist.`);
    }
    if (this.timers.has(newId)) {
      throw new Error(`Timer with id "${newId}" already exists.`);
    }
    this.timers.delete(oldId);
    this.timers.set(newId, timerData);
  }

  // Get all timers
  getAllTimers(): TimerWithId[] {
    return Array.from(this.timers.entries()).map(([id, timer]) => ({
      id,
      ...timer,
    }));
  }

  // Clear all timers
  resetTimers(): void {
    this.timers.clear();
  }
}

export default Timers.getInstance();
