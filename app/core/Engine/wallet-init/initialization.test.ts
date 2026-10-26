import { Wallet } from '@metamask/wallet';
import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { initializeWallet } from './initialization';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import {
  getTransactionControllerInstanceOptions,
  setupTransactionControllerListeners,
} from './instance-options/transaction-controller';
import { getTransactionControllerInitMessenger } from './messengers/transaction-controller-messenger';
import DomainProxyMap from '../../../lib/DomainProxyMap/DomainProxyMap';
import { unrestrictedMethods } from '../../Permissions/specifications';
import { getLedgerDmkMode, initializeLedgerDmkMode } from '../../Ledger/dmk';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { getAnalyticsControllerInstanceOptions } from './instance-options/analytics-controller';
import { setupAnalyticsControllerEffects } from '../controllers/analytics-controller/setup-analytics-effects';
import { getAnalyticsControllerInitMessenger } from '../messengers/analytics-controller-messenger';
import Logger from '../../../util/Logger';

const mockWalletInit = jest.fn().mockResolvedValue([]);
jest.mock('@metamask/wallet', () => ({
  Wallet: jest.fn().mockImplementation(() => ({
    init: mockWalletInit,
    getInstance: jest.fn(),
  })),
}));
jest.mock('./instance-options/analytics-controller', () => ({
  getAnalyticsControllerInstanceOptions: jest.fn(() => 'analytics-options'),
}));
jest.mock(
  '../controllers/analytics-controller/setup-analytics-effects',
  () => ({
    setupAnalyticsControllerEffects: jest.fn(),
  }),
);
jest.mock('../messengers/analytics-controller-messenger', () => ({
  getAnalyticsControllerInitMessenger: jest.fn(
    () => 'analytics-init-messenger',
  ),
}));
jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('./instance-options/approval-controller', () => ({
  getApprovalControllerInstanceOptions: jest.fn(() => 'approval-options'),
}));
jest.mock('./instance-options/keyring-controller', () => ({
  getKeyringControllerInstanceOptions: jest.fn(() => 'keyring-options'),
}));
jest.mock('./instance-options/remote-feature-flag-controller', () => ({
  getRemoteFeatureFlagControllerInstanceOptions: jest.fn(() => 'rffc-options'),
}));
jest.mock('./instance-options/connectivity-controller', () => ({
  getConnectivityControllerInstanceOptions: jest.fn(
    () => 'connectivity-options',
  ),
}));
jest.mock('./instance-options/gas-fee-controller', () => ({
  getGasFeeControllerInstanceOptions: jest.fn(() => 'gas-fee-options'),
}));
jest.mock('./instance-options/seedless-onboarding-controller', () => ({
  getSeedlessOnboardingControllerInstanceOptions: jest.fn(
    () => 'seedless-options',
  ),
}));
jest.mock('./instance-options/storage-service', () => ({
  getStorageServiceInstanceOptions: jest.fn(() => 'storage-options'),
}));
jest.mock('./instance-options/subscription-service', () => ({
  getSubscriptionServiceInstanceOptions: jest.fn(
    () => 'subscription-service-options',
  ),
}));
jest.mock('./instance-options/shield-api-service', () => ({
  getShieldApiServiceInstanceOptions: jest.fn(
    () => 'shield-api-service-options',
  ),
}));
jest.mock('./instance-options/claims-service', () => ({
  getClaimsServiceInstanceOptions: jest.fn(() => 'claims-service-options'),
}));
jest.mock('./instance-options/config-registry-api-service', () => ({
  getConfigRegistryApiServiceInstanceOptions: jest.fn(
    () => 'config-registry-api-service-options',
  ),
}));
jest.mock('./instance-options/network-controller', () => ({
  getNetworkControllerInstanceOptions: jest.fn(() => 'network-options'),
}));
jest.mock('./instance-options/transaction-controller', () => ({
  getTransactionControllerInstanceOptions: jest.fn(() => 'transaction-options'),
  setupTransactionControllerListeners: jest.fn(),
}));
jest.mock('./messengers/transaction-controller-messenger', () => ({
  getTransactionControllerInitMessenger: jest.fn(() => 'tx-init-messenger'),
}));

