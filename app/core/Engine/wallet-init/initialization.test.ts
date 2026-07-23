import { Wallet } from '@metamask/wallet';
import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { initializeWallet } from './initialization';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getNetworkControllerInstanceOptions } from './instance-options/network-controller';
import {
  getTransactionControllerInstanceOptions,
  setupTransactionControllerListeners,
} from './instance-options/transaction-controller';
import { getTransactionControllerInitMessenger } from './messengers/transaction-controller-messenger';

const mockWalletInit = jest.fn().mockResolvedValue([]);
jest.mock('@metamask/wallet', () => ({
  Wallet: jest.fn().mockImplementation(() => ({
    init: mockWalletInit,
    getInstance: jest.fn(),
  })),
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
jest.mock('./instance-options/storage-service', () => ({
  getStorageServiceInstanceOptions: jest.fn(() => 'storage-options'),
}));
jest.mock('./instance-options/transaction-controller', () => ({
  getTransactionControllerInstanceOptions: jest.fn(() => 'transaction-options'),
  setupTransactionControllerListeners: jest.fn(),
}));
jest.mock('./messengers/transaction-controller-messenger', () => ({
  getTransactionControllerInitMessenger: jest.fn(() => 'tx-init-messenger'),
}));

jest.mock('../../../constants/featureFlags', () => ({
  ...jest.requireActual('../../../constants/featureFlags'),
  getDefaultFeatureFlags: jest.fn(() => ({
    defaultFlag: true,
    sharedFlag: 'default-value',
  })),
}));

describe('initializeWallet', () => {
  const messenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  const state = { KeyringController: { vault: 'encrypted-vault-blob' } };
  const seededState = {
    ...state,
    RemoteFeatureFlagController: {
      remoteFeatureFlags: {
        defaultFlag: true,
        sharedFlag: 'default-value',
      },
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs a Wallet, wiring each builder output to its instanceOptions slot', () => {
    initializeWallet({ messenger, state });

    expect(Wallet).toHaveBeenCalledWith({
      messenger,
      state: seededState,
      instanceOptions: {
        approvalController: 'approval-options',
        keyringController: 'keyring-options',
        remoteFeatureFlagController: 'rffc-options',
        connectivityController: 'connectivity-options',
        storageService: 'storage-options',
        networkController: getNetworkControllerInstanceOptions(),
        transactionController: 'transaction-options',
      },
    });
  });

  it('seeds feature-flag defaults UNDER persisted flags so persisted values win', () => {
    initializeWallet({
      messenger,
      state: {
        ...state,
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { sharedFlag: 'persisted-value' },
          cacheTimestamp: 999,
        },
      },
    });

    expect(Wallet).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              // default-only flag is filled in
              defaultFlag: true,
              // persisted value wins over the default
              sharedFlag: 'persisted-value',
            },
            // other persisted fields preserved
            cacheTimestamp: 999,
          },
        }),
      }),
    );
  });

  it('threads the messenger and (unseeded) state through to the builders that need them', () => {
    initializeWallet({ messenger, state });

    expect(getKeyringControllerInstanceOptions).toHaveBeenCalledWith(messenger);
    expect(getRemoteFeatureFlagControllerInstanceOptions).toHaveBeenCalledWith({
      messenger,
      state,
    });
  });

  it('builds the TransactionController options and listeners with the init messenger', () => {
    initializeWallet({ messenger, state });

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
});
