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

  const captureBasicFunctionalitySubscription = (
    mocks: ReturnType<typeof arrangeMocks>,
  ) => {
    let storeListener: (() => void) | undefined;
    let remoteFeatureFlagListener:
      | ((state: {
          cacheTimestamp: number;
          remoteFeatureFlags: Record<string, unknown>;
        }) => void)
      | undefined;
    const unsubscribeStore = jest.fn();

    jest.mocked(store.subscribe).mockImplementation((listener) => {
      storeListener = listener;
      return unsubscribeStore;
    });
    (mocks.initMessenger.subscribe as jest.Mock).mockImplementation(
      (_event: string, listener: typeof remoteFeatureFlagListener) => {
        remoteFeatureFlagListener = listener;
      },
    );

    return {
      storeListener: () => storeListener,
      remoteFeatureFlagListener: () => remoteFeatureFlagListener,
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

    it('returns false when basic functionality is off even if the feature flag is on', () => {
      jest.mocked(store.getState).mockReturnValue({
        settings: { basicFunctionalityEnabled: false },
      } as ReturnType<typeof store.getState>);
      const mocks = arrangeMocks();
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        remoteFeatureFlags: { backendWebSocketConnection: true },
      });

      backendWebSocketServiceInit(mocks);

      expect(getIsEnabledCallback()()).toBe(false);
      expect(mocks.initMessenger.call).not.toHaveBeenCalled();
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
      const { storeListener } = captureBasicFunctionalitySubscription(mocks);
      backendWebSocketServiceInit(mocks);

      const { onChange } = subscribeToBasicFunctionality();

      setBasicFunctionality(false);
      storeListener()?.();

      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('reconnects immediately when Basic Functionality turns on and remote flags are already loaded', () => {
      const mocks = arrangeMocks();
      const { storeListener } = captureBasicFunctionalitySubscription(mocks);
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        cacheTimestamp: 1_700_000_000_000,
        remoteFeatureFlags: { backendWebSocketConnection: true },
      });
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

    it('waits for the remote feature flag refetch before reconnecting when Basic Functionality turns on', () => {
      const mocks = arrangeMocks();
      const { storeListener, remoteFeatureFlagListener } =
        captureBasicFunctionalitySubscription(mocks);
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        cacheTimestamp: 0,
        remoteFeatureFlags: {},
      });
      backendWebSocketServiceInit(mocks);
      const { onChange } = subscribeToBasicFunctionality();

      setBasicFunctionality(false);
      storeListener()?.();
      onChange.mockClear();

      setBasicFunctionality(true);
      storeListener()?.();

      expect(onChange).not.toHaveBeenCalled();

      remoteFeatureFlagListener()?.({
        cacheTimestamp: 0,
        remoteFeatureFlags: {},
      });

      expect(onChange).not.toHaveBeenCalled();

      remoteFeatureFlagListener()?.({
        cacheTimestamp: 1_700_000_000_000,
        remoteFeatureFlags: { backendWebSocketConnection: true },
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('reconnects when the websocket flag is restored before the cache timestamp', () => {
      const mocks = arrangeMocks();
      const { storeListener, remoteFeatureFlagListener } =
        captureBasicFunctionalitySubscription(mocks);
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        cacheTimestamp: 0,
        remoteFeatureFlags: {},
      });
      backendWebSocketServiceInit(mocks);
      const { onChange } = subscribeToBasicFunctionality();

      setBasicFunctionality(false);
      storeListener()?.();
      setBasicFunctionality(true);
      storeListener()?.();
      onChange.mockClear();

      remoteFeatureFlagListener()?.({
        cacheTimestamp: 0,
        remoteFeatureFlags: { backendWebSocketConnection: true },
      });

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('drops a deferred reconnect when Basic Functionality turns off before flags return', () => {
      const mocks = arrangeMocks();
      const { storeListener, remoteFeatureFlagListener } =
        captureBasicFunctionalitySubscription(mocks);
      (mocks.initMessenger.call as jest.Mock).mockReturnValue({
        cacheTimestamp: 0,
        remoteFeatureFlags: {},
      });
      backendWebSocketServiceInit(mocks);
      const { onChange } = subscribeToBasicFunctionality();

      setBasicFunctionality(false);
      storeListener()?.();
      setBasicFunctionality(true);
      storeListener()?.();
      setBasicFunctionality(false);
      storeListener()?.();
      onChange.mockClear();

      remoteFeatureFlagListener()?.({
        cacheTimestamp: 1_700_000_000_000,
        remoteFeatureFlags: { backendWebSocketConnection: true },
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps waiting for remote flags when the feature flag read throws', () => {
      const mocks = arrangeMocks();
      const { storeListener, remoteFeatureFlagListener } =
        captureBasicFunctionalitySubscription(mocks);
      const testError = new Error('Feature flag state unavailable');
      (mocks.initMessenger.call as jest.Mock).mockImplementation(() => {
        throw testError;
      });
      backendWebSocketServiceInit(mocks);
      const { onChange } = subscribeToBasicFunctionality();

      setBasicFunctionality(false);
      storeListener()?.();
      onChange.mockClear();

      setBasicFunctionality(true);
      storeListener()?.();

      expect(onChange).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(
        'BackendWebSocketService: Could not check feature flag, waiting for the refetch before connecting',
        testError,
      );

      remoteFeatureFlagListener()?.({
        cacheTimestamp: 1_700_000_000_000,
        remoteFeatureFlags: { backendWebSocketConnection: true },
      });

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('unsubscribes from the store and remote feature flag updates', () => {
      const mocks = arrangeMocks();
      const { unsubscribeStore, remoteFeatureFlagListener } =
        captureBasicFunctionalitySubscription(mocks);
      backendWebSocketServiceInit(mocks);
      const { unsubscribe } = subscribeToBasicFunctionality();

      unsubscribe();

      expect(unsubscribeStore).toHaveBeenCalledTimes(1);
      expect(mocks.initMessenger.unsubscribe).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:stateChange',
        remoteFeatureFlagListener(),
      );
    });
  });
});
