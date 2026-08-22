import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { AuthenticationControllerMessenger } from '@metamask/profile-sync-controller/auth';
import { getAuthenticationControllerMessenger } from './authentication-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<AuthenticationControllerMessenger>,
  MessengerEvents<AuthenticationControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getAuthenticationControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const authenticationControllerMessenger =
      getAuthenticationControllerMessenger(rootMessenger);

    expect(authenticationControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates SeedlessOnboardingController:getState for social identifier_type', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAuthenticationControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'SeedlessOnboardingController:getState',
        ]),
      }),
    );
  });

  it('delegates KeyringController:withKeyringV2Unsafe for native SIP-6 signing', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAuthenticationControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'KeyringController:withKeyringV2Unsafe',
        ]),
      }),
    );
  });
});
