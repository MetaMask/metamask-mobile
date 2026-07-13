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
import type { RootState } from '../../../reducers';
import { getPreferencesControllerInitialState } from './instance-options/preferences-controller';

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
jest.mock('./instance-options/preferences-controller', () => ({
  getPreferencesControllerInitialState: jest.fn(() => ({
    ipfsGateway: 'seeded-preferences-state',
  })),
}));

describe('initializeWallet', () => {
  const messenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  const state = { KeyringController: { vault: 'encrypted-vault-blob' } };
  const getState = jest.fn(() => ({}) as RootState);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs a Wallet, wiring each builder output to its instanceOptions slot', () => {
    initializeWallet({ getState, messenger, state });

    expect(Wallet).toHaveBeenCalledWith({
      messenger,
      state: {
        ...state,
        PreferencesController: { ipfsGateway: 'seeded-preferences-state' },
      },
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

  it('threads the messenger and state through to the builders that need them', () => {
    initializeWallet({ getState, messenger, state });

    expect(getKeyringControllerInstanceOptions).toHaveBeenCalledWith(messenger);
    expect(getRemoteFeatureFlagControllerInstanceOptions).toHaveBeenCalledWith({
      messenger,
      state,
    });
    expect(getPreferencesControllerInitialState).toHaveBeenCalledWith(state);
  });

  it('builds the TransactionController options and listeners with the init messenger', () => {
    initializeWallet({ getState, messenger, state });

    expect(getTransactionControllerInitMessenger).toHaveBeenCalledWith(
      messenger,
    );
    expect(getTransactionControllerInstanceOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        getState,
        initMessenger: 'tx-init-messenger',
      }),
    );
    expect(setupTransactionControllerListeners).toHaveBeenCalledWith({
      getState,
      messenger: 'tx-init-messenger',
    });
  });
});
