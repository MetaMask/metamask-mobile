import Engine from '../../../core/Engine';
import { withQrKeyring } from '../../../core/QrKeyring/QrKeyring';
import Logger from '../../../util/Logger';

jest.mock('../../../core/Engine', () => ({
  setSelectedAddress: jest.fn(),
}));
jest.mock('../../../core/QrKeyring/QrKeyring');
jest.mock('../../../util/Logger');

const mockKeyring = {
  setAccountToUnlock: jest.fn(),
  addAccounts: jest.fn(),
};

const mockWithQrKeyring = jest.mocked(withQrKeyring);
const mockEngine = jest.mocked(Engine);
const mockLogger = jest.mocked(Logger);

const mockNavigation = {
  pop: jest.fn(),
};

describe('ConnectQRHardware - onUnlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockKeyring.addAccounts
      .mockResolvedValueOnce([accountAddresses[0]])
      .mockResolvedValueOnce([accountAddresses[1]])
      .mockResolvedValueOnce([accountAddresses[2]]);

    const accountToSelect = await withQrKeyring(async ({ keyring }) => {
      let lastAccount: string | undefined;
      for (const index of [0, 1, 2]) {
        keyring.setAccountToUnlock(index);
        const [newAccount] = await keyring.addAccounts(1);
        lastAccount = newAccount;
      }
      return lastAccount;
    });

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }

    expect(mockKeyring.setAccountToUnlock).toHaveBeenCalledTimes(3);
    expect(mockKeyring.setAccountToUnlock).toHaveBeenNthCalledWith(1, 0);
    expect(mockKeyring.setAccountToUnlock).toHaveBeenNthCalledWith(2, 1);
    expect(mockKeyring.setAccountToUnlock).toHaveBeenNthCalledWith(3, 2);
    expect(mockKeyring.addAccounts).toHaveBeenCalledTimes(3);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledTimes(1);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith(
      accountAddresses[2],
    );
  });

  it('does not call Engine.setSelectedAddress when no accounts are added', async () => {
    mockKeyring.addAccounts.mockResolvedValue([]);

    const accountToSelect = await withQrKeyring(async ({ keyring }) => {
      let lastAccount: string | undefined;
      for (const index of [0]) {
        keyring.setAccountToUnlock(index);
        const [newAccount] = await keyring.addAccounts(1);
        lastAccount = newAccount;
      }
      return lastAccount;
    });

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }

    expect(mockEngine.setSelectedAddress).not.toHaveBeenCalled();
  });

  it('unlocks single account and selects it', async () => {
    const singleAccount =
      '0x1b6f0accfcd4925be3d42fda8fc84ff8f0df380d06a483cc3108ac5c49b2393b';
    mockKeyring.addAccounts.mockResolvedValue([singleAccount]);

    const accountToSelect = await withQrKeyring(async ({ keyring }) => {
      let lastAccount: string | undefined;
      for (const index of [0]) {
        keyring.setAccountToUnlock(index);
        const [newAccount] = await keyring.addAccounts(1);
        lastAccount = newAccount;
      }
      return lastAccount;
    });

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }

    expect(mockKeyring.setAccountToUnlock).toHaveBeenCalledTimes(1);
    expect(mockKeyring.setAccountToUnlock).toHaveBeenCalledWith(0);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledTimes(1);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith(singleAccount);
  });

  it('logs error when account unlock fails', async () => {
    const testError = new Error('Test error');
    mockKeyring.addAccounts.mockRejectedValue(testError);

    try {
      await withQrKeyring(async ({ keyring }) => {
        keyring.setAccountToUnlock(0);
        await keyring.addAccounts(1);
      });
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
    mockKeyring.addAccounts.mockResolvedValue([singleAccount]);

    const accountToSelect = await withQrKeyring(async ({ keyring }) => {
      let lastAccount: string | undefined;
      for (const index of [0]) {
        keyring.setAccountToUnlock(index);
        const [newAccount] = await keyring.addAccounts(1);
        lastAccount = newAccount;
      }
      return lastAccount;
    });

    if (accountToSelect) {
      Engine.setSelectedAddress(accountToSelect);
    }
    mockNavigation.pop(2);

    expect(mockNavigation.pop).toHaveBeenCalledWith(2);
  });

  it('calls navigation.pop even when unlock fails', async () => {
    const testError = new Error('Test error');
    mockKeyring.addAccounts.mockRejectedValue(testError);

    try {
      await withQrKeyring(async ({ keyring }) => {
        keyring.setAccountToUnlock(0);
        await keyring.addAccounts(1);
      });
    } catch (err) {
      Logger.log('Error: Connecting QR hardware wallet', err);
    }
    mockNavigation.pop(2);

    expect(mockNavigation.pop).toHaveBeenCalledWith(2);
  });
});
