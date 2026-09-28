import {
  onBeforeAppTerminate,
  runBeforeAppTerminateHooks,
} from './appLifecycle.ts';

describe('appLifecycle before-app-terminate hooks', () => {
  it('does nothing when no hook is registered', async () => {
    await expect(runBeforeAppTerminateHooks()).resolves.toBeUndefined();
  });

  it('runs a registered hook', async () => {
    const hook = jest.fn().mockResolvedValue(undefined);
    const remove = onBeforeAppTerminate(hook);

    await runBeforeAppTerminateHooks();

    expect(hook).toHaveBeenCalledTimes(1);
    remove();
  });

  it('stops running a hook once it is removed', async () => {
    const hook = jest.fn().mockResolvedValue(undefined);
    const remove = onBeforeAppTerminate(hook);

    remove();
    await runBeforeAppTerminateHooks();

    expect(hook).not.toHaveBeenCalled();
  });

  it('runs every registered hook', async () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);
    const removeFirst = onBeforeAppTerminate(first);
    const removeSecond = onBeforeAppTerminate(second);

    await runBeforeAppTerminateHooks();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    removeFirst();
    removeSecond();
  });

  it('swallows a failing hook so the app restart is not blocked', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('profile flush'));
    const healthy = jest.fn().mockResolvedValue(undefined);
    const removeFailing = onBeforeAppTerminate(failing);
    const removeHealthy = onBeforeAppTerminate(healthy);

    await expect(runBeforeAppTerminateHooks()).resolves.toBeUndefined();

    expect(healthy).toHaveBeenCalledTimes(1);
    removeFailing();
    removeHealthy();
  });
});
