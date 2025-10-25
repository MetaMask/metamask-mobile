import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getAuthenticationControllerMessenger } from '../../messengers/identity/authentication-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { authenticationControllerInit } from './authentication-controller-init';
import {
  Controller as AuthenticationController,
  AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/profile-sync-controller/auth');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<AuthenticationControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
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
      },
    });
  });
});
