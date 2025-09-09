import Timers from './Timers';

class TimerHelper {
  constructor(id) {
    this._id = id;
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

  get id() {
    return this._id;
  }
}

export default TimerHelper;
