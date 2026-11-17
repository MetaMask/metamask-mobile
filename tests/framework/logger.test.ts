import { createLogger, resolveE2eLogWorkerScope } from './logger.ts';

describe('resolveE2eLogWorkerScope', () => {
  it('returns no tag in globalSetup when no worker index is set', () => {
    const scope = resolveE2eLogWorkerScope({});

    expect(scope).toBeUndefined();
  });

  it('tags the Playwright parallel index before the device fixture runs', () => {
    const scope = resolveE2eLogWorkerScope({ TEST_PARALLEL_INDEX: '1' });

    expect(scope).toBe('w1');
  });

  it('prefers E2E_WORKER_INDEX over TEST_PARALLEL_INDEX', () => {
    const scope = resolveE2eLogWorkerScope({
      E2E_WORKER_INDEX: '1',
      TEST_PARALLEL_INDEX: '0',
    });

    expect(scope).toBe('w1');
  });

  it('includes ANDROID_SERIAL when the worker device is known', () => {
    const scope = resolveE2eLogWorkerScope({
      TEST_PARALLEL_INDEX: '1',
      ANDROID_SERIAL: 'emulator-5556',
    });

    expect(scope).toBe('w1 emulator-5556');
  });
});

describe('Logger worker scope', () => {
  const originalParallelIndex = process.env.TEST_PARALLEL_INDEX;
  const originalWorkerIndex = process.env.E2E_WORKER_INDEX;
  const originalSerial = process.env.ANDROID_SERIAL;

  afterEach(() => {
    if (originalParallelIndex === undefined) {
      delete process.env.TEST_PARALLEL_INDEX;
    } else {
      process.env.TEST_PARALLEL_INDEX = originalParallelIndex;
    }
    if (originalWorkerIndex === undefined) {
      delete process.env.E2E_WORKER_INDEX;
    } else {
      process.env.E2E_WORKER_INDEX = originalWorkerIndex;
    }
    if (originalSerial === undefined) {
      delete process.env.ANDROID_SERIAL;
    } else {
      process.env.ANDROID_SERIAL = originalSerial;
    }
    jest.restoreAllMocks();
  });

  it('includes the worker slot on each log line', () => {
    process.env.TEST_PARALLEL_INDEX = '1';
    delete process.env.E2E_WORKER_INDEX;
    delete process.env.ANDROID_SERIAL;
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = createLogger({ name: 'DappServer', colors: false });

    logger.info('Starting dapp server');

    expect(log).toHaveBeenCalledWith(
      '[E2E Framework] [INFO] [w1] [DappServer] Starting dapp server',
    );
  });
});
