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
  analyticsId,
  remoteFeatureFlag,
  metaMetricsEnabled,
  pna25Acknowledged,
}: {
  analyticsId: string;
  remoteFeatureFlag: boolean;
  metaMetricsEnabled: boolean;
  pna25Acknowledged: boolean;
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

  const mockGetState = jest.fn().mockReturnValue({
    legalNotices: {
      isPna25Acknowledged: pna25Acknowledged,
    },
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getProfileMetricsControllerMessenger(baseMessenger),
    initMessenger: undefined,
    analyticsId,
    getController: mockGetController,
    getState: mockGetState,
  };

  return requestMock;
}

describe.each([
  {
    analyticsId: 'dd6395a5-7a84-47b8-8bc3-713170c2f3e8',
    remoteFeatureFlag: true,
    metaMetricsEnabled: true,
    pna25Acknowledged: true,
  },
  {
    analyticsId: '898cbad5-7a5e-4ea1-8ca0-822bb4804665',
    remoteFeatureFlag: false,
    metaMetricsEnabled: false,
    pna25Acknowledged: false,
  },
  {
    analyticsId: '9c9fe89c-76c3-4ad6-89f8-b76061159458',
    remoteFeatureFlag: true,
    metaMetricsEnabled: false,
    pna25Acknowledged: false,
  },
  {
    analyticsId: '5aed4107-f430-4bb0-84c9-1e7031599cc2',
    remoteFeatureFlag: false,
    metaMetricsEnabled: true,
    pna25Acknowledged: false,
  },
  {
    analyticsId: '3f4e2d2a-1c4e-4f5e-9f3a-2b6d8c9e7f10',
    remoteFeatureFlag: true,
    metaMetricsEnabled: true,
    pna25Acknowledged: false,
  },
])(
  'profileMetricsControllerInit',
  ({
    analyticsId,
    remoteFeatureFlag,
    metaMetricsEnabled,
    pna25Acknowledged,
  }) => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe(`when analyticsId is ${analyticsId}, the feature flag value is ${remoteFeatureFlag}, MetaMetrics is ${metaMetricsEnabled ? 'enabled' : 'disabled'} and pna25Acknowledged is ${pna25Acknowledged}`, () => {
      it('initializes the controller', () => {
        const { controller } = profileMetricsControllerInit(
          getInitRequestMock({
            analyticsId,
            remoteFeatureFlag,
            metaMetricsEnabled,
            pna25Acknowledged,
          }),
        );

        expect(controller).toBeInstanceOf(ProfileMetricsController);
      });

      it('passes the proper arguments to the controller', () => {
        profileMetricsControllerInit(
          getInitRequestMock({
            analyticsId,
            remoteFeatureFlag,
            metaMetricsEnabled,
            pna25Acknowledged,
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
          metaMetricsEnabled && remoteFeatureFlag && pna25Acknowledged,
        );
        expect(controllerMock.mock.calls[0][0].getMetaMetricsId()).toBe(
          analyticsId,
        );
      });
    });
  },
);
