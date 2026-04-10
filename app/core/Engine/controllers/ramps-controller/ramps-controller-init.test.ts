import { waitFor } from '@testing-library/react-native';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  RampsControllerState,
  type UserRegion,
} from '@metamask/ramps-controller';
import { rampsControllerInit } from './ramps-controller-init';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import type { RampsControllerInitMessenger } from '../../messengers/ramps-controller-messenger';

const createMockUserRegion = (regionCode: string): UserRegion => {
  const parts = regionCode.toLowerCase().split('-');
  const countryCode = parts[0].toUpperCase();
  const stateCode = parts[1]?.toUpperCase();

  return {
    country: {
      isoCode: countryCode,
      flag: '🏳️',
      name: countryCode,
      phone: { prefix: '', placeholder: '', template: '' },
      currency: '',
      supported: { buy: true, sell: true },
    },
    state: stateCode
      ? {
          stateId: stateCode,
          name: stateCode,
          supported: { buy: true, sell: true },
        }
      : null,
    regionCode: regionCode.toLowerCase(),
  };
};

const mockInit = jest.fn().mockResolvedValue(undefined);

jest.mock('@metamask/ramps-controller', () => {
  const actual = jest.requireActual('@metamask/ramps-controller');

  const MockRampsControllerSpy = jest.fn().mockImplementation(() => {
    const instance = Object.create(MockRampsControllerSpy.prototype);
    instance.constructor = MockRampsControllerSpy;
    instance.init = mockInit;
    return instance;
  });

  MockRampsControllerSpy.prototype = Object.create(
    actual.RampsController.prototype,
  );
  MockRampsControllerSpy.prototype.constructor = MockRampsControllerSpy;
  Object.setPrototypeOf(MockRampsControllerSpy, actual.RampsController);

  return {
    ...actual,
    RampsController: MockRampsControllerSpy,
  };
});

jest.mock('react-native-device-info', () => ({
  getVersion: () => '99.0.0',
}));

jest.mock('../../../../components/UI/Ramp/debug/RampsDebugBridge', () => ({
  __esModule: true,
  initRampsDebugBridge: jest.fn(),
}));

const getInitRampsDebugBridgeMock = (): jest.Mock =>
  (
    jest.requireMock(
      '../../../../components/UI/Ramp/debug/RampsDebugBridge',
    ) as { initRampsDebugBridge: jest.Mock }
  ).initRampsDebugBridge;

const createMockInitMessenger = (
  overrides: {
    enabled?: boolean;
    minimumVersion?: string | null;
  } = {},
): RampsControllerInitMessenger => {
  const { enabled = false, minimumVersion = null } = overrides;

  return {
    call: jest.fn().mockReturnValue({
      remoteFeatureFlags: {
        rampsUnifiedBuyV2: {
          enabled,
          minimumVersion,
        },
      },
    }),
    subscribe: jest.fn(),
  } as unknown as RampsControllerInitMessenger;
};

