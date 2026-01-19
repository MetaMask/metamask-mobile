import {
  ProfileMetricsService,
  ProfileMetricsServiceMessenger,
} from '@metamask/profile-metrics-controller';
import { SDK } from '@metamask/profile-sync-controller';
import { ControllerInitRequest } from '../types';
import { buildControllerInitRequestMock } from '../utils/test-utils';
import { profileMetricsServiceInit } from './profile-metrics-service-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { getProfileMetricsServiceMessenger } from '../messengers/profile-metrics-service-messenger';

jest.mock('@metamask/profile-metrics-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ProfileMetricsServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getProfileMetricsServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('profileMetricsServiceInit', () => {
  it('initializes the service', () => {
    const { controller } = profileMetricsServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ProfileMetricsService);
  });

  it('passes the proper arguments to the controller', () => {
    profileMetricsServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(ProfileMetricsService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      fetch: expect.any(Function),
      env: SDK.Env.PRD,
    });
  });
});
