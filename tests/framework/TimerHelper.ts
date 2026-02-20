import { Device } from 'appwright';
import TimerStore from './TimerStore';
import AppwrightSelectors from './AppwrightSelectors';

/** Platform-specific threshold values in milliseconds. */
export interface PlatformThreshold {
  ios: number;
  android: number;
}

const THRESHOLD_MARGIN = 0.1; // 10% margin

/**
 * Helper class that wraps a TimerStore timer with threshold-based
 * performance validation and convenience methods.
 */
class TimerHelper {
  private _id: string;
  private _baseThreshold: number | null;

  /**
   * Creates a new TimerHelper and registers a timer in the store.
   * @param id - Timer description/identifier
   * @param threshold - Platform-specific thresholds in ms (effective threshold = base + 10%)
   * @param testDevice - The device instance used to determine the current platform
   */
  constructor(id: string, threshold?: PlatformThreshold, testDevice?: Device) {
    this._id = id;
    this._baseThreshold = this._resolveThreshold(threshold, testDevice);
    TimerStore.createTimer(this.id);
  }

  /**
   * Resolves the appropriate threshold based on the device platform.
   * @param threshold - Platform-specific thresholds
   * @param testDevice - The device instance
   * @returns The resolved threshold in ms, or null if unavailable
   */
  private _resolveThreshold(
    threshold?: PlatformThreshold,
    testDevice?: Device,
  ): number | null {
    if (!threshold) {
      return null;
    }

    if (!testDevice) {
      console.warn(
        'TimerHelper: device not provided, cannot determine platform for threshold',
      );
      return null;
    }

    if (AppwrightSelectors.isAndroid(testDevice)) {
      return threshold.android;
    }

    return threshold.ios;
  }

  /**
   * Starts the timer with the given id by recording the current timestamp.
   * @throws Error if no timer with the given id exists
   */
  start(): void {
    TimerStore.startTimer(this.id);
  }

  /**
   * Stops the timer with the given id and computes its duration.
   * @throws Error if no timer with the given id exists
   */
  stop(): void {
    TimerStore.stopTimer(this.id);
  }

  /**
   * Returns the duration of the timer in milliseconds.
   * If the timer has been stopped, returns the recorded duration.
   * If still running, returns the current elapsed time.
   * @returns Duration in ms, or null if the timer was never started
   */
  getDuration(): number | null {
    const timer = TimerStore.getTimer(this.id);
    if (timer.duration !== null) {
      return timer.duration;
    }
    if (timer.start !== null) {
      const currentDuration = Date.now() - timer.start;
      console.log(
        `⏱️ Timer "${this.id}" is still running, current elapsed: ${currentDuration}ms`,
      );
      return currentDuration;
    }
    return null;
  }

  /**
   * Renames this timer to a new identifier.
   * @param newName - The new identifier for this timer
   */
  changeName(newName: string): void {
    const oldId = this._id;
    TimerStore.renameTimer(oldId, newName);
    this._id = newName;
  }

  /**
   * Returns the duration of the timer in seconds.
   * @returns Duration in seconds, or 0 if the timer has no duration
   */
  getDurationInSeconds(): number {
    const duration = this.getDuration();
    return duration ? duration / 1000 : 0;
  }

  /**
   * Measures the execution time of an async action.
   * Starts the timer before the action and stops it after completion (or failure).
   * @param action - Async function to measure
   * @returns This TimerHelper instance for chaining
   */
  async measure(action: () => Promise<void>): Promise<TimerHelper> {
    this.start();
    try {
      await action();
    } finally {
      this.stop();
    }
    return this;
  }

  /** Returns the base threshold without margin applied. */
  get baseThreshold(): number | null {
    return this._baseThreshold;
  }

  /** Returns the effective threshold (base + 10% margin). */
  get threshold(): number | null {
    if (this._baseThreshold === null) {
      return null;
    }
    return Math.round(this._baseThreshold * (1 + THRESHOLD_MARGIN));
  }

  /** Returns whether this timer has a threshold defined. */
  hasThreshold(): boolean {
    return this._baseThreshold !== null;
  }

  /** The unique identifier for this timer. */
  get id(): string {
    return this._id;
  }
}

export default TimerHelper;