describe('ramps controller init', () => {
  const rampsControllerClassMock = jest.mocked(RampsController);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<
      RampsControllerMessenger,
      RampsControllerInitMessenger
    >
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInit.mockResolvedValue(undefined);

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = {
      ...buildMessengerClientInitRequestMock(baseControllerMessenger),
      initMessenger: createMockInitMessenger(),
    } as jest.Mocked<
      MessengerClientInitRequest<
        RampsControllerMessenger,
        RampsControllerInitMessenger
      >
    >;
  });

  it('uses default state when no initial state is passed in', () => {
    const defaultRampsControllerState = jest
      .requireActual('@metamask/ramps-controller')
      .getDefaultRampsControllerState();

    rampsControllerInit(initRequestMock);

    const rampsControllerState =
      rampsControllerClassMock.mock.calls[0][0].state;

    expect(rampsControllerState).toEqual(defaultRampsControllerState);
  });

  it('uses initial state when initial state is passed in', () => {
    const defaultState = jest
      .requireActual('@metamask/ramps-controller')
      .getDefaultRampsControllerState() as RampsControllerState;

    const initialRampsControllerState: RampsControllerState = {
      ...defaultState,
      userRegion: createMockUserRegion('us-ca'),
      countries: {
        data: [],
        selected: null,
        isLoading: false,
        error: null,
      },
      providers: {
        data: [],
        selected: null,
        isLoading: false,
        error: null,
      },
      tokens: {
        data: null,
        selected: null,
        isLoading: false,
        error: null,
      },
      paymentMethods: {
        data: [],
        selected: null,
        isLoading: false,
        error: null,
      },
      requests: {},
      nativeProviders: {
        transak: {
          isAuthenticated: false,
          userDetails: {
            data: null,
            selected: null,
            isLoading: false,
            error: null,
          },
          buyQuote: {
            data: null,
            selected: null,
            isLoading: false,
            error: null,
          },
          kycRequirement: {
            data: null,
            selected: null,
            isLoading: false,
            error: null,
          },
        },
      },
      orders: [],
      providerAutoSelected: false,
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      RampsController: initialRampsControllerState,
    };

    rampsControllerInit(initRequestMock);

    const rampsControllerState =
      rampsControllerClassMock.mock.calls[0][0].state;

    expect(rampsControllerState).toStrictEqual(initialRampsControllerState);
  });

  describe('when V2 feature flag is enabled', () => {
    it('calls init at startup', async () => {
      initRequestMock.initMessenger = createMockInitMessenger({
        enabled: true,
        minimumVersion: '1.0.0',
      });

      rampsControllerInit(initRequestMock);

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalledTimes(1);
      });
    });

    it('calls init when remote flags were off at startup then V2 enables on RemoteFeatureFlagController:stateChange', async () => {
      let remoteEnabled = false;
      const subscribeMock = jest.fn();
      const initMessenger = {
        call: jest.fn(() => ({
          remoteFeatureFlags: {
            rampsUnifiedBuyV2: remoteEnabled
              ? { enabled: true, minimumVersion: '1.0.0' }
              : { enabled: false },
          },
        })),
        subscribe: subscribeMock,
      } as unknown as RampsControllerInitMessenger;

      initRequestMock.initMessenger = initMessenger;

      rampsControllerInit(initRequestMock);

      expect(mockInit).not.toHaveBeenCalled();

      const stateChangeHandler = subscribeMock.mock.calls.find(
        (call) => call[0] === 'RemoteFeatureFlagController:stateChange',
      )?.[1] as () => void;

      expect(stateChangeHandler).toBeDefined();

      remoteEnabled = true;
      stateChangeHandler();

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalledTimes(1);
      });
    });

    it('handles init failure gracefully', async () => {
      initRequestMock.initMessenger = createMockInitMessenger({
        enabled: true,
        minimumVersion: '1.0.0',
      });
      mockInit.mockRejectedValue(new Error('Network error'));

      expect(() => rampsControllerInit(initRequestMock)).not.toThrow();

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when V2 feature flag is disabled', () => {
    it('does not call init at startup', async () => {
      initRequestMock.initMessenger = createMockInitMessenger({
        enabled: false,
      });

      rampsControllerInit(initRequestMock);

      await waitFor(() => {
        expect(mockInit).not.toHaveBeenCalled();
      });
    });

    it('does not call init when enabled is true but minimumVersion is missing', async () => {
      initRequestMock.initMessenger = createMockInitMessenger({
        enabled: true,
        minimumVersion: null,
      });

      rampsControllerInit(initRequestMock);

      await waitFor(() => {
        expect(mockInit).not.toHaveBeenCalled();
      });
    });

    it('does not call init when RemoteFeatureFlagController throws', async () => {
      initRequestMock.initMessenger = {
        call: jest.fn().mockImplementation(() => {
          throw new Error('Controller not ready');
        }),
        subscribe: jest.fn(),
      } as unknown as RampsControllerInitMessenger;

      rampsControllerInit(initRequestMock);

      await waitFor(() => {
        expect(mockInit).not.toHaveBeenCalled();
      });
    });
  });

  it('always returns the controller instance regardless of flag state', () => {
    initRequestMock.initMessenger = createMockInitMessenger({
      enabled: false,
    });

    const result = rampsControllerInit(initRequestMock);

    expect(result.messengerClient).toBeDefined();
    expect(rampsControllerClassMock).toHaveBeenCalledTimes(1);
  });

  describe('when __DEV__ is true', () => {
    let previousDev: boolean;
    let previousRampsDebugDashboard: string | undefined;

    const getDevGlobal = (): { __DEV__: boolean } =>
      globalThis as unknown as { __DEV__: boolean };

    beforeEach(() => {
      previousDev = getDevGlobal().__DEV__;
      previousRampsDebugDashboard = process.env.RAMPS_DEBUG_DASHBOARD;
      delete process.env.RAMPS_DEBUG_DASHBOARD;
      getDevGlobal().__DEV__ = true;
      getInitRampsDebugBridgeMock().mockClear();
    });

    afterEach(() => {
      getDevGlobal().__DEV__ = previousDev;
      if (previousRampsDebugDashboard === undefined) {
        delete process.env.RAMPS_DEBUG_DASHBOARD;
      } else {
        process.env.RAMPS_DEBUG_DASHBOARD = previousRampsDebugDashboard;
      }
    });

    it('requires RampsDebugBridge and calls initRampsDebugBridge with controller and messenger', () => {
      process.env.RAMPS_DEBUG_DASHBOARD = 'true';
      initRequestMock.initMessenger = createMockInitMessenger({
        enabled: false,
      });

      const { messengerClient } = rampsControllerInit(initRequestMock);
      const initRampsDebugBridge = getInitRampsDebugBridgeMock();

      expect(initRampsDebugBridge).toHaveBeenCalledTimes(1);
      expect(initRampsDebugBridge).toHaveBeenCalledWith(
        messengerClient,
        initRequestMock.controllerMessenger,
      );
    });

    it('does not load RampsDebugBridge when RAMPS_DEBUG_DASHBOARD is false', () => {
      process.env.RAMPS_DEBUG_DASHBOARD = 'false';
      initRequestMock.initMessenger = createMockInitMessenger({
        enabled: false,
      });

      rampsControllerInit(initRequestMock);

      expect(getInitRampsDebugBridgeMock()).not.toHaveBeenCalled();
    });

    it('does not load RampsDebugBridge when RAMPS_DEBUG_DASHBOARD is unset', () => {
      initRequestMock.initMessenger = createMockInitMessenger({
        enabled: false,
      });

      rampsControllerInit(initRequestMock);

      expect(getInitRampsDebugBridgeMock()).not.toHaveBeenCalled();
    });
  });
});
