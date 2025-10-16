import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  AccountProviderWrapper,
  BtcAccountProvider,
} from '@metamask/multichain-account-service';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { multichainAccountServiceInit } from './multichain-account-service-init';
import {
  MultichainAccountServiceInitMessenger,
} from '../../messengers/multichain-account-service-messenger/multichain-account-service-messenger';
import { isBitcoinAccountsFeatureEnabled } from '../../../../multichain-bitcoin/remote-feature-flag';

jest.mock('@metamask/multichain-account-service');
jest.mock('../../../../multichain-bitcoin/remote-feature-flag');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    MultichainAccountServiceMessenger,
    MultichainAccountServiceInitMessenger
  >
> {
  const controllerMessengerMock = jest.mocked(
    {} as MultichainAccountServiceMessenger,
  );
  const initMessengerMock = jest.mocked({
    call: jest.fn().mockReturnValue({
      remoteFeatureFlags: { bitcoinAccounts: { enabled: false, minimumVersion: '13.6.0' } },
    }),
    subscribe: jest.fn(),
  } as any);

  const requestMock = buildControllerInitRequestMock(controllerMessengerMock, initMessengerMock);

  return requestMock;
}

describe('MultichainAccountServiceInit', () => {
  const multichainAccountServiceClassMock = jest.mocked(
    MultichainAccountService,
  );
  const accountProviderWrapperMock = jest.mocked(AccountProviderWrapper);
  const btcAccountProviderMock = jest.mocked(BtcAccountProvider);
  const isBitcoinAccountsFeatureEnabledMock = jest.mocked(
    isBitcoinAccountsFeatureEnabled,
  );

  let mockSetEnabled: jest.Mock;
  let mockAlignWallets: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockSetEnabled = jest.fn();
    mockAlignWallets = jest.fn().mockResolvedValue(undefined);
    isBitcoinAccountsFeatureEnabledMock.mockClear();

    // Mock AccountProviderWrapper instance with setEnabled method
    accountProviderWrapperMock.mockImplementation(
      () =>
        ({
          setEnabled: mockSetEnabled,
        } as unknown as AccountProviderWrapper),
    );

    // Mock BtcAccountProvider instance
    btcAccountProviderMock.mockImplementation(
      () => ({} as unknown as BtcAccountProvider),
    );

    // Mock MultichainAccountService instance with alignWallets method
    multichainAccountServiceClassMock.mockImplementation(
      () =>
        ({
          alignWallets: mockAlignWallets,
        } as unknown as MultichainAccountService),
    );

    // Default: feature flag disabled
    isBitcoinAccountsFeatureEnabledMock.mockReturnValue(false);
  });

  it('returns service instance', () => {
    expect(
      multichainAccountServiceInit(getInitRequestMock()).controller,
    ).toBeInstanceOf(MultichainAccountService);
  });

  it('initializes with correct messenger and state', () => {
    const initRequestMock = getInitRequestMock();

    multichainAccountServiceInit(initRequestMock);

    expect(multichainAccountServiceClassMock).toHaveBeenCalledTimes(1);
    const callArgs = multichainAccountServiceClassMock.mock.calls[0][0];

    expect(callArgs.messenger).toBe(initRequestMock.controllerMessenger);
    expect(callArgs.providers).toBeDefined();
    if (callArgs.providers) {
      expect(Array.isArray(callArgs.providers)).toBe(true);
    }
  });

  describe('Bitcoin provider feature flag', () => {
    it('does not enable Bitcoin provider when feature flag is disabled', () => {
      // Given the feature flag is disabled
      isBitcoinAccountsFeatureEnabledMock.mockReturnValue(false);

      // When initializing the service
      multichainAccountServiceInit(getInitRequestMock());

      // Then Bitcoin provider should not be enabled
      expect(mockSetEnabled).not.toHaveBeenCalled();
    });

    it('does not enable Bitcoin provider when app version is below minimum', () => {
      // Given the feature flag indicates version requirement not met
      isBitcoinAccountsFeatureEnabledMock.mockReturnValue(false);

      // When initializing the service
      multichainAccountServiceInit(getInitRequestMock());

      // Then Bitcoin provider should not be enabled
      expect(mockSetEnabled).not.toHaveBeenCalled();
    });

    it('enables Bitcoin provider when feature flag is enabled and version meets minimum', () => {
      // Given the feature flag is enabled and version meets minimum
      isBitcoinAccountsFeatureEnabledMock.mockReturnValue(true);

      // When initializing the service
      const initRequestMock = getInitRequestMock();
      multichainAccountServiceInit(initRequestMock);

      // Then Bitcoin provider should be enabled and alignment triggered
      expect(mockSetEnabled).toHaveBeenCalledTimes(1);
      expect(mockSetEnabled).toHaveBeenCalledWith(true);
      expect(mockAlignWallets).toHaveBeenCalledTimes(1);
    });
  });
});
