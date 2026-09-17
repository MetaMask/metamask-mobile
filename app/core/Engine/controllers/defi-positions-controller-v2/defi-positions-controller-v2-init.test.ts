import { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  DeFiPositionsControllerV2InitMessenger,
  getDeFiPositionsControllerV2Messenger,
} from '../../messengers/defi-positions-controller-v2-messenger/defi-positions-controller-v2-messenger';
import {
  DeFiPositionsControllerV2,
  DeFiPositionsControllerV2Messenger,
} from '@metamask/assets-controllers';
import { defiPositionsControllerV2Init } from './defi-positions-controller-v2-init';
import { createApiPlatformClient } from '@metamask/core-backend';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import { selectDefiControllerV2Enabled } from '../../../../selectors/featureFlagController/defiControllerV2';

jest.mock('@metamask/assets-controllers');
jest.mock('@metamask/core-backend', () => ({
  createApiPlatformClient: jest.fn().mockReturnValue({
    accounts: {
      fetchV6MultiAccountBalances: jest.fn(),
    },
  }),
}));
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));
jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));
jest.mock('../../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));
jest.mock('../../../../selectors/onboarding', () => ({
  selectCompletedOnboarding: jest.fn(),
}));
jest.mock(
  '../../../../selectors/featureFlagController/defiControllerV2',
  () => ({
    selectDefiControllerV2Enabled: jest.fn(),
  }),
);

function getInitRequestMock(
  baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  MessengerClientInitRequest<
    DeFiPositionsControllerV2Messenger,
    DeFiPositionsControllerV2InitMessenger
  >
> {
  const mockInitMessenger = {
    call: jest.fn().mockReturnValue({ selectedCurrency: 'usd' }),
  } as unknown as DeFiPositionsControllerV2InitMessenger;

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getDeFiPositionsControllerV2Messenger(baseMessenger),
    initMessenger: mockInitMessenger,
  };

  return requestMock;
}

describe('API platform client bearer token retrieval', () => {
  // Placed before the `DeFiPositionsControllerV2Init` suite so the module-level
  // `apiClient` singleton is created with this block's init messenger, whose
  // `call` mock is asserted below.
  const BEARER_TOKEN = 'mock-bearer-token';
  const ORIGINAL_DISABLE_AUTH = process.env.MM_BACKEND_DISABLE_AUTH;

  let getBearerToken: () => Promise<string | undefined>;
  let initMessengerCall: jest.Mock;

  beforeAll(() => {
    const requestMock = getInitRequestMock();
    initMessengerCall = requestMock.initMessenger.call as unknown as jest.Mock;
    initMessengerCall.mockReturnValue(BEARER_TOKEN);
    defiPositionsControllerV2Init(requestMock);
    getBearerToken = jest.mocked(createApiPlatformClient).mock.calls[0][0]
      .getBearerToken as () => Promise<string | undefined>;
  });

  afterEach(() => {
    if (ORIGINAL_DISABLE_AUTH === undefined) {
      delete process.env.MM_BACKEND_DISABLE_AUTH;
    } else {
      process.env.MM_BACKEND_DISABLE_AUTH = ORIGINAL_DISABLE_AUTH;
    }
  });

  describe('when backend auth is enabled', () => {
    it('returns the AuthenticationController bearer token', async () => {
      process.env.MM_BACKEND_DISABLE_AUTH = 'false';

      await expect(getBearerToken()).resolves.toBe(BEARER_TOKEN);
      expect(initMessengerCall).toHaveBeenCalledWith(
        'AuthenticationController:getBearerToken',
      );
    });
  });

  describe('when backend auth is disabled', () => {
    it('omits the bearer token without contacting AuthenticationController', async () => {
      process.env.MM_BACKEND_DISABLE_AUTH = 'true';
      initMessengerCall.mockClear();

      await expect(getBearerToken()).resolves.toBeUndefined();
      expect(initMessengerCall).not.toHaveBeenCalledWith(
        'AuthenticationController:getBearerToken',
      );
    });
  });
});

describe('DeFiPositionsControllerV2Init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (store.getState as jest.Mock).mockReturnValue({});
    (selectBasicFunctionalityEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );
    (selectCompletedOnboarding as unknown as jest.Mock).mockReturnValue(true);
    (selectDefiControllerV2Enabled as unknown as jest.Mock).mockReturnValue(
      true,
    );
  });

  it('returns controller instance with expected constructor args', () => {
    const { controller } = defiPositionsControllerV2Init(getInitRequestMock());
    expect(controller).toBeInstanceOf(DeFiPositionsControllerV2);

    const controllerMock = jest.mocked(DeFiPositionsControllerV2);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      apiClient: expect.any(Object),
      isEnabled: expect.any(Function),
      getVsCurrency: expect.any(Function),
    });
  });

  describe('isEnabled', () => {
    it.each([
      {
        basicFunctionality: true,
        completedOnboarding: true,
        flag: true,
        expected: true,
      },
      {
        basicFunctionality: false,
        completedOnboarding: true,
        flag: true,
        expected: false,
      },
      {
        basicFunctionality: true,
        completedOnboarding: false,
        flag: true,
        expected: false,
      },
      {
        basicFunctionality: true,
        completedOnboarding: true,
        flag: false,
        expected: false,
      },
    ])(
      'returns $expected when basicFunctionality=$basicFunctionality, completedOnboarding=$completedOnboarding, flag=$flag',
      ({ basicFunctionality, completedOnboarding, flag, expected }) => {
        (
          selectBasicFunctionalityEnabled as unknown as jest.Mock
        ).mockReturnValue(basicFunctionality);
        (selectCompletedOnboarding as unknown as jest.Mock).mockReturnValue(
          completedOnboarding,
        );
        (selectDefiControllerV2Enabled as unknown as jest.Mock).mockReturnValue(
          flag,
        );

        defiPositionsControllerV2Init(getInitRequestMock());

        const controllerMock = jest.mocked(DeFiPositionsControllerV2);
        const isEnabled = controllerMock.mock.calls[0][0].isEnabled;

        expect(isEnabled()).toBe(expected);
      },
    );
  });

  describe('getVsCurrency', () => {
    it('returns selectedCurrency from AssetsController', () => {
      const requestMock = getInitRequestMock();
      defiPositionsControllerV2Init(requestMock);

      const controllerMock = jest.mocked(DeFiPositionsControllerV2);
      const getVsCurrency = controllerMock.mock.calls[0][0].getVsCurrency;

      expect(getVsCurrency()).toBe('usd');
      expect(requestMock.initMessenger.call).toHaveBeenCalledWith(
        'AssetsController:getState',
      );
    });
  });
});
