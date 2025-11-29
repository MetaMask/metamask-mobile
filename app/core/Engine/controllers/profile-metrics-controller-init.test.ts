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

function getInitRequestMock({
  metaMetricsId,
  remoteFeatureFlag,
}: {
  metaMetricsId: string;
  remoteFeatureFlag: boolean;
}): jest.Mocked<ControllerInitRequest<ProfileMetricsControllerMessenger>> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const mockGetController = jest.fn().mockReturnValue({
    state: {
      remoteFeatureFlags: { extensionUxPna25: remoteFeatureFlag },
    },
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getProfileMetricsControllerMessenger(baseMessenger),
    initMessenger: undefined,
    metaMetricsId,
    getController: mockGetController,
  };

  return requestMock;
}

describe.each([
  { metaMetricsId: 'mock-id', remoteFeatureFlag: true },
  { metaMetricsId: 'mock-id-2', remoteFeatureFlag: false },
])('profileMetricsControllerInit', ({ metaMetricsId, remoteFeatureFlag }) => {
  describe(`when metaMetricsId is ${metaMetricsId} and the feature flag value is ${remoteFeatureFlag}`, () => {
    it('initializes the controller', () => {
      const { controller } = profileMetricsControllerInit(
        getInitRequestMock({ metaMetricsId, remoteFeatureFlag }),
      );
      expect(controller).toBeInstanceOf(ProfileMetricsController);
    });

    it('passes the proper arguments to the controller', () => {
      profileMetricsControllerInit(
        getInitRequestMock({ metaMetricsId, remoteFeatureFlag }),
      );

      const controllerMock = jest.mocked(ProfileMetricsController);
      expect(controllerMock).toHaveBeenCalledWith({
        messenger: expect.any(Object),
        state: undefined,
        assertUserOptedIn: expect.any(Function),
        getMetaMetricsId: expect.any(Function),
      });
    });
  });
});
