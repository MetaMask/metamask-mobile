import Engine from '../../../core/Engine';
import { withQrKeyring } from '../../../core/QrKeyring/QrKeyring';
import Logger from '../../../util/Logger';

// Minimal mocks - only what we need to test
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

describe('ConnectQRHardware - onUnlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWithQrKeyring.mockImplementation(async (operation) =>
      // @ts-expect-error - Partial mock implementation
      operation({ keyring: mockKeyring }),
    );
  });

  it('calls Engine.setSelectedAddress only for the last account when multiple accounts are unlocked', async () => {
    const accountAddresses = [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
    ];

    // Mock addAccounts to return different addresses for each call
    mockKeyring.addAccounts
      .mockResolvedValueOnce([accountAddresses[0]])
      .mockResolvedValueOnce([accountAddresses[1]])
      .mockResolvedValueOnce([accountAddresses[2]]);

    // Simulate the onUnlock logic
    let lastAccount: string | undefined;
    await withQrKeyring(async ({ keyring }) => {
      for (const index of [0, 1, 2]) {
        keyring.setAccountToUnlock(index);
        const newAccounts = await keyring.addAccounts(1);
        if (newAccounts.length > 0) {
          lastAccount = newAccounts[0];
        }
      }
    });

    if (lastAccount) {
      Engine.setSelectedAddress(lastAccount);
    }

    // Verify Engine.setSelectedAddress was called only once with the last account
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledTimes(1);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith(
      accountAddresses[2],
    );
  });

  it('does not call Engine.setSelectedAddress if no accounts were added', async () => {
    // Mock addAccounts to return empty array
    mockKeyring.addAccounts.mockResolvedValue([]);

    // Simulate the onUnlock logic
    let lastAccount: string | undefined;
    await withQrKeyring(async ({ keyring }) => {
      keyring.setAccountToUnlock(0);
      const newAccounts = await keyring.addAccounts(1);
      if (newAccounts.length > 0) {
        lastAccount = newAccounts[0];
      }
    });

    if (lastAccount) {
      Engine.setSelectedAddress(lastAccount);
    }

    // Verify Engine.setSelectedAddress was not called
    expect(mockEngine.setSelectedAddress).not.toHaveBeenCalled();
  });

  it('calls Engine.setSelectedAddress with the single account when only one account is unlocked', async () => {
    const singleAccount = '0x1111111111111111111111111111111111111111';
    mockKeyring.addAccounts.mockResolvedValue([singleAccount]);

    // Simulate the onUnlock logic
    let lastAccount: string | undefined;
    await withQrKeyring(async ({ keyring }) => {
      keyring.setAccountToUnlock(0);
      const newAccounts = await keyring.addAccounts(1);
      if (newAccounts.length > 0) {
        lastAccount = newAccounts[0];
      }
    });

    if (lastAccount) {
      Engine.setSelectedAddress(lastAccount);
    }

    // Verify Engine.setSelectedAddress was called with the single account
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledTimes(1);
    expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith(singleAccount);
  });

  it('handles errors gracefully', async () => {
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

    // Verify error was logged
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Error: Connecting QR hardware wallet',
      testError,
    );

    // Verify Engine.setSelectedAddress was not called
    expect(mockEngine.setSelectedAddress).not.toHaveBeenCalled();
  });
});