describe('initializeWallet', () => {
  const messenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  const analyticsId = 'mmkv-analytics-id';
  const state = { KeyringController: { vault: 'encrypted-vault-blob' } };
  beforeEach(() => {
    jest.clearAllMocks();
    initializeLedgerDmkMode({});
  });

  it('constructs a Wallet, wiring each builder output to its instanceOptions slot', () => {
    initializeWallet({ messenger, state, analyticsId });

    expect(Wallet).toHaveBeenCalledWith({
      messenger,
      state: {
        ...state,
        AnalyticsController: { analyticsId },
      },
      instanceOptions: {
        analyticsController: 'analytics-options',
        approvalController: 'approval-options',
        keyringController: 'keyring-options',
        remoteFeatureFlagController: 'rffc-options',
        connectivityController: 'connectivity-options',
        gasFeeController: 'gas-fee-options',
        seedlessOnboardingController: 'seedless-options',
        storageService: 'storage-options',
        subscriptionService: 'subscription-service-options',
        shieldApiService: 'shield-api-service-options',
        claimsService: 'claims-service-options',
        configRegistryApiService: 'config-registry-api-service-options',
        networkController: 'network-options',
        permissionController: {
          caveatSpecifications: expect.any(Object),
          permissionSpecifications: expect.any(Object),
          unrestrictedMethods,
        },
        selectedNetworkController: {
          domainProxyMap: new DomainProxyMap(),
        },
        transactionController: 'transaction-options',
      },
    });
  });

  it('threads the messenger and state through to the builders that need them', () => {
    initializeWallet({ messenger, state, analyticsId });

    expect(getKeyringControllerInstanceOptions).toHaveBeenCalledWith(
      messenger,
      false,
    );
    expect(getRemoteFeatureFlagControllerInstanceOptions).toHaveBeenCalledWith({
      messenger,
      state,
    });
  });

  it('builds the TransactionController options and listeners with the init messenger', () => {
    initializeWallet({ messenger, state, analyticsId });

    expect(getTransactionControllerInitMessenger).toHaveBeenCalledWith(
      messenger,
    );
    expect(getTransactionControllerInstanceOptions).toHaveBeenCalledWith({
      initMessenger: 'tx-init-messenger',
    });
    expect(setupTransactionControllerListeners).toHaveBeenCalledWith({
      messenger: 'tx-init-messenger',
    });
  });

  it('sets up TransactionController listeners before constructing the Wallet, so the TransactionController can emit events to the wallet messenger during initialization', () => {
    initializeWallet({ messenger, state, analyticsId });

    const setupListenersCallOrder = jest.mocked(
      setupTransactionControllerListeners,
    ).mock.invocationCallOrder[0];
    const walletConstructorCallOrder =
      jest.mocked(Wallet).mock.invocationCallOrder[0];

    expect(setupListenersCallOrder).toBeLessThan(walletConstructorCallOrder);
  });

  it('seeds the process-lifetime Ledger transport mode from the persisted ledgerDmk flag and threads it to the keyring builders', () => {
    const stateWithDmkEnabled = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: { [FeatureFlagNames.ledgerDmk]: true },
      },
    };

    initializeWallet({
      messenger,
      state: stateWithDmkEnabled,
      analyticsId,
    });

    expect(getKeyringControllerInstanceOptions).toHaveBeenCalledWith(
      messenger,
      true,
    );
    // Adapter creation reads this same value.
    expect(getLedgerDmkMode()).toBe(true);
  });

  it('lets localOverrides win over remoteFeatureFlags when seeding the Ledger transport mode', () => {
    const stateWithConflictingFlags = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: { [FeatureFlagNames.ledgerDmk]: true },
        localOverrides: { [FeatureFlagNames.ledgerDmk]: false },
      },
    };

    initializeWallet({
      messenger,
      state: stateWithConflictingFlags,
      analyticsId,
    });

    expect(getLedgerDmkMode()).toBe(false);
    expect(getKeyringControllerInstanceOptions).toHaveBeenCalledWith(
      messenger,
      false,
    );
  });

  it('re-seeds the Ledger transport mode from fresh persisted state on a subsequent Engine initialization', () => {
    const stateWithDmkEnabled = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: { [FeatureFlagNames.ledgerDmk]: true },
      },
    };
    const stateWithDmkDisabled = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: { [FeatureFlagNames.ledgerDmk]: false },
      },
    };

    initializeWallet({
      messenger,
      state: stateWithDmkEnabled,
      analyticsId,
    });
    expect(getLedgerDmkMode()).toBe(true);

    initializeWallet({
      messenger,
      state: stateWithDmkDisabled,
      analyticsId,
    });
    expect(getLedgerDmkMode()).toBe(false);
  });

  it('stamps the MMKV analytics id over a persisted analytics id', () => {
    initializeWallet({
      messenger,
      state: {
        AnalyticsController: {
          analyticsId: 'persisted-analytics-id',
          optedIn: true,
        },
      },
      analyticsId,
    });

    expect(getAnalyticsControllerInstanceOptions).toHaveBeenCalledWith(
      analyticsId,
    );
    expect(Wallet).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          AnalyticsController: {
            analyticsId,
            optedIn: true,
          },
        }),
      }),
    );
  });

  it('installs mobile analytics effects after the wallet messenger exists', () => {
    initializeWallet({ messenger, state, analyticsId });

    expect(getAnalyticsControllerInitMessenger).toHaveBeenCalledWith(messenger);
    expect(setupAnalyticsControllerEffects).toHaveBeenCalledWith(
      'analytics-init-messenger',
    );
    const walletConstructorCallOrder =
      jest.mocked(Wallet).mock.invocationCallOrder[0];
    const effectsCallOrder = jest.mocked(setupAnalyticsControllerEffects).mock
      .invocationCallOrder[0];
    expect(walletConstructorCallOrder).toBeLessThan(effectsCallOrder);
  });

  it('logs controller init rejections from wallet.init', async () => {
    const failure = new Error('analytics init failed');
    mockWalletInit.mockResolvedValueOnce([
      { status: 'rejected', reason: failure },
    ]);

    initializeWallet({ messenger, state, analyticsId });
    await Promise.resolve();

    expect(Logger.error).toHaveBeenCalledWith(
      failure,
      'initializeWallet: controller init failed',
    );
  });
});
