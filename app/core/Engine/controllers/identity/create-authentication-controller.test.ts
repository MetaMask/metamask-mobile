import {
  AuthenticationControllerMessenger,
  AuthenticationControllerState,
  Controller as AuthenticationController,
  defaultState,
} from '@metamask/profile-sync-controller/auth';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { createAuthenticationController } from './create-authentication-controller';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import {
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MockAnyNamespace,
  Messenger,
} from '@metamask/messenger';

jest.mock('@metamask/profile-sync-controller/auth');

describe('Authentication Controller', () => {
  beforeEach(() => jest.resetAllMocks());

  const arrange = () => {
    const globalMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      MessengerActions<AuthenticationControllerMessenger>,
      MessengerEvents<AuthenticationControllerMessenger>
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger: AuthenticationControllerMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      MessengerActions<AuthenticationControllerMessenger>,
      MessengerEvents<AuthenticationControllerMessenger>,
      Messenger<
        MockAnyNamespace,
        MessengerActions<AuthenticationControllerMessenger>,
        MessengerEvents<AuthenticationControllerMessenger>
      >
    >({
      namespace: 'AuthenticationController',
      parent: globalMessenger,
    });
    globalMessenger.delegate({
      actions: [
        // Keyring Controller Requests
        'KeyringController:getState',
        // Snap Controller Requests
        'SnapController:handleRequest',
      ],
      events: [
        // Keyring Controller Events
        'KeyringController:lock',
        'KeyringController:unlock',
      ],
      messenger,
    });
    const metametrics = {
      agent: Platform.MOBILE as const,
      getMetaMetricsId: () => 'metametricsId',
    };

    const mockConstructor = jest.spyOn(
      AuthenticationController.prototype,
      // @ts-expect-error - this is not something you should be able to call, but this is a mock
      'constructor',
    );

    const assertGetConstructorCall = () =>
      mockConstructor.mock.calls[0][0] as unknown as {
        state: AuthenticationControllerState;
      };

    return {
      globalMessenger,
      messenger,
      mockConstructor,
      metametrics,
      assertGetConstructorCall,
    };
  };

  it('returns controller instance', () => {
    const { messenger, metametrics } = arrange();
    const controller = createAuthenticationController({
      messenger,
      metametrics,
    });
    expect(controller).toBeInstanceOf(AuthenticationController);
  });

  it('can pass undefined as initial state', () => {
    const { messenger, metametrics, assertGetConstructorCall } = arrange();
    createAuthenticationController({ messenger, metametrics });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toBe(undefined);
  });

  it('uses initial state that is provided', () => {
    const { messenger, metametrics, assertGetConstructorCall } = arrange();
    const state = { ...defaultState, isSignedIn: true };
    createAuthenticationController({
      messenger,
      metametrics,
      initialState: state,
    });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toEqual(state);
  });
});
