import { bindOrderRecoveryLifecycle } from './orderRecoveryLifecycle';
import type { AppStateStatus } from 'react-native';
import type { NetInfoState } from '@react-native-community/netinfo';

const setup = () => {
  let unlocked = true;
  let signedIn = true;
  let enabled = true;
  let sessionChanged = () => undefined;
  let appChanged: (state: AppStateStatus) => void = () => undefined;
  let networkChanged: (state: NetInfoState) => void = () => undefined;
  const service = { resumeRecovery: jest.fn().mockResolvedValue(undefined), suspendRecovery: jest.fn() };
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
    subscribeSession: (listener) => { sessionChanged = listener; return removeSession; },
    appState: {
      currentState: 'active',
      addEventListener: jest.fn((_event, listener) => { appChanged = listener; return { remove: removeApp }; }),
    },
    network: { addEventListener: jest.fn((listener) => { networkChanged = listener; return removeNetwork; }) },
  });
  return {
    service, getIdentityScope, dispose, removeApp, removeNetwork, removeSession,
    lock: () => { unlocked = false; sessionChanged(); },
    unlock: () => { unlocked = true; sessionChanged(); },
    signOut: () => { signedIn = false; sessionChanged(); },
    disable: () => { enabled = false; sessionChanged(); },
    app: (state: AppStateStatus) => appChanged(state),
    network: (online: boolean) => networkChanged({ isConnected: online, isInternetReachable: online } as NetInfoState),
  };
};
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('order recovery lifecycle', () => {
  it('resumes on unlocked startup, foreground and reconnect only', async () => {
    const lifecycle = setup();
    await settle();
    expect(lifecycle.service.resumeRecovery).toHaveBeenCalledWith('canonical-user-one');
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

  it('synchronously suspends on lock and never resumes from stale identity resolution', async () => {
    const lifecycle = setup();
    await settle();
    const held = Promise.withResolvers<string>();
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
