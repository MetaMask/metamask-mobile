import { resolveE2EWorkers } from './ConfigHandler.ts';

describe('resolveE2EWorkers', () => {
  it('uses one worker when E2E_WORKERS is unset', () => {
    const workers = resolveE2EWorkers({});

    expect(workers).toBe(1);
  });

  it('uses the worker count from E2E_WORKERS', () => {
    const workers = resolveE2EWorkers({ E2E_WORKERS: '2' });

    expect(workers).toBe(2);
  });

  it.each(['0', '-1', '1.5', 'invalid'])(
    'rejects invalid E2E_WORKERS value %s',
    (raw) => {
      expect(() => resolveE2EWorkers({ E2E_WORKERS: raw })).toThrow(
        `Invalid E2E_WORKERS "${raw}". Expected a positive integer.`,
      );
    },
  );
});
