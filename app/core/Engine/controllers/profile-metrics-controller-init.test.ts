import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { ControllerInitRequest } from '../types';
import { profileMetricsControllerInit } from './profile-metrics-controller-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { getProfileMetricsControllerMessenger } from '../messengers/profile-metrics-controller-messenger';
import { buildControllerInitRequestMock } from '../utils/test-utils';

jest.mock('@metamask/profile-metrics-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ProfileMetricsControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getProfileMetricsControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('profileMetricsControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = profileMetricsControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ProfileMetricsController);
  });

  it('passes the proper arguments to the controller', () => {
    profileMetricsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(ProfileMetricsController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      assertUserOptedIn: expect.any(Function),
      getMetaMetricsId: expect.any(Function),
    });
  });
});
