import Timers from './Timers';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';

const THRESHOLD_MARGIN = 0.1; // 10% margin

/**
 * @typedef {Object} PlatformThreshold
 * @property {number} ios - Threshold for iOS in ms
 * @property {number} android - Threshold for Android in ms
 */

class TimerHelper {
  /**
   * Creates a new timer with optional platform-specific thresholds
   * @param {string} id - Timer description/identifier
   * @param {PlatformThreshold} [threshold] - Platform-specific thresholds in ms (effective threshold = base + 10%)
   * @param {import('appwright').Device} [device] - The device instance to determine platform
   */
  constructor(id, threshold, device) {
    this._id = id;
    this._device = device;
    this._thresholdConfig = threshold;
    this._baseThreshold = this._resolveThreshold(threshold, device);
    Timers.createTimer(this.id);
  }

  /**
   * Resolves the appropriate threshold based on platform
   * @param {PlatformThreshold} [threshold] - Platform-specific thresholds
   * @param {import('appwright').Device} [device] - The device instance
   * @returns {number|null}
   */
  _resolveThreshold(threshold, device) {
    if (!threshold) {
      return null;
    }

    if (!device) {
      console.warn(
        'TimerHelper: device not provided, cannot determine platform for threshold',
      );
      return null;
    }

    if (AppwrightSelectors.isAndroid(device)) {
      return threshold.android;
    }

    return threshold.ios;
  }

  start() {
    Timers.startTimer(this.id);
  }

  stop() {
    Timers.stopTimer(this.id);
  }

  getDuration() {
    const timer = Timers.getTimer(this.id);
    // If timer has been stopped, return the recorded duration
    if (timer.duration !== null) {
      return timer.duration;
    }
    // If timer is running but not stopped, calculate current elapsed time
    if (timer.start !== null) {
      const currentDuration = Date.now() - timer.start;
      console.log(
        `⏱️ Timer "${this.id}" is still running, current elapsed: ${currentDuration}ms`,
      );
      return currentDuration;
    }
    // Timer never started
    return null;
  }

  changeName(newName) {
    const oldId = this._id;
    Timers.renameTimer(oldId, newName);
    this._id = newName;
  }

  getDurationInSeconds() {
    const duration = this.getDuration();
    return duration ? duration / 1000 : 0;
  }

  /**
   * Measures the execution time of an async action
   * @param {Function} action - Async function to measure
   * @returns {Promise<TimerHelper>} - Returns this for chaining
   */
  async measure(action) {
    this.start();
    try {
      await action();
    } finally {
      this.stop();
    }
    return this;
  }

  /**
   * Returns the base threshold (without margin)
   * @returns {number|null}
   */
  get baseThreshold() {
    return this._baseThreshold;
  }

  /**
   * Returns the effective threshold (base + 10% margin)
   * @returns {number|null}
   */
  get threshold() {
    if (this._baseThreshold === null) {
      return null;
    }
    return Math.round(this._baseThreshold * (1 + THRESHOLD_MARGIN));
  }

  /**
   * Returns whether this timer has a threshold defined
   * @returns {boolean}
   */
  hasThreshold() {
    return this._baseThreshold !== null;
  }

  get id() {
    return this._id;
  }
}

export default TimerHelper;
