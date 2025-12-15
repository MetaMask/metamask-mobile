class Timers {
  constructor() {
    if (!Timers.instance) {
      this.timers = new Map(); // Store the timers in a map
      Timers.instance = this;
    }
    return Timers.instance;
  }

  // Create a new timer
  createTimer(id) {
    if (this.timers.has(id)) {
      /* eslint-disable no-console */
      console.log(`Timer with id "${id}" already exists.`);
      return this.timers.get(id);
    }
    this.timers.set(id, { start: null, end: null, duration: null });
  }

  // Start a timer
  startTimer(id) {
    if (!this.timers.has(id)) {
      throw new Error(`Timer with id "${id}" does not exist.`);
    }
    const timer = this.timers.get(id);
    timer.start = Date.now();
  }

  // Stop a timer
  stopTimer(id) {
    if (!this.timers.has(id)) {
      throw new Error(`Timer with id "${id}" does not exist.`);
    }
    const timer = this.timers.get(id);
    timer.end = Date.now();
    timer.duration = timer.end - timer.start;
  }

  // Get the value of a timer
  getTimer(id) {
    if (!this.timers.has(id)) {
      throw new Error(`Timer with id "${id}" does not exist.`);
    }
    return this.timers.get(id);
  }

  // Rename a timer
  renameTimer(oldId, newId) {
    if (!this.timers.has(oldId)) {
      throw new Error(`Timer with id "${oldId}" does not exist.`);
    }
    if (this.timers.has(newId)) {
      throw new Error(`Timer with id "${newId}" already exists.`);
    }
    const timerData = this.timers.get(oldId);
    this.timers.delete(oldId);
    this.timers.set(newId, timerData);
  }

  // Obtener todos los timers
  getAllTimers() {
    return Array.from(this.timers.entries()).map(([id, timer]) => ({
      id,
      ...timer,
    }));
  }

  // Clear all timers
  resetTimers() {
    this.timers.clear();
  }
}

const instance = new Timers();
Object.freeze(instance); // Ensure that the instance cannot be modified
export default instance;
