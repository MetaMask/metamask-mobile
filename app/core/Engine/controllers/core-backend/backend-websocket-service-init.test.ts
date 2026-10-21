import { BackendWebSocketService } from '@metamask/core-backend';
import Logger from '../../../../util/Logger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { store } from '../../../../store';
import { backendWebSocketServiceInit } from './backend-websocket-service-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { BackendWebSocketServiceInitMessenger } from '../../messengers/core-backend';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/Logger');
jest.mock('@metamask/core-backend');
jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
}));
jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      settings: { basicFunctionalityEnabled: true },
    })),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

describe('backendWebSocketServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(store.getState).mockReturnValue({
      settings: { basicFunctionalityEnabled: true },
    } as ReturnType<typeof store.getState>);
  });

  const arrangeMocks = () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const initRequestMock = buildMessengerClientInitRequestMock(
      baseControllerMessenger,
    );

    const mockInitMessenger = {
      call: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as BackendWebSocketServiceInitMessenger;

    return {
      ...initRequestMock,
      initMessenger: mockInitMessenger,
    };
  };

  const setBasicFunctionality = (enabled: boolean) => {
    jest.mocked(store.getState).mockReturnValue({
      settings: { basicFunctionalityEnabled: enabled },
    } as ReturnType<typeof store.getState>);
  };

  const subscribeToBasicFunctionality = () => {
    const { subscribeToBasicFunctionalityChange } = (
      BackendWebSocketService as jest.Mock
    ).mock.calls[0][0];
    const onChange = jest.fn();
    const unsubscribe = subscribeToBasicFunctionalityChange(onChange);

    return { onChange, unsubscribe };
  };

  const captureBasicFunctionalitySubscription = () => {
    let storeListener: (() => void) | undefined;
    const unsubscribeStore = jest.fn();

    jest.mocked(store.subscribe).mockImplementation((listener) => {
      storeListener = listener;
      return unsubscribeStore;
    });

    return {
      storeListener: () => storeListener,
      unsubscribeStore,
    };
  };

  it('initializes BackendWebSocketService with correct configuration', () => {
    const mocks = arrangeMocks();

    const result = backendWebSocketServiceInit(mocks);

    expect(BackendWebSocketService).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'wss://gateway.api.cx.metamask.io/v1',
      }),
    );
    expect(result.controller).toBeDefined();
    expect(Logger.log).toHaveBeenCalledWith(
      'Initializing BackendWebSocketService',
    );
    expect(Logger.log).toHaveBeenCalledWith(
      'BackendWebSocketService initialized',
    );
  });

  describe('isEnabled callback', () => {
    const getIsEnabledCallback = () => {
      const { isEnabled } = (BackendWebSocketService as jest.Mock).mock
        .calls[0][0];
      return isEnabled;
    };

    it.each([
      [
        'flag resolves to a bare boolean (rff v5 threshold shape)',
        { remoteFeatureFlags: { backendWebSocketConnection: true } },
      ],
      [
        'flag is a legacy { value: true } wrapper',
        { remoteFeatureFlags: { backendWebSocketConnection: { value: true } } },
      ],
    ])('returns true when %s', (_description, mockReturnValue) => {
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue(mockReturnValue);

      backendWebSocketServiceInit(mocks);

      expect(getIsEnabledCallback()()).toBe(true);
      expect(mocks.initMessenger.call).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
    });

    it.each([
      [
        'flag resolves to a bare false (rff v5 threshold shape)',
        { remoteFeatureFlags: { backendWebSocketConnection: false } },
      ],
      [
        'flag is a legacy { value: false } wrapper',
        {
          remoteFeatureFlags: { backendWebSocketConnection: { value: false } },
        },
      ],
      [
        'flag is a string',
        { remoteFeatureFlags: { backendWebSocketConnection: 'invalid' } },
      ],
      [
        'flag has no value property',
        { remoteFeatureFlags: { backendWebSocketConnection: {} } },
      ],
      ['remoteFeatureFlags is undefined', {}],
    ])('returns false when %s', (_description, mockReturnValue) => {
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue(mockReturnValue);

      backendWebSocketServiceInit(mocks);

      expect(getIsEnabledCallback()()).toBe(false);
    });

    it('returns false and logs error when feature flag check throws', () => {
      const mocks = arrangeMocks();
      const testError = new Error('Feature flag check failed');
      (mocks.initMessenger.call as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      backendWebSocketServiceInit(mocks);

      expect(getIsEnabledCallback()()).toBe(false);
      expect(Logger.log).toHaveBeenCalledWith(
        'BackendWebSocketService: Could not check feature flag, defaulting to NOT connect',
        testError,
      );
    });
  });

  describe('isBasicFunctionality', () => {
    it('returns the Basic Functionality setting from the store', () => {
      jest.mocked(store.getState).mockReturnValue({
        settings: { basicFunctionalityEnabled: false },
      } as ReturnType<typeof store.getState>);

      const mocks = arrangeMocks();
      backendWebSocketServiceInit(mocks);

      const { isBasicFunctionality } = (BackendWebSocketService as jest.Mock)
        .mock.calls[0][0];

      expect(isBasicFunctionality()).toBe(false);
    });

    it('notifies the service when Basic Functionality turns off', () => {
      const mocks = arrangeMocks();
      const { storeListener } = captureBasicFunctionalitySubscription();
      backendWebSocketServiceInit(mocks);

      const { onChange } = subscribeToBasicFunctionality();

      setBasicFunctionality(false);
      storeListener()?.();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('notifies the service when Basic Functionality turns on', () => {
      const mocks = arrangeMocks();
      const { storeListener } = captureBasicFunctionalitySubscription();
      backendWebSocketServiceInit(mocks);
      const { onChange } = subscribeToBasicFunctionality();

      setBasicFunctionality(false);
      storeListener()?.();
      onChange.mockClear();

      setBasicFunctionality(true);
      storeListener()?.();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not notify when Basic Functionality is unchanged', () => {
      const mocks = arrangeMocks();
      const { storeListener } = captureBasicFunctionalitySubscription();
      backendWebSocketServiceInit(mocks);
      const { onChange } = subscribeToBasicFunctionality();

      storeListener()?.();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('unsubscribes from the store', () => {
      const mocks = arrangeMocks();
      const { unsubscribeStore } = captureBasicFunctionalitySubscription();
      backendWebSocketServiceInit(mocks);
      const { unsubscribe } = subscribeToBasicFunctionality();

      unsubscribe();

      expect(unsubscribeStore).toHaveBeenCalledTimes(1);
    });
  });
});
