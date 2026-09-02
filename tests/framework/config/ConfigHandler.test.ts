import { defineConfig, resolveE2EWorkers } from './ConfigHandler.ts';

describe('defineConfig', () => {
  it('uses one worker when E2E_WORKERS is unset', () => {
    const workers = resolveE2EWorkers({});

    const config = defineConfig({} as Parameters<typeof defineConfig>[0]);

    expect(workers).toBe(1);
    expect(config.workers).toBe(1);
  });

  it('uses the worker count from E2E_WORKERS', () => {
    const workers = resolveE2EWorkers({ E2E_WORKERS: '2' });

    expect(workers).toBe(2);
  });
});
