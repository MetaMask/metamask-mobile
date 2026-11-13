import {
  resetEngineReady,
  resolveEngineReady,
  waitForEngineReady,
} from './engine-ready';

async function isSettled(promise: Promise<void>): Promise<boolean> {
  let settled = false;
  promise.then(() => (settled = true));
  await new Promise((resolve) => setImmediate(resolve));
  return settled;
}

describe('engine-ready', () => {
  beforeEach(() => {
    resetEngineReady();
  });

  it('does not resolve before the engine is ready', async () => {
    expect(await isSettled(waitForEngineReady())).toBe(false);
  });

  it('resolves pending and later waiters once the engine is ready', async () => {
    const pending = waitForEngineReady();

    resolveEngineReady();

    expect(await isSettled(pending)).toBe(true);
    expect(await isSettled(waitForEngineReady())).toBe(true);
  });

  it('waits again after reset', async () => {
    resolveEngineReady();
    resetEngineReady();

    expect(await isSettled(waitForEngineReady())).toBe(false);
  });
});
