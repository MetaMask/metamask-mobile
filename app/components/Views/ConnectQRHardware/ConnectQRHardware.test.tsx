import Engine from '../../../core/Engine';
import { withQrKeyring } from '../../../core/QrKeyring/QrKeyring';
import Logger from '../../../util/Logger';

jest.mock('../../../core/Engine', () => ({
  setSelectedAddress: jest.fn(),
}));
jest.mock('../../../core/QrKeyring/QrKeyring');
jest.mock('../../../util/Logger');

const mockKeyring = {
  createAccounts: jest.fn(),
  getMode: jest.fn(() => 'hd'),
  entropySource: 'test-entropy-source',
};

const mockWithQrKeyring = jest.mocked(withQrKeyring);
const mockEngine = jest.mocked(Engine);
const mockLogger = jest.mocked(Logger);

const mockNavigation = {
  pop: jest.fn(),
};

const runUnlockFlow = async (accountIndexs: number[]) =>
  withQrKeyring(async ({ keyring }) => {
    let lastAccount: string | undefined;
    const isAccountMode = keyring.getMode() === 'account';
    for (const index of accountIndexs) {
      const [newAccount] = isAccountMode
        ? await keyring.createAccounts({
            type: 'custom',
            entropySource: keyring.entropySource,
            addressIndex: index,
          })
        : await keyring.createAccounts({
            type: 'bip44:derive-index',
            entropySource: keyring.entropySource,
            groupIndex: index,
          });
      lastAccount = newAccount?.address;
    }
    return lastAccount;
  });

describe('ConnectQRHardware - onUnlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyring.getMode.mockReturnValue('hd');
    mockWithQrKeyring.mockImplementation(async (operation) =>
      // @ts-expect-error - Partial mock implementation
      operation({ keyring: mockKeyring }),
    );
  });

  it('unlocks multiple accounts and selects the last account', async () => {
    const accountAddresses = [
      '0x1b6f0accfcd4925be3d42fda8fc84ff8f0df380d06a483cc3108ac5c49b2393b',
      '0x404d72a067b525af00381377dd3e8bb0e3107c01f7d1c708085d0264fe9273f6',
      '0x6c2c3068214287a62323f21b6e4721b733cdec50ac9f1be2d666df7a2c99a825',
    ];
    mockKeyring.createAccounts
      .mockResolvedValueOnce([{ address: accountAddresses[0] }])
      .mockResolvedValueOnce([{ address: accountAddresses[1] }])
      .mockResolvedValueOnce([{ address: accountAddresses[2] }]);

    const accountToSelect = await runUnlockFlow([0, 1, 2]);

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }

    expect(mockKeyring.createAccounts).toHaveBeenCalledTimes(3);
    expect(mockKeyring.createAccounts).toHaveBeenNthCalledWith(1, {
      type: 'bip44:derive-index',
      entropySource: 'test-entropy-source',
      groupIndex: 0,
    });
    expect(mockKeyring.createAccounts).toHaveBeenNthCalledWith(2, {
      type: 'bip44:derive-index',
      entropySource: 'test-entropy-source',
      groupIndex: 1,
    });
    expect(mockKeyring.createAccounts).toHaveBeenNthCalledWith(3, {
      type: 'bip44:derive-index',
      entropySource: 'test-entropy-source',
      groupIndex: 2,
    });
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledTimes(1);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith(
      accountAddresses[2],
    );
  });

  it('does not call Engine.setSelectedAddress when no accounts are added', async () => {
    mockKeyring.createAccounts.mockResolvedValue([]);

    const accountToSelect = await runUnlockFlow([0]);

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }

    expect(mockEngine.setSelectedAddress).not.toHaveBeenCalled();
  });

  it('unlocks single account and selects it', async () => {
    const singleAccount =
      '0x1b6f0accfcd4925be3d42fda8fc84ff8f0df380d06a483cc3108ac5c49b2393b';
    mockKeyring.createAccounts.mockResolvedValue([{ address: singleAccount }]);

    const accountToSelect = await runUnlockFlow([0]);

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }

    expect(mockKeyring.createAccounts).toHaveBeenCalledTimes(1);
    expect(mockKeyring.createAccounts).toHaveBeenCalledWith({
      type: 'bip44:derive-index',
      entropySource: 'test-entropy-source',
      groupIndex: 0,
    });
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledTimes(1);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith(singleAccount);
  });

  it('uses custom account creation for Account-mode devices', async () => {
    mockKeyring.getMode.mockReturnValue('account');
    const singleAccount =
      '0x1b6f0accfcd4925be3d42fda8fc84ff8f0df380d06a483cc3108ac5c49b2393b';
    mockKeyring.createAccounts.mockResolvedValue([{ address: singleAccount }]);

    await runUnlockFlow([3]);

    expect(mockKeyring.createAccounts).toHaveBeenCalledWith({
      type: 'custom',
      entropySource: 'test-entropy-source',
      addressIndex: 3,
    });
  });

  it('logs error when account unlock fails', async () => {
    const testError = new Error('Test error');
    mockKeyring.createAccounts.mockRejectedValue(testError);

    try {
      await runUnlockFlow([0]);
    } catch (err) {
      Logger.log('Error: Connecting QR hardware wallet', err);
    }

    expect(mockLogger.log).toHaveBeenCalledWith(
      'Error: Connecting QR hardware wallet',
      testError,
    );
    expect(mockEngine.setSelectedAddress).not.toHaveBeenCalled();
  });

  it('calls navigation.pop after successful unlock', async () => {
    const singleAccount =
      '0x1b6f0accfcd4925be3d42fda8fc84ff8f0df380d06a483cc3108ac5c49b2393b';
    mockKeyring.createAccounts.mockResolvedValue([{ address: singleAccount }]);

    const accountToSelect = await runUnlockFlow([0]);

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }
    mockNavigation.pop(2);

    expect(mockNavigation.pop).toHaveBeenCalledWith(2);
  });

  it('calls navigation.pop even when unlock fails', async () => {
    const testError = new Error('Test error');
    mockKeyring.createAccounts.mockRejectedValue(testError);

    try {
      await runUnlockFlow([0]);
    } catch (err) {
      Logger.log('Error: Connecting QR hardware wallet', err);
    }
    mockNavigation.pop(2);

    expect(mockNavigation.pop).toHaveBeenCalledWith(2);
  });
});
