class Profiler {
  #values: Map<string, { average: number; max: number; samples: number }> =
    new Map();

  #pending: Map<string, number> = new Map();

  reset() {
    this.#values.clear();
    this.#pending.clear();
  }

  start(name: string) {
    this.#pending.set(name, Date.now());
  }

  stop(name: string) {
    const duration = Date.now() - (this.#pending.get(name) ?? 0);
    this.#pending.delete(name);

    const existing = this.#values.get(name) ?? {
      average: 0,
      max: 0,
      samples: 0,
    };

    const newAverage = (existing.average + duration) / 2;
    const newMax = Math.max(existing.max, duration);
    const newSamples = existing.samples + 1;

    this.#values.set(name, {
      average: newAverage,
      max: newMax,
      samples: newSamples,
    });
  }

  log() {
    const orderedEntires = Array.from(this.#values.entries()).sort(
      (a, b) => b[1].average - a[1].average,
    );

    console.log('\n\n#MATT PROFILER RESULTS:');

    for (const [name, data] of orderedEntires) {
      console.log(
        `#MATT ${name}: avg=${data.average.toFixed(2)}ms max=${
          data.max
        }ms samples=${data.samples}`,
      );
    }

    console.log('\n\n');
  }
}

export const profiler = new Profiler();
