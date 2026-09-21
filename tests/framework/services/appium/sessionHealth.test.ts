import { isSessionAlive, switchToNativeContext } from './sessionHealth.ts';

describe('isSessionAlive', () => {
  it('returns false when drv is undefined', async () => {
    const result = await isSessionAlive(undefined);

    expect(result).toBe(false);
  });

  it('returns true when getWindowSize resolves', async () => {
    const drv = {
      getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
    } as unknown as WebdriverIO.Browser;

    const result = await isSessionAlive(drv);

    expect(result).toBe(true);
    expect(drv.getWindowSize).toHaveBeenCalledTimes(1);
  });

  it('returns false when getWindowSize rejects', async () => {
    const drv = {
      getWindowSize: jest.fn().mockRejectedValue(new Error('invalid session')),
    } as unknown as WebdriverIO.Browser;

    const result = await isSessionAlive(drv);

    expect(result).toBe(false);
  });
});

describe('switchToNativeContext', () => {
  it('returns false when drv is undefined', async () => {
    const result = await switchToNativeContext(undefined);

    expect(result).toBe(false);
  });

  it('switches to NATIVE_APP and returns true', async () => {
    const drv = {
      switchContext: jest.fn().mockResolvedValue(undefined),
    } as unknown as WebdriverIO.Browser;

    const result = await switchToNativeContext(drv);

    expect(result).toBe(true);
    expect(drv.switchContext).toHaveBeenCalledWith('NATIVE_APP');
  });

  it('returns false when switchContext rejects', async () => {
    const drv = {
      switchContext: jest.fn().mockRejectedValue(new Error('no contexts')),
    } as unknown as WebdriverIO.Browser;

    const result = await switchToNativeContext(drv);

    expect(result).toBe(false);
  });
});
