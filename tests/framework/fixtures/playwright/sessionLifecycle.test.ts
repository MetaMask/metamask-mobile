import type { ServiceProvider } from '../../services';
import type { SharedAppiumSession } from './types.ts';
import {
  recreateInProcessSession,
  resolveLiveDriver,
} from './sessionLifecycle.ts';

const createDrv = (sessionId: string): WebdriverIO.Browser =>
  ({
    sessionId,
    deleteSession: jest.fn().mockResolvedValue(undefined),
  }) as unknown as WebdriverIO.Browser;

describe('resolveLiveDriver', () => {
  it('prefers the shared session when it diverges from the fixture pointer', () => {
    const fixtureDrv = createDrv('old');
    const sharedDrv = createDrv('new');

    const live = resolveLiveDriver(fixtureDrv, { drv: sharedDrv });

    expect(live).toBe(sharedDrv);
  });

  it('falls back to the fixture driver when the shared session is empty', () => {
    const fixtureDrv = createDrv('old');

    const live = resolveLiveDriver(fixtureDrv, {});

    expect(live).toBe(fixtureDrv);
  });
});

describe('recreateInProcessSession', () => {
  const createProvider = (
    newDrv: WebdriverIO.Browser,
  ): ServiceProvider & {
    cleanupSession: jest.Mock;
    getDriver: jest.Mock;
  } =>
    ({
      cleanupSession: jest.fn().mockResolvedValue(undefined),
      getDriver: jest.fn().mockResolvedValue(newDrv),
    }) as unknown as ServiceProvider & {
      cleanupSession: jest.Mock;
      getDriver: jest.Mock;
    };

  it('adopts the new session before configuring implicit wait', async () => {
    const oldDrv = createDrv('old');
    const newDrv = createDrv('new');
    const deviceProvider = createProvider(newDrv);
    const sharedSession: SharedAppiumSession = { drv: oldDrv };
    const order: string[] = [];
    let fixtureDrv: WebdriverIO.Browser | undefined = oldDrv;
    const configureWait = jest.fn(async () => {
      order.push('configureWait');
    });

    await recreateInProcessSession({
      currentDrv: oldDrv,
      deviceProvider,
      sharedSession,
      implicitMs: 1000,
      adoptSession: (session) => {
        order.push('adopt');
        fixtureDrv = session;
      },
      configureWait,
    });

    expect(deviceProvider.cleanupSession).toHaveBeenCalledWith(oldDrv);
    expect(order).toEqual(['adopt', 'configureWait']);
    expect(fixtureDrv).toBe(newDrv);
    expect(sharedSession.drv).toBe(newDrv);
    expect(configureWait).toHaveBeenCalledWith(newDrv, 1000);
  });

  it('flushes recording on the dying session and re-arms it on the replacement', async () => {
    const oldDrv = createDrv('old');
    const newDrv = createDrv('new');
    const deviceProvider = createProvider(newDrv);
    const sharedSession: SharedAppiumSession = { drv: oldDrv };
    const order: string[] = [];
    deviceProvider.cleanupSession.mockImplementation(async () => {
      order.push('cleanup');
    });

    await recreateInProcessSession({
      currentDrv: oldDrv,
      deviceProvider,
      sharedSession,
      implicitMs: 1000,
      adoptSession: () => order.push('adopt'),
      flushDyingSession: async (dying) => {
        order.push(`flush:${dying.sessionId}`);
      },
      armNewSession: async (session) => {
        order.push(`arm:${session.sessionId}`);
      },
      configureWait: jest.fn().mockResolvedValue(undefined),
    });

    expect(order).toEqual(['flush:old', 'cleanup', 'adopt', 'arm:new']);
  });

  it('recreates the session when the recording flush throws', async () => {
    const oldDrv = createDrv('old');
    const newDrv = createDrv('new');
    const deviceProvider = createProvider(newDrv);
    const sharedSession: SharedAppiumSession = { drv: oldDrv };

    const result = await recreateInProcessSession({
      currentDrv: oldDrv,
      deviceProvider,
      sharedSession,
      implicitMs: 1000,
      adoptSession: () => undefined,
      flushDyingSession: jest
        .fn()
        .mockRejectedValue(
          new Error('session is either terminated or not started'),
        ),
      configureWait: jest.fn().mockResolvedValue(undefined),
    });

    expect(result).toBe(newDrv);
    expect(deviceProvider.cleanupSession).toHaveBeenCalledWith(oldDrv);
  });

  it('keeps the adopted session when implicit wait still fails', async () => {
    const oldDrv = createDrv('old');
    const newDrv = createDrv('new');
    const deviceProvider = createProvider(newDrv);
    const sharedSession: SharedAppiumSession = { drv: oldDrv };
    let fixtureDrv: WebdriverIO.Browser | undefined = oldDrv;
    const waitError = new Error('setTimeout rejected during startup');

    await expect(
      recreateInProcessSession({
        currentDrv: oldDrv,
        deviceProvider,
        sharedSession,
        implicitMs: 1000,
        adoptSession: (session) => {
          fixtureDrv = session;
        },
        configureWait: jest.fn().mockRejectedValue(waitError),
      }),
    ).rejects.toThrow(waitError);

    expect(fixtureDrv).toBe(newDrv);
    expect(sharedSession.drv).toBe(newDrv);
    expect(resolveLiveDriver(fixtureDrv, sharedSession)).toBe(newDrv);
  });
});
