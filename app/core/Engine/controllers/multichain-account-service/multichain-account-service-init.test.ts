import {
  MultichainAccountService,
  AccountProviderWrapper,
  MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { multichainAccountServiceInit } from './multichain-account-service-init';
import {
  MultichainAccountServiceInitMessenger,
  getMultichainAccountServiceMessenger,
  getMultichainAccountServiceInitMessenger,
} from '../../messengers/multichain-account-service-messenger/multichain-account-service-messenger';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

jest.mock('@metamask/multichain-account-service');

const mockRemoteFeatureFlagControllerGetState = jest.fn();

type MockInitMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MultichainAccountServiceMessenger>
  | MessengerActions<MultichainAccountServiceInitMessenger>,
  | MessengerEvents<MultichainAccountServiceMessenger>
  | MessengerEvents<MultichainAccountServiceInitMessenger>
>;

function getBaseMessenger(): MockInitMessenger {
  return new Messenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

function getInitRequestMock({
  messenger = getBaseMessenger(),
  remoteFeatureFlags = {},
}: {
  messenger?: MockInitMessenger;
  remoteFeatureFlags?: FeatureFlags;
} = {}): jest.Mocked<
  ControllerInitRequest<
    MultichainAccountServiceMessenger,
    MultichainAccountServiceInitMessenger
  >
> {
  // Mock remote feature flag state which is required when initializing the service
  messenger.registerActionHandler(
    'RemoteFeatureFlagController:getState',
    mockRemoteFeatureFlagControllerGetState,
  );
  mockRemoteFeatureFlagControllerGetState.mockImplementation(() => ({
    remoteFeatureFlags,
  }));

  // Get restricted messengers
  const controllerMessenger = getMultichainAccountServiceMessenger(messenger);
  const initMessenger = getMultichainAccountServiceInitMessenger(messenger);

  // Create extended messenger for the base mock
  const extendedControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  // Build the base mock with extended messenger
  const baseMock = buildControllerInitRequestMock(extendedControllerMessenger);

  // Return merged mock with proper messengers
  return {
    ...baseMock,
    controllerMessenger,
    initMessenger,
  };
}

describe('MultichainAccountServiceInit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns service instance', () => {
    expect(
      multichainAccountServiceInit(getInitRequestMock()).controller,
    ).toBeInstanceOf(MultichainAccountService);
  });

  it('initializes with correct messenger and state', () => {
    const initRequestMock = getInitRequestMock();

    multichainAccountServiceInit(initRequestMock);

    const serviceMock = jest.mocked(MultichainAccountService);

    expect(serviceMock).toHaveBeenCalledTimes(1);
    const callArgs = serviceMock.mock.calls[0][0];

    expect(callArgs.messenger).toBe(initRequestMock.controllerMessenger);
    expect(callArgs.providers).toBeDefined();
    if (callArgs.providers) {
      expect(Array.isArray(callArgs.providers)).toBe(true);
    }
  });

  describe('Bitcoin provider feature flag', () => {
    let setEnabledSpy: jest.SpyInstance;
    let alignWalletsSpy: jest.SpyInstance;

    beforeEach(() => {
      setEnabledSpy = jest.spyOn(
        AccountProviderWrapper.prototype,
        'setEnabled',
      );
      setEnabledSpy.mockReturnValue(undefined);

      alignWalletsSpy = jest.spyOn(
        MultichainAccountService.prototype,
        'alignWallets',
      );
      alignWalletsSpy.mockResolvedValue(undefined);
    });

    it('does not enable Bitcoin provider when feature flag is disabled', () => {
      // When initializing the service
      multichainAccountServiceInit(
        getInitRequestMock({
          // Given the feature flag is disabled
          remoteFeatureFlags: {
            bitcoinAccounts: {
              enabled: false,
              minimumVersion: '1.0.0',
            },
          },
        }),
      );

      // Then Bitcoin provider should not be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(false);
      expect(alignWalletsSpy).not.toHaveBeenCalled();
    });

    it('does not enable Bitcoin provider when app version is below minimum', () => {
      // When initializing the service
      multichainAccountServiceInit(
        getInitRequestMock({
          // Given the feature flag indicates version requirement not met
          remoteFeatureFlags: {
            bitcoinAccounts: {
              enabled: true,
              minimumVersion: '99.99.99',
            },
          },
        }),
      );

      // Then Bitcoin provider should not be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(false);
      expect(alignWalletsSpy).not.toHaveBeenCalled();
    });

    it('enables Bitcoin provider when feature flag is enabled and version meets minimum', () => {
      // When initializing the service
      multichainAccountServiceInit(
        getInitRequestMock({
          // Given the feature flag is enabled and version meets minimum
          remoteFeatureFlags: {
            bitcoinAccounts: {
              enabled: true,
              minimumVersion: '1.0.0',
            },
          },
        }),
      );

      // Then Bitcoin provider should be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(true);

      // And alignment triggered
      expect(alignWalletsSpy).toHaveBeenCalledTimes(1);
    });

    it('enables Bitcoin provider when feature flag is enabled at runtime', () => {
      // When initializing the service
      const messenger = getBaseMessenger();
      multichainAccountServiceInit(
        getInitRequestMock({
          messenger,
          // Given the feature flag is not enabled yet
          remoteFeatureFlags: {
            bitcoinAccounts: {
              enabled: false,
              minimumVersion: '1.0.0',
            },
          },
        }),
      );

      // Then Bitcoin provider should not have been called, nor the alignement process
      expect(setEnabledSpy).toHaveBeenCalledWith(false);
      expect(alignWalletsSpy).not.toHaveBeenCalled();

      // Reset spies to check subsequent calls
      setEnabledSpy.mockClear();
      alignWalletsSpy.mockClear();

      // Enabling the remote feature flag would enable the Bitcoin provider
      messenger.publish(
        'RemoteFeatureFlagController:stateChange',
        {
          remoteFeatureFlags: {
            bitcoinAccounts: {
              enabled: true,
              minimumVersion: '1.0.0',
            },
          },
          cacheTimestamp: 0,
        },
        [],
      );

      // Then Bitcoin provider should be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(true);

      // And alignment triggered
      expect(alignWalletsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tron provider feature flag', () => {
    let setEnabledSpy: jest.SpyInstance;
    let alignWalletsSpy: jest.SpyInstance;

    beforeEach(() => {
      setEnabledSpy = jest.spyOn(
        AccountProviderWrapper.prototype,
        'setEnabled',
      );
      setEnabledSpy.mockReturnValue(undefined);

      alignWalletsSpy = jest.spyOn(
        MultichainAccountService.prototype,
        'alignWallets',
      );
      alignWalletsSpy.mockResolvedValue(undefined);
    });

    it('does not enable Tron provider when feature flag is disabled', () => {
      // When initializing the service
      multichainAccountServiceInit(
        getInitRequestMock({
          // Given the feature flag is disabled
          remoteFeatureFlags: {
            tronAccounts: {
              enabled: false,
              minimumVersion: '1.0.0',
            },
          },
        }),
      );

      // Then Tron provider should not be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(false);
      expect(alignWalletsSpy).not.toHaveBeenCalled();
    });

    it('does not enable Tron provider when app version is below minimum', () => {
      // When initializing the service
      multichainAccountServiceInit(
        getInitRequestMock({
          // Given the feature flag indicates version requirement not met
          remoteFeatureFlags: {
            tronAccounts: {
              enabled: true,
              minimumVersion: '99.99.99',
            },
          },
        }),
      );

      // Then Tron provider should not be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(false);
      expect(alignWalletsSpy).not.toHaveBeenCalled();
    });

    it('enables Tron provider when feature flag is enabled and version meets minimum', () => {
      // When initializing the service
      multichainAccountServiceInit(
        getInitRequestMock({
          // Given the feature flag is enabled and version meets minimum
          remoteFeatureFlags: {
            tronAccounts: {
              enabled: true,
              minimumVersion: '1.0.0',
            },
          },
        }),
      );

      // Then Tron provider should be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(true);

      // And alignment triggered
      expect(alignWalletsSpy).toHaveBeenCalled();
    });

    it('enables Tron provider when feature flag is enabled at runtime', () => {
      // When initializing the service
      const messenger = getBaseMessenger();
      multichainAccountServiceInit(
        getInitRequestMock({
          messenger,
          // Given the feature flag is not enabled yet
          remoteFeatureFlags: {
            tronAccounts: {
              enabled: false,
              minimumVersion: '1.0.0',
            },
          },
        }),
      );

      // Then Tron provider should not have been called, nor the alignement process
      expect(setEnabledSpy).toHaveBeenCalledWith(false);
      expect(alignWalletsSpy).not.toHaveBeenCalled();

      // Reset spies to check subsequent calls
      setEnabledSpy.mockClear();
      alignWalletsSpy.mockClear();

      // Enabling the remote feature flag would enable the Tron provider
      messenger.publish(
        'RemoteFeatureFlagController:stateChange',
        {
          remoteFeatureFlags: {
            tronAccounts: {
              enabled: true,
              minimumVersion: '1.0.0',
            },
          },
          cacheTimestamp: 0,
        },
        [],
      );

      // Then Tron provider should be enabled
      expect(setEnabledSpy).toHaveBeenCalledWith(true);

      // And alignment triggered
      expect(alignWalletsSpy).toHaveBeenCalledTimes(1);
    });
  });
});
