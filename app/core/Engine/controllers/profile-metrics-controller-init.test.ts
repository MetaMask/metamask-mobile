import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { ControllerInitRequest } from '../types';
import { profileMetricsControllerInit } from './profile-metrics-controller-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ProfileMetricsControllerInitMessenger } from '../messengers/profile-metrics-controller-messenger';

jest.mock('@metamask/profile-metrics-controller');

function getInitRequestMock({
  analyticsId,
  remoteFeatureFlag,
  analyticsEnabled,
  pna25Acknowledged,
}: {
  analyticsId: string;
  remoteFeatureFlag: boolean;
  analyticsEnabled: boolean;
  pna25Acknowledged: boolean;
}): jest.Mocked<
  ControllerInitRequest<
    ProfileMetricsControllerMessenger,
    ProfileMetricsControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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

  // Create a mock initMessenger that handles AnalyticsController:getState
  const mockInitMessenger = {
    call: jest.fn((action: string) => {
      if (action === 'AnalyticsController:getState') {
        return { optedIn: analyticsEnabled };
      }
      return undefined;
    }),
  } as unknown as ProfileMetricsControllerInitMessenger;

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    initMessenger: mockInitMessenger,
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
    analyticsEnabled: true,
    pna25Acknowledged: true,
  },
  {
    analyticsId: '898cbad5-7a5e-4ea1-8ca0-822bb4804665',
    remoteFeatureFlag: false,
    analyticsEnabled: false,
    pna25Acknowledged: false,
  },
  {
    analyticsId: '9c9fe89c-76c3-4ad6-89f8-b76061159458',
    remoteFeatureFlag: true,
    analyticsEnabled: false,
    pna25Acknowledged: false,
  },
  {
    analyticsId: '5aed4107-f430-4bb0-84c9-1e7031599cc2',
    remoteFeatureFlag: false,
    analyticsEnabled: true,
    pna25Acknowledged: false,
  },
  {
    analyticsId: '3f4e2d2a-1c4e-4f5e-9f3a-2b6d8c9e7f10',
    remoteFeatureFlag: true,
    analyticsEnabled: true,
    pna25Acknowledged: false,
  },
])(
  'profileMetricsControllerInit',
  ({ analyticsId, remoteFeatureFlag, analyticsEnabled, pna25Acknowledged }) => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe(`when analyticsId is ${analyticsId}, the feature flag value is ${remoteFeatureFlag}, analytics is ${analyticsEnabled ? 'enabled' : 'disabled'} and pna25Acknowledged is ${pna25Acknowledged}`, () => {
      it('initializes the controller', () => {
        const { controller } = profileMetricsControllerInit(
          getInitRequestMock({
            analyticsId,
            remoteFeatureFlag,
            analyticsEnabled,
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
            analyticsEnabled,
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
          analyticsEnabled && remoteFeatureFlag && pna25Acknowledged,
        );
        expect(controllerMock.mock.calls[0][0].getMetaMetricsId()).toBe(
          analyticsId,
        );
      });
    });
  },
);
