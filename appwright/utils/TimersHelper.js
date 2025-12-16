import Timers from './Timers';

const THRESHOLD_MARGIN = 0.1; // 10% margin

class TimerHelper {
  /**
   * Creates a new timer with optional threshold
   * @param {string} id - Timer description/identifier
   * @param {number} [threshold] - Base threshold in ms (effective threshold = base + 10%)
   */
  constructor(id, threshold) {
    this._id = id;
    this._baseThreshold = threshold;
    Timers.createTimer(this.id);
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

  isRunning() {
    const timer = Timers.getTimer(this.id);
    return timer.start !== null && timer.duration === null;
  }

  isCompleted() {
    const timer = Timers.getTimer(this.id);
    return timer.duration !== null;
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

  /**
   * Validates if the timer duration is within the threshold
   * @returns {{ passed: boolean, duration: number, threshold: number|null, exceeded: number|null }}
   */
  validate() {
    const duration = this.getDuration();
    const effectiveThreshold = this.threshold;

    if (effectiveThreshold === null || duration === null) {
      return {
        passed: true,
        duration,
        threshold: null,
        exceeded: null,
      };
    }

    const passed = duration <= effectiveThreshold;
    const exceeded = !passed ? duration - effectiveThreshold : null;

    return {
      passed,
      duration,
      threshold: effectiveThreshold,
      exceeded,
    };
  }

  get id() {
    return this._id;
  }
}

export default TimerHelper;
