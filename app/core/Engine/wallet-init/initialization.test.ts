import { Wallet } from '@metamask/wallet';
import { initializeWallet } from './initialization';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import type { RootMessenger } from '../types';

jest.mock('@metamask/wallet', () => ({ Wallet: jest.fn() }));
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
  const messenger = {} as RootMessenger;
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
      },
    });
  });

  it('threads the messenger and state through to the builders that need them', () => {
    initializeWallet({ messenger, state });

    expect(getKeyringControllerInstanceOptions).toHaveBeenCalledWith(messenger);
    expect(getRemoteFeatureFlagControllerInstanceOptions).toHaveBeenCalledWith({
      messenger,
      state,
    });
  });
});
