import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getAuthenticationControllerMessenger } from '../../messengers/identity/authentication-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { authenticationControllerInit } from './authentication-controller-init';
import {
  Controller as AuthenticationController,
  AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { getVersion } from 'react-native-device-info';

jest.mock('@metamask/profile-sync-controller/auth');
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.42.0'),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<AuthenticationControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getAuthenticationControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('AuthenticationControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = authenticationControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(AuthenticationController);
  });

  it('passes the proper arguments to the controller', () => {
    authenticationControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AuthenticationController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      metametrics: {
        agent: 'mobile',
        getMetaMetricsId: expect.any(Function),
        getAppVersion: expect.any(Function),
      },
    });
  });

  it('wires getAppVersion to react-native-device-info getVersion()', () => {
    authenticationControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AuthenticationController);
    const constructorArgs = controllerMock.mock.lastCall?.[0];
    expect(constructorArgs).toBeDefined();

    expect(constructorArgs?.metametrics.getAppVersion?.()).toBe('7.42.0');
    expect(jest.mocked(getVersion)).toHaveBeenCalled();
  });
});
