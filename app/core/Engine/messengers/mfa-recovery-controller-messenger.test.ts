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

  it('delegates the AuthenticationController actions the controller calls', () => {
    const rootMessenger = new Messenger({ namespace: 'Root' });
    const delegate = jest.spyOn(rootMessenger, 'delegate');

    getMfaRecoveryControllerMessenger(rootMessenger);

    expect(delegate).toHaveBeenCalledWith({
      actions: [
        'AuthenticationController:refreshCanonicalProfileId',
        'AuthenticationController:requestMfaApproval',
      ],
      messenger: expect.any(Messenger),
    });
  });

  it('delegates the initialization dependencies', () => {
    const rootMessenger = new Messenger({ namespace: 'Root' });
    const delegate = jest.spyOn(rootMessenger, 'delegate');

    getMfaRecoveryControllerInitMessenger(rootMessenger);

    expect(delegate).toHaveBeenCalledWith({
      actions: [
        'AuthenticationController:getBearerToken',
        'AuthenticationController:refreshCanonicalProfileId',
        'AuthenticationController:requestMfaApproval',
        'KeyringController:signPersonalMessage',
        'KeyringController:getState',
        'RemoteFeatureFlagController:getState',
      ],
      events: ['KeyringController:unlock'],
      messenger: expect.any(Messenger),
    });
  });
});
