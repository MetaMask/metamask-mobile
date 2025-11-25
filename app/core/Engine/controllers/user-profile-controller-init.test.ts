import {
  UserProfileController,
  UserProfileControllerMessenger,
} from '@metamask/user-profile-controller';
import { ControllerInitRequest } from '../types';
import { userProfileControllerInit } from './user-profile-controller-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { getUserProfileControllerMessenger } from '../messengers/user-profile-controller-messenger';
import { buildControllerInitRequestMock } from '../utils/test-utils';

jest.mock('@metamask/user-profile-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<UserProfileControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getUserProfileControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('userProfileControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = userProfileControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(UserProfileController);
  });

  it('passes the proper arguments to the controller', () => {
    userProfileControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(UserProfileController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      assertUserOptedIn: expect.any(Function),
      getMetaMetricsId: expect.any(Function),
    });
  });
});
