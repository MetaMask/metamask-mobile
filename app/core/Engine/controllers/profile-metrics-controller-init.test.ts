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
import { MetaMetrics } from '../../Analytics';

jest.mock('@metamask/profile-metrics-controller');

function getInitRequestMock({
  metaMetricsId,
  remoteFeatureFlag,
  metaMetricsEnabled,
}: {
  metaMetricsId: string;
  remoteFeatureFlag: boolean;
  metaMetricsEnabled: boolean;
}): jest.Mocked<ControllerInitRequest<ProfileMetricsControllerMessenger>> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  jest.spyOn(MetaMetrics, 'getInstance').mockReturnValue({
    isEnabled: () => metaMetricsEnabled,
  } as MetaMetrics);

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
  {
    metaMetricsId: 'dd6395a5-7a84-47b8-8bc3-713170c2f3e8',
    remoteFeatureFlag: true,
    metaMetricsEnabled: true,
  },
  {
    metaMetricsId: '898cbad5-7a5e-4ea1-8ca0-822bb4804665',
    remoteFeatureFlag: false,
    metaMetricsEnabled: false,
  },
  {
    metaMetricsId: '9c9fe89c-76c3-4ad6-89f8-b76061159458',
    remoteFeatureFlag: true,
    metaMetricsEnabled: false,
  },
  {
    metaMetricsId: '5aed4107-f430-4bb0-84c9-1e7031599cc2',
    remoteFeatureFlag: false,
    metaMetricsEnabled: true,
  },
])(
  'profileMetricsControllerInit',
  ({ metaMetricsId, remoteFeatureFlag, metaMetricsEnabled }) => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe(`when metaMetricsId is ${metaMetricsId}, the feature flag value is ${remoteFeatureFlag} and MetaMetrics is ${metaMetricsEnabled ? 'enabled' : 'disabled'}`, () => {
      it('initializes the controller', () => {
        const { controller } = profileMetricsControllerInit(
          getInitRequestMock({
            metaMetricsId,
            remoteFeatureFlag,
            metaMetricsEnabled,
          }),
        );

        expect(controller).toBeInstanceOf(ProfileMetricsController);
      });

      it('passes the proper arguments to the controller', () => {
        profileMetricsControllerInit(
          getInitRequestMock({
            metaMetricsId,
            remoteFeatureFlag,
            metaMetricsEnabled,
          }),
        );

        const controllerMock = jest.mocked(ProfileMetricsController);

        expect(controllerMock).toHaveBeenCalledWith({
          messenger: expect.any(Object),
          state: undefined,
          assertUserOptedIn: expect.any(Function),
          getMetaMetricsId: expect.any(Function),
        });
        expect(controllerMock.mock.calls[0][0].assertUserOptedIn()).toBe(
          metaMetricsEnabled && remoteFeatureFlag,
        );
        expect(controllerMock.mock.calls[0][0].getMetaMetricsId()).toBe(
          metaMetricsId,
        );
      });
    });
  },
);
