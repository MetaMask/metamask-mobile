import Timers from './Timers';

class TimerHelper {
    constructor(id) {
        this.id = id;
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
        return timer.duration;
    }

    getDurationInSeconds() {
        const timer = Timers.getTimer(this.id);
        return timer.duration / 1000;
    }
}

export default TimerHelper;