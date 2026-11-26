import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { GlobalActions, GlobalEvents } from '../types';
import {
  getMfaRecoveryControllerInitMessenger,
  getMfaRecoveryControllerMessenger,
  getMfaRecoveryServiceMessenger,
  getRecoveryRegistrationLockProviderMessenger,
  getUserStorageTrustedIdentifierStoreMessenger,
} from './mfa-recovery-controller-messenger';

type TestRootMessenger = Messenger<
  MockAnyNamespace,
  GlobalActions,
  GlobalEvents
>;

function createRootMessenger(): TestRootMessenger {
  return new Messenger({ namespace: MOCK_ANY_NAMESPACE });
}

describe('mfa-recovery-controller-messenger', () => {
  it('delegates controller actions including SeedlessOnboardingController:getState', () => {
    const rootMessenger = createRootMessenger();
    const seedlessState = { authConnection: 'google' };
    rootMessenger.registerActionHandler(
      'SeedlessOnboardingController:getState',
      (() => seedlessState) as never,
    );

    const messenger = getMfaRecoveryControllerMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
    expect(messenger.call('SeedlessOnboardingController:getState')).toBe(
      seedlessState,
    );
  });

  it('delegates UserStorageController actions to the trusted identifier store messenger', async () => {
    const rootMessenger = createRootMessenger();
    const getAll = jest.fn().mockResolvedValue(['entry']);
    const setStorage = jest.fn().mockResolvedValue(undefined);
    const deleteStorage = jest.fn().mockResolvedValue(undefined);
    rootMessenger.registerActionHandler(
      'UserStorageController:performGetStorageAllFeatureEntries',
      getAll,
    );
    rootMessenger.registerActionHandler(
      'UserStorageController:performSetStorage',
      setStorage,
    );
    rootMessenger.registerActionHandler(
      'UserStorageController:performDeleteStorage',
      deleteStorage,
    );

    const initMessenger = getMfaRecoveryControllerInitMessenger(rootMessenger);
    const storeMessenger =
      getUserStorageTrustedIdentifierStoreMessenger(initMessenger);

    expect(initMessenger).toBeInstanceOf(Messenger);
    expect(storeMessenger).toBeInstanceOf(Messenger);
    await expect(
      storeMessenger.call(
        'UserStorageController:performGetStorageAllFeatureEntries',
        'mfaRecoveryTrustedIdentifiers',
      ),
    ).resolves.toStrictEqual(['entry']);
    await storeMessenger.call(
      'UserStorageController:performSetStorage',
      'mfaRecoveryTrustedIdentifiers.abc',
      '{}',
    );
    await storeMessenger.call(
      'UserStorageController:performDeleteStorage',
      'mfaRecoveryTrustedIdentifiers.abc',
    );
    expect(setStorage).toHaveBeenCalledWith(
      'mfaRecoveryTrustedIdentifiers.abc',
      '{}',
    );
    expect(deleteStorage).toHaveBeenCalledWith(
      'mfaRecoveryTrustedIdentifiers.abc',
    );
  });

  it('returns the lock provider and recovery service messengers', async () => {
    const rootMessenger = createRootMessenger();
    const acquireLock = jest.fn().mockResolvedValue(undefined);
    const releaseLock = jest.fn().mockResolvedValue(undefined);
    rootMessenger.registerActionHandler(
      'MfaRecoveryController:acquireLock',
      acquireLock,
    );
    rootMessenger.registerActionHandler(
      'MfaRecoveryController:releaseLock',
      releaseLock,
    );
    const initMessenger = getMfaRecoveryControllerInitMessenger(rootMessenger);

    expect(
      getRecoveryRegistrationLockProviderMessenger(initMessenger),
    ).toBeInstanceOf(Messenger);
    const serviceMessenger = getMfaRecoveryServiceMessenger(rootMessenger);
    expect(serviceMessenger).toBeInstanceOf(Messenger);

    await serviceMessenger.call('MfaRecoveryController:acquireLock');
    await serviceMessenger.call('MfaRecoveryController:releaseLock');
    expect(acquireLock).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it('delegates lock and auth stateChange events to the init messenger', () => {
    const rootMessenger = createRootMessenger();
    const initMessenger = getMfaRecoveryControllerInitMessenger(rootMessenger);
    const onLock = jest.fn();
    const onAuthStateChange = jest.fn();

    initMessenger.subscribe('KeyringController:lock', onLock);
    initMessenger.subscribe(
      'AuthenticationController:stateChange',
      onAuthStateChange,
    );

    rootMessenger.publish('KeyringController:lock');
    rootMessenger.publish(
      'AuthenticationController:stateChange',
      { isSignedIn: false },
      [],
    );

    expect(onLock).toHaveBeenCalledTimes(1);
    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
  });
});
