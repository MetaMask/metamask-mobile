import { Wallet } from '@metamask/wallet';
import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { initializeWallet } from './initialization';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getNetworkControllerInstanceOptions } from './instance-options/network-controller';

const mockWalletInit = jest.fn().mockResolvedValue([]);
jest.mock('@metamask/wallet', () => ({
  Wallet: jest.fn().mockImplementation(() => ({ init: mockWalletInit })),
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

describe('initializeWallet', () => {
  const messenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  const state = { KeyringController: { vault: 'encrypted-vault-blob' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs a Wallet, wiring each builder output to its instanceOptions slot', () => {
    initializeWallet({ messenger, state });

    expect(Wallet).toHaveBeenCalledWith({
      messenger,
      state,
      instanceOptions: {
        approvalController: 'approval-options',
        keyringController: 'keyring-options',
        remoteFeatureFlagController: 'rffc-options',
        connectivityController: 'connectivity-options',
        storageService: 'storage-options',
        networkController: getNetworkControllerInstanceOptions(),
      },
    });
  });

  it('threads the messenger and state through to the builders that need them', () => {
    initializeWallet({ messenger, state });

    // Second arg is the resolved ledgerDmk flag, threaded into the keyring
    // builders so the Ledger bridge choice matches the adapter choice.
    expect(getKeyringControllerInstanceOptions).toHaveBeenCalledWith(
      messenger,
      expect.any(Boolean),
    );
    expect(getRemoteFeatureFlagControllerInstanceOptions).toHaveBeenCalledWith({
      messenger,
      state,
    });
  });
});
