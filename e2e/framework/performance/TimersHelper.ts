import Timers from './Timers';
import { createLogger, type Logger, LogLevel } from '../logger';

interface PerformanceTracker {
  addTimer(timer: TimerHelper): void;
}

class TimerHelper {
  private _id: string;
  private logger: Logger;

  constructor(id: string) {
    this._id = id;
    Timers.createTimer(this.id);
    this.logger = createLogger({ name: `TimersHelper`, level: LogLevel.INFO });
  }

  start(): void {
    Timers.startTimer(this.id);
    this.logger.debug(`Timer "${this.id}" started`);
  }

  stop(): void {
    Timers.stopTimer(this.id);
    this.logger.debug(`Timer "${this.id}" stopped`);
  }

  getDuration(): number | null {
    const timer = Timers.getTimer(this.id);
    // If timer has been stopped, return the recorded duration
    if (timer.duration !== null) {
      return timer.duration;
    }
    // If timer is running but not stopped, calculate current elapsed time
    if (timer.start !== null) {
      const currentDuration = Date.now() - timer.start;
      this.logger.info(
        `Timer "${this.id}" is still running, current elapsed: ${currentDuration}ms`,
      );
      return currentDuration;
    }
    // Timer never started
    this.logger.error(`Timer "${this.id}" was never started`);
    return null;
  }

  changeName(newName: string): void {
    const oldId = this._id;
    Timers.renameTimer(oldId, newName);
    this._id = newName;
    this.logger.debug(`Timer "${oldId}" renamed to "${newName}"`);
  }

  getDurationInSeconds(): number {
    const duration = this.getDuration();
    return duration ? duration / 1000 : 0;
  }

  isRunning(): boolean {
    const timer = Timers.getTimer(this.id);
    const isRunning = timer.start !== null && timer.duration === null;
    this.logger.debug(`Timer "${this.id}" is running: ${isRunning}`);
    return isRunning;
  }

  isCompleted(): boolean {
    const timer = Timers.getTimer(this.id);
    const isCompleted = timer.duration !== null;
    this.logger.debug(`Timer "${this.id}" is completed: ${isCompleted}`);
    return isCompleted;
  }

  get id(): string {
    return this._id;
  }

  /**
   * Runs the provided async function while timing it, and automatically
   * registers the timer with the given performanceTracker.
   *
   * @example
   * await TimerHelper.withTimer(performanceTracker, 'Step name', async () => {
   *   // timed operation
   * });
   */
  static async withTimer<T>(
    performanceTracker: PerformanceTracker,
    id: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const timer = new TimerHelper(id);
    timer.start();
    try {
      return await fn();
    } finally {
      timer.stop();
      performanceTracker.addTimer(timer);
    }
  }
}

export default TimerHelper;
