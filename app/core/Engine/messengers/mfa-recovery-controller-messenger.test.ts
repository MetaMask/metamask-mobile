import { Messenger } from '@metamask/messenger';
import {
  getMfaRecoveryControllerInitMessenger,
  getMfaRecoveryControllerMessenger,
} from './mfa-recovery-controller-messenger';

describe('MFA recovery controller messengers', () => {
  it('creates a controller messenger', () => {
    const rootMessenger = new Messenger({ namespace: 'Root' });

    expect(getMfaRecoveryControllerMessenger(rootMessenger)).toBeInstanceOf(
      Messenger,
    );
  });

  it('delegates the initialization dependencies', () => {
    const rootMessenger = new Messenger({ namespace: 'Root' });
    const delegate = jest.spyOn(rootMessenger, 'delegate');

    getMfaRecoveryControllerInitMessenger(rootMessenger);

    expect(delegate).toHaveBeenCalledWith({
      actions: [
        'AuthenticationController:getBearerToken',
        'KeyringController:signPersonalMessage',
        'KeyringController:exportEncryptionKey',
        'KeyringController:getState',
        'RemoteFeatureFlagController:getState',
      ],
      events: ['KeyringController:unlock'],
      messenger: expect.any(Messenger),
    });
  });
});
