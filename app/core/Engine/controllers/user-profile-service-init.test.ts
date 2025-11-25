import {
  Env,
  UserProfileService,
  UserProfileServiceMessenger,
} from '@metamask/user-profile-controller';
import { ControllerInitRequest } from '../types';
import { buildControllerInitRequestMock } from '../utils/test-utils';
import { userProfileServiceInit } from './user-profile-service-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { getUserProfileServiceMessenger } from '../messengers/user-profile-service-messenger';

jest.mock('@metamask/user-profile-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<UserProfileServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getUserProfileServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('userProfileServiceInit', () => {
  it('initializes the service', () => {
    const { controller } = userProfileServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(UserProfileService);
  });

  it('passes the proper arguments to the controller', () => {
    userProfileServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(UserProfileService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      fetch: expect.any(Function),
      env: Env.PRD,
    });
  });
});
