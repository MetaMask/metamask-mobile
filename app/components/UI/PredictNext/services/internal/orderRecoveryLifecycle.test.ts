import { bindOrderRecoveryLifecycle } from './orderRecoveryLifecycle';
import type { AppStateStatus } from 'react-native';
import type { NetInfoState } from '@react-native-community/netinfo';

// ES2022 has no Promise.withResolvers; keep test barriers explicit.
const deferred = <Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value | PromiseLike<Value>) => void;
} => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const setup = (): {
  service: {
    resumeRecovery: jest.Mock;
    suspendRecovery: jest.Mock;
    getRecoveryGeneration: () => number;
  };
  getIdentityScope: jest.Mock;
  dispose: () => void;
  removeApp: jest.Mock;
  removeNetwork: jest.Mock;
  removeSession: jest.Mock;
  lock: () => void;
  unlock: () => void;
  signOut: () => void;
  disable: () => void;
  reset: () => void;
  app: (state: AppStateStatus) => void;
  network: (online: boolean) => void;
} => {
  let unlocked = true;
  let signedIn = true;
  let enabled = true;
  let sessionChanged: () => void = () => undefined;
  let appChanged: (state: AppStateStatus) => void = () => undefined;
  let networkChanged: (state: NetInfoState) => void = () => undefined;
  let serviceGeneration = 0;
  const service = {
    resumeRecovery: jest.fn().mockResolvedValue(undefined),
    suspendRecovery: jest.fn(),
    getRecoveryGeneration: (): number => serviceGeneration,
  };
  const getIdentityScope = jest.fn().mockResolvedValue('canonical-user-one');
  const removeApp = jest.fn();
  const removeNetwork = jest.fn();
  const removeSession = jest.fn();
  const dispose = bindOrderRecoveryLifecycle({
    service,
    isUnlocked: () => unlocked,
    isSignedIn: () => signedIn,
    isEnabled: () => enabled,
    getIdentityScope,
    subscribeSession: (listener) => {
      sessionChanged = listener;
      return removeSession;
    },
    appState: {
      currentState: 'active',
      addEventListener: jest.fn((_event, listener) => {
        appChanged = listener;
        return { remove: removeApp };
      }),
    },
    network: {
      addEventListener: jest.fn((listener) => {
        networkChanged = listener;
        return removeNetwork;
      }),
    },
  });
  return {
    service,
    getIdentityScope,
    dispose,
    removeApp,
    removeNetwork,
    removeSession,
    lock: (): void => {
      unlocked = false;
      sessionChanged();
    },
    unlock: (): void => {
      unlocked = true;
      sessionChanged();
    },
    signOut: (): void => {
      signedIn = false;
      sessionChanged();
    },
    disable: (): void => {
      enabled = false;
      sessionChanged();
    },
    reset: (): void => {
      serviceGeneration += 1;
    },
    app: (state: AppStateStatus): void => appChanged(state),
    network: (online: boolean): void =>
      networkChanged({
        isConnected: online,
        isInternetReachable: online,
      } as NetInfoState),
  };
};
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('order recovery lifecycle', () => {
  it('resumes on unlocked startup, foreground and reconnect only', async () => {
    const lifecycle = setup();
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledWith(
      'canonical-user-one',
    );
    lifecycle.app('background');
    expect(lifecycle.service.suspendRecovery).toHaveBeenCalledTimes(1);
    lifecycle.app('active');
    await settle();
    lifecycle.network(false);
    lifecycle.network(true);
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledTimes(3);
    lifecycle.dispose();
    expect(lifecycle.removeApp).toHaveBeenCalledTimes(1);
    expect(lifecycle.removeNetwork).toHaveBeenCalledTimes(1);
    expect(lifecycle.removeSession).toHaveBeenCalledTimes(1);
  });

  it('treats iOS inactive as a temporary suspension and resumes the same identity', async () => {
    const lifecycle = setup();
    await settle();
    lifecycle.app('inactive');
    expect(lifecycle.service.suspendRecovery).toHaveBeenCalledTimes(1);
    lifecycle.app('active');
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenNthCalledWith(2, 'canonical-user-one');
    lifecycle.dispose();
  });

  it('synchronously suspends on lock and never resumes from stale identity resolution', async () => {
    const lifecycle = setup();
    await settle();
    const held = deferred<string>();
    lifecycle.getIdentityScope.mockReturnValueOnce(held.promise);
    lifecycle.app('active');
    lifecycle.lock();
    expect(lifecycle.service.suspendRecovery).toHaveBeenCalledTimes(1);
    held.resolve('stale-user');
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledTimes(1);
    lifecycle.unlock();
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledTimes(2);
    lifecycle.dispose();
  });

  it('does not restore an identity lookup that completes after wallet reset', async () => {
    const lifecycle = setup();
    await settle();
    const held = deferred<string>();
    lifecycle.getIdentityScope.mockReturnValueOnce(held.promise);
    lifecycle.app('active');

    lifecycle.reset();
    held.resolve('deleted-wallet-user');
    await settle();

    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledTimes(1);
    lifecycle.dispose();
  });

  it('does not perform recovery while signed out, disabled or destroyed', async () => {
    const lifecycle = setup();
    await settle();
    lifecycle.signOut();
    lifecycle.disable();
    lifecycle.app('active');
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledTimes(1);
    lifecycle.dispose();
    lifecycle.network(false);
    lifecycle.network(true);
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledTimes(1);
  });
});
