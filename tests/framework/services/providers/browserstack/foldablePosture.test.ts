import { configureFoldablePosture } from './foldablePosture.ts';

function createDriver(
  sizes: { width: number; height: number }[] = [
    { width: 904, height: 2314 },
    { width: 1968, height: 2184 },
  ],
): WebdriverIO.Browser & {
  execute: jest.Mock;
  getWindowSize: jest.Mock;
  terminateApp: jest.Mock;
  activateApp: jest.Mock;
} {
  return {
    execute: jest.fn().mockResolvedValue({ output: '1: folded, 2: unfolded' }),
    getWindowSize: jest
      .fn()
      .mockImplementation(() => Promise.resolve(sizes.shift())),
    terminateApp: jest.fn().mockResolvedValue(undefined),
    activateApp: jest.fn().mockResolvedValue(undefined),
  } as unknown as WebdriverIO.Browser & {
    execute: jest.Mock;
    getWindowSize: jest.Mock;
    terminateApp: jest.Mock;
    activateApp: jest.Mock;
  };
}

describe('configureFoldablePosture', () => {
  it('does nothing when no posture is requested', async () => {
    const drv = createDriver();

    await configureFoldablePosture({
      driver: drv,
      deviceName: 'Samsung Galaxy Z Fold 7',
      packageName: 'io.metamask',
    });

    expect(drv.execute).not.toHaveBeenCalled();
  });

  it('unfolds and restarts MetaMask on the inner display', async () => {
    const drv = createDriver();

    await configureFoldablePosture({
      driver: drv,
      deviceName: 'Samsung Galaxy Z Fold 7',
      packageName: 'io.metamask',
      posture: 'unfolded',
      settleMs: 0,
    });

    expect(drv.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('cmd device_state print-states'),
    );
    expect(drv.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('cmd device_state state 2'),
    );
    expect(drv.terminateApp).toHaveBeenCalledWith('io.metamask');
    expect(drv.activateApp).toHaveBeenCalledWith('io.metamask');
  });

  it('rejects posture configuration for a non-foldable device', async () => {
    const drv = createDriver();

    await expect(
      configureFoldablePosture({
        driver: drv,
        deviceName: 'Samsung Galaxy S25 Ultra',
        packageName: 'io.metamask',
        posture: 'unfolded',
      }),
    ).rejects.toThrow('non-foldable device');
  });

  it('fails when BrowserStack does not resize to the inner display', async () => {
    const drv = createDriver([
      { width: 904, height: 2314 },
      { width: 904, height: 2314 },
    ]);

    await expect(
      configureFoldablePosture({
        driver: drv,
        deviceName: 'Samsung Galaxy Z Fold 7',
        packageName: 'io.metamask',
        posture: 'unfolded',
        settleMs: 0,
      }),
    ).rejects.toThrow('viewport width did not increase');
  });
});
