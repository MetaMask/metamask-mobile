import {
  withTangemKeyring,
  scanTangemCard,
  getTangemAccountsByOperation,
  getTangemAccounts,
  unlockTangemWalletAccount,
  forgetTangem,
  checkNfcStatus,
} from './Tangem';
import Engine from '../../core/Engine';
import { removeAccountsFromPermissions } from '../../core/Permissions';

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      withKeyring: jest.fn(),
    },
    AccountsController: {
      getAccountByAddress: jest.fn(),
      setAccountName: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));

jest.mock('../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn(),
}));

const MockEngine = jest.mocked(Engine);

interface MockTangemKeyring {
  bridge: {
    scanCard: jest.Mock;
    getNfcStatus: jest.Mock;
  };
  cardId: string;
  walletPublicKey: string;
  getAccounts: jest.Mock;
  getFirstPage: jest.Mock;
  getNextPage: jest.Mock;
  getPreviousPage: jest.Mock;
  setAccountToUnlock: jest.Mock;
  addAccounts: jest.Mock;
  forgetDevice: jest.Mock;
  isConnected: jest.Mock;
}

describe('Tangem facade', () => {
  let mockKeyring: MockTangemKeyring;

  beforeEach(() => {
    jest.resetAllMocks();

    mockKeyring = {
      bridge: {
        scanCard: jest.fn().mockResolvedValue({
          cardId: 'CB79000000012345',
          wallets: [
            { publicKey: 'abc123', curve: 'secp256k1', settings: {}, index: 0 },
          ],
        }),
        getNfcStatus: jest
          .fn()
          .mockResolvedValue({ enabled: true, support: true }),
      },
      cardId: '',
      walletPublicKey: '',
      getAccounts: jest.fn().mockResolvedValue(['0x123']),
      getFirstPage: jest
        .fn()
        .mockResolvedValue([{ address: '0x123', balance: null, index: 0 }]),
      getNextPage: jest
        .fn()
        .mockResolvedValue([{ address: '0x456', balance: null, index: 5 }]),
      getPreviousPage: jest.fn().mockResolvedValue([]),
      setAccountToUnlock: jest.fn(),
      addAccounts: jest.fn().mockResolvedValue(['0x123']),
      forgetDevice: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    };

    MockEngine.context.KeyringController.withKeyring.mockImplementation(
      async (
        _filter: unknown,
        operation: (keyring: {
          keyring: MockTangemKeyring;
        }) => Promise<unknown>,
      ) =>
        operation({ keyring: mockKeyring } as { keyring: MockTangemKeyring }),
    );
  });

  describe('withTangemKeyring', () => {
    it('calls KeyringController.withKeyring with tangem type', async () => {
      await withTangemKeyring(async () => undefined);
      expect(
        MockEngine.context.KeyringController.withKeyring,
      ).toHaveBeenCalledWith(
        { type: 'Tangem Hardware' },
        expect.any(Function),
        { createIfMissing: true },
      );
    });
  });

  describe('scanTangemCard', () => {
    it('scans card and updates keyring state', async () => {
      const card = await scanTangemCard();
      expect(mockKeyring.bridge.scanCard).toHaveBeenCalled();
      expect(card.cardId).toBe('CB79000000012345');
    });
  });

  describe('getTangemAccountsByOperation', () => {
    it('returns first page accounts', async () => {
      const accounts = await getTangemAccountsByOperation(0);
      expect(mockKeyring.getFirstPage).toHaveBeenCalled();
      expect(accounts[0].balance).toBe('0x0');
    });
  });

  describe('getTangemAccounts', () => {
    it('returns accounts from keyring', async () => {
      const accounts = await getTangemAccounts();
      expect(accounts).toEqual(['0x123']);
    });
  });

  describe('unlockTangemWalletAccount', () => {
    it('sets account to unlock and adds account', async () => {
      MockEngine.context.AccountsController.getAccountByAddress.mockReturnValue(
        {
          id: 'account-1',
          metadata: { name: 'Old Name' },
        },
      );

      await unlockTangemWalletAccount(0);
      expect(mockKeyring.setAccountToUnlock).toHaveBeenCalledWith(0);
      expect(mockKeyring.addAccounts).toHaveBeenCalledWith(1);
      expect(MockEngine.setSelectedAddress).toHaveBeenCalledWith('0x123');
    });
  });

  describe('forgetTangem', () => {
    it('removes permissions and forgets device', async () => {
      await forgetTangem();
      expect(removeAccountsFromPermissions).toHaveBeenCalledWith(['0x123']);
      expect(mockKeyring.forgetDevice).toHaveBeenCalled();
    });
  });

  describe('checkNfcStatus', () => {
    it('returns NFC status', async () => {
      const status = await checkNfcStatus();
      expect(status).toEqual({ enabled: true, support: true });
    });
  });
});
