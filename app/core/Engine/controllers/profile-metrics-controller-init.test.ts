import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { MessengerClientInitRequest } from '../types';
import { profileMetricsControllerInit } from './profile-metrics-controller-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ProfileMetricsControllerInitMessenger } from '../messengers/profile-metrics-controller-messenger';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../selectors/featureFlagController/basicFunctionalityConsolidation';

jest.mock('@metamask/profile-metrics-controller');

jest.mock(
  '../../../selectors/featureFlagController/basicFunctionalityConsolidation',
  () => ({
    selectIsBasicFunctionalityConsolidationEnabled: jest.fn(() => false),
  }),
);

const mockedSelectIsBasicFunctionalityConsolidationEnabled = jest.mocked(
  selectIsBasicFunctionalityConsolidationEnabled,
);

function getInitRequestMock({
  analyticsId,
  analyticsEnabled,
  pna25Acknowledged,
  basicFunctionalityEnabled,
  bftcGateOn,
}: {
  analyticsId: string;
  analyticsEnabled: boolean;
  pna25Acknowledged: boolean;
  basicFunctionalityEnabled: boolean;
  bftcGateOn: boolean;
}): jest.Mocked<
  MessengerClientInitRequest<
    ProfileMetricsControllerMessenger,
    ProfileMetricsControllerInitMessenger
  >
> {
  mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(
    bftcGateOn,
  );

  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const mockGetState = jest.fn().mockReturnValue({
    legalNotices: {
      isPna25Acknowledged: pna25Acknowledged,
    },
    settings: {
      basicFunctionalityEnabled,
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
    ...buildMessengerClientInitRequestMock(baseMessenger),
    initMessenger: mockInitMessenger,
    analyticsId,
    getState: mockGetState,
  };

  return requestMock;
}

describe.each([
  {
    analyticsId: 'dd6395a5-7a84-47b8-8bc3-713170c2f3e8',
    analyticsEnabled: true,
    pna25Acknowledged: true,
    basicFunctionalityEnabled: true,
    bftcGateOn: false,
  },
  {
    analyticsId: '898cbad5-7a5e-4ea1-8ca0-822bb4804665',
    analyticsEnabled: false,
    pna25Acknowledged: false,
    basicFunctionalityEnabled: true,
    bftcGateOn: false,
  },
  {
    analyticsId: '9c9fe89c-76c3-4ad6-89f8-b76061159458',
    analyticsEnabled: false,
    pna25Acknowledged: false,
    basicFunctionalityEnabled: false,
    bftcGateOn: false,
  },
  {
    analyticsId: '5aed4107-f430-4bb0-84c9-1e7031599cc2',
    analyticsEnabled: true,
    pna25Acknowledged: false,
    basicFunctionalityEnabled: true,
    bftcGateOn: false,
  },
  {
    analyticsId: '3f4e2d2a-1c4e-4f5e-9f3a-2b6d8c9e7f10',
    analyticsEnabled: true,
    pna25Acknowledged: false,
    basicFunctionalityEnabled: false,
    bftcGateOn: false,
  },
  {
    analyticsId: '4a5f3e2d-1c4e-4f5e-9f3a-2b6d8c9e7f11',
    analyticsEnabled: true,
    pna25Acknowledged: true,
    basicFunctionalityEnabled: false,
    bftcGateOn: false,
  },
  {
    analyticsId: '6b7c8d9e-2d3e-4f5e-8a1b-3c4d5e6f7a12',
    analyticsEnabled: false,
    pna25Acknowledged: true,
    basicFunctionalityEnabled: true,
    bftcGateOn: false,
  },
  {
    analyticsId: '7c8d9e0f-3e4f-5a6b-9c2d-4e5f6a7b8c13',
    analyticsEnabled: false,
    pna25Acknowledged: true,
    basicFunctionalityEnabled: true,
    bftcGateOn: true,
  },
  {
    analyticsId: '8d9e0f1a-4f5a-6b7c-0d3e-5f6a7b8c9d14',
    analyticsEnabled: false,
    pna25Acknowledged: false,
    basicFunctionalityEnabled: true,
    bftcGateOn: true,
  },
  {
    analyticsId: '9e0f1a2b-5a6b-7c8d-1e4f-6a7b8c9d0e15',
    analyticsEnabled: false,
    pna25Acknowledged: true,
    basicFunctionalityEnabled: false,
    bftcGateOn: true,
  },
  {
    analyticsId: '0f1a2b3c-6b7c-8d9e-2f5a-7b8c9d0e1f16',
    analyticsEnabled: true,
    pna25Acknowledged: true,
    basicFunctionalityEnabled: true,
    bftcGateOn: true,
  },
])(
  'profileMetricsControllerInit',
  ({
    analyticsId,
    analyticsEnabled,
    pna25Acknowledged,
    basicFunctionalityEnabled,
    bftcGateOn,
  }) => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe(`when analyticsId is ${analyticsId}, analytics is ${analyticsEnabled ? 'enabled' : 'disabled'}, pna25Acknowledged is ${pna25Acknowledged} and consolidation gate is ${bftcGateOn}`, () => {
      it('initializes the controller', () => {
        const { controller } = profileMetricsControllerInit(
          getInitRequestMock({
            analyticsId,
            analyticsEnabled,
            pna25Acknowledged,
            basicFunctionalityEnabled,
            bftcGateOn,
          }),
        );

        expect(controller).toBeInstanceOf(ProfileMetricsController);
      });

      it('passes the proper arguments to the controller', () => {
        profileMetricsControllerInit(
          getInitRequestMock({
            analyticsId,
            analyticsEnabled,
            pna25Acknowledged,
            basicFunctionalityEnabled,
            bftcGateOn,
          }),
        );

        const controllerMock = jest.mocked(ProfileMetricsController);

        expect(controllerMock).toHaveBeenCalledWith({
          messenger: expect.any(Object),
          state: undefined,
          assertUserOptedIn: expect.any(Function),
          getMetaMetricsId: expect.any(Function),
          initialDelayDuration: 60_000,
        });
        expect(controllerMock.mock.calls[0][0].assertUserOptedIn()).toBe(
          pna25Acknowledged &&
            basicFunctionalityEnabled &&
            (bftcGateOn || analyticsEnabled),
        );
        expect(controllerMock.mock.calls[0][0].getMetaMetricsId()).toBe(
          analyticsId,
        );
      });
    });
  },
);

describe('profileMetricsControllerInit assertUserOptedIn evaluation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-evaluates the consolidation gate on each assertUserOptedIn call', () => {
    mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(false);

    profileMetricsControllerInit(
      getInitRequestMock({
        analyticsId: '1a2b3c4d-7c8d-9e0f-3a6b-8c9d0e1f2a17',
        analyticsEnabled: false,
        pna25Acknowledged: true,
        basicFunctionalityEnabled: true,
        bftcGateOn: false,
      }),
    );

    const assertUserOptedIn = jest.mocked(ProfileMetricsController).mock
      .calls[0][0].assertUserOptedIn;

    expect(assertUserOptedIn()).toBe(false);

    mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(true);

    expect(assertUserOptedIn()).toBe(true);
  });
});
