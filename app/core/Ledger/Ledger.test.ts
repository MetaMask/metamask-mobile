import {
  closeRunningAppOnLedger,
  connectLedgerHardware,
  forgetLedger,
  getDeviceId,
  getHDPath,
  getLedgerAccounts,
  getLedgerAccountsByOperation,
  isValidPath,
  ledgerSignTypedMessage,
  openEthereumAppOnLedger,
  setHDPath,
  unlockLedgerWalletAccount,
} from './Ledger';
import Engine from '../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import PAGINATION_OPERATIONS from '../../constants/pagination';
import {
  LEDGER_BIP44_PATH,
  LEDGER_LEGACY_PATH,
  LEDGER_LIVE_PATH,
} from './constants';
import { removeAccountsFromPermissions } from '../../core/Permissions';

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: jest.fn(),
      withKeyring: jest.fn(),
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: [],
        },
      },
      getAccountByAddress: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));
const MockEngine = jest.mocked(Engine);

jest.mock('../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn(),
}));

const MockRemoveAccountsFromPermissions = jest.mocked(
  removeAccountsFromPermissions,
);

interface mockKeyringType {
  addAccounts: jest.Mock;
  getAccounts: jest.Mock;
  bridge: {
    getAppNameAndVersion: jest.Mock;
    updateTransportMethod: jest.Mock;
    openEthApp: jest.Mock;
    closeApps: jest.Mock;
  };
  deserialize: jest.Mock;
  forgetDevice: jest.Mock;
  getDeviceId: jest.Mock;
  getFirstPage: jest.Mock;
  getNextPage: jest.Mock;
  getPreviousPage: jest.Mock;
  setDeviceId: jest.Mock;
  setHdPath: jest.Mock;
  hdPath: string;
  setAccountToUnlock: jest.Mock;
}

describe('Ledger core', () => {
  let ledgerKeyring: mockKeyringType;

  beforeEach(() => {
    jest.resetAllMocks();

    const mockKeyringController = MockEngine.context.KeyringController;

    ledgerKeyring = {
      addAccounts: jest
        .fn()
        .mockResolvedValue(['0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2']),
      bridge: {
        getAppNameAndVersion: jest
          .fn()
          .mockResolvedValue({ appName: 'appName' }),
        updateTransportMethod: jest.fn(),
        openEthApp: jest.fn(),
        closeApps: jest.fn(),
      },
      deserialize: jest.fn(),
      forgetDevice: jest.fn(),
      getDeviceId: jest.fn().mockReturnValue('deviceId'),
      getFirstPage: jest.fn().mockResolvedValue([
        {
          balance: '0',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
          index: 0,
        },
        {
          balance: '1',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB3',
          index: 1,
        },
      ]),
      getNextPage: jest.fn().mockResolvedValue([
        {
          balance: '4',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB4',
          index: 4,
        },
        {
          balance: '5',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB5',
          index: 5,
        },
      ]),
      getPreviousPage: jest.fn().mockResolvedValue([
        {
          balance: '2',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB6',
          index: 2,
        },
        {
          balance: '3',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB7',
          index: 3,
        },
      ]),
      setDeviceId: jest.fn(),
      setHdPath: jest.fn(),
      hdPath: LEDGER_LIVE_PATH,
      setAccountToUnlock: jest.fn(),
      getAccounts: jest
        .fn()
        .mockResolvedValue([
          '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
          '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB3',
        ]),
    };

    mockKeyringController.withKeyring.mockImplementation(
      (_selector, operation) =>
        // @ts-expect-error The Ledger keyring is not compatible with our keyring type yet
        operation({ keyring: ledgerKeyring, metadata: { id: '1234' } }),
    );
    mockKeyringController.signTypedMessage.mockResolvedValue('signature');
  });

  describe('connectLedgerHardware', () => {
    const mockTransport = 'foo' as unknown as BleTransport;
    it('calls keyring.setTransport', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(ledgerKeyring.bridge.updateTransportMethod).toHaveBeenCalled();
    });

    it('calls keyring.getAppAndVersion', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(ledgerKeyring.bridge.getAppNameAndVersion).toHaveBeenCalled();
    });

    it('returns app name correctly', async () => {
      const value = await connectLedgerHardware(mockTransport, 'bar');
      expect(value).toBe('appName');
    });

    it('calls keyring.setHdPath and keyring.setDeviceId if deviceId is different', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(ledgerKeyring.setHdPath).toHaveBeenCalled();
      expect(ledgerKeyring.setDeviceId).toHaveBeenCalled();
    });
  });

  describe('openEthereumAppOnLedger', () => {
    it('calls keyring.openEthApp', async () => {
      await openEthereumAppOnLedger();
      expect(ledgerKeyring.bridge.openEthApp).toHaveBeenCalled();
    });
  });

  describe('closeRunningAppOnLedger', () => {
    it('calls keyring.quitApp', async () => {
      await closeRunningAppOnLedger();
      expect(ledgerKeyring.bridge.closeApps).toHaveBeenCalled();
    });
  });

  describe('forgetLedger', () => {
    it('removes the accounts from existing permissions', async () => {
      await forgetLedger();
      expect(MockRemoveAccountsFromPermissions).toHaveBeenCalledWith([
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB3',
      ]);
    });

    it('calls keyring.forgetDevice', async () => {
      await forgetLedger();
      expect(ledgerKeyring.forgetDevice).toHaveBeenCalled();
    });
  });

  describe('getDeviceId', () => {
    it('returns deviceId', async () => {
      const value = await getDeviceId();
      expect(value).toBe('deviceId');
    });
  });

  describe('isValidHDPath', () => {
    it('returns true for valid HD path', () => {
      expect(isValidPath(LEDGER_LIVE_PATH)).toBeTruthy();
      expect(isValidPath(LEDGER_BIP44_PATH)).toBeTruthy();
      expect(isValidPath(LEDGER_LEGACY_PATH)).toBeTruthy();
    });

    it('returns false for invalid HD path', () => {
      expect(isValidPath('')).toBeFalsy();
      expect(isValidPath('Invalid')).toBeFalsy();
      expect(isValidPath('m/44/60/0')).toBeFalsy();
    });
  });

  describe('setHDPath', () => {
    it('calls keyring.setHdPath with valid HD path', async () => {
      await setHDPath(LEDGER_LIVE_PATH);
      expect(ledgerKeyring.setHdPath).toHaveBeenCalledWith(LEDGER_LIVE_PATH);
    });

    it('calls keyring.setHdPath with invalid HD path', async () => {
      try {
        await setHDPath('');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('HD Path is invalid: ');
      }
    });
  });

  describe('getHDPath', () => {
    it('calls keyring.getHdPath', async () => {
      const path = await getHDPath();
      expect(path).toBe(LEDGER_LIVE_PATH);
    });
  });

  describe('getLedgerAccounts', () => {
    it('calls keyring.getAccounts', async () => {
      const accounts = await getLedgerAccounts();
      expect(ledgerKeyring.getAccounts).toHaveBeenCalled();
      expect(accounts).toEqual([
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB3',
      ]);
    });
  });

  describe('getLedgerAccountsByOperation', () => {
    it('calls ledgerKeyring.getNextPage on ledgerKeyring', async () => {
      await getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_NEXT_PAGE);
      expect(ledgerKeyring.getNextPage).toHaveBeenCalled();
    });
    it('calls getPreviousPage on ledgerKeyring', async () => {
      await getLedgerAccountsByOperation(
        PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
      );
      expect(ledgerKeyring.getPreviousPage).toHaveBeenCalled();
    });
    it('calls getFirstPage on ledgerKeyring', async () => {
      await getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE);
      expect(ledgerKeyring.getFirstPage).toHaveBeenCalled();
    });
  });

  describe('ledgerSignTypedMessage', () => {
    it('calls signTypedMessage from keyring controller and return correct signature', async () => {
      const expectedArg = {
        from: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        data: 'data',
      };
      const value = await ledgerSignTypedMessage(
        expectedArg,
        SignTypedDataVersion.V4,
      );
      expect(
        MockEngine.context.KeyringController.signTypedMessage,
      ).toHaveBeenCalledWith(expectedArg, SignTypedDataVersion.V4);
      expect(value).toBe('signature');
    });
  });

  describe(`unlockLedgerWalletAccount`, () => {
    const mockAccountsController = MockEngine.context.AccountsController;
    mockAccountsController.getAccountByAddress.mockReturnValue({
      // @ts-expect-error: The account metadata type is hard to mock
      metadata: {
        name: 'Ledger 1',
      },
    });

    it(`calls keyring.setAccountToUnlock and addAccounts`, async () => {
      await unlockLedgerWalletAccount(1);
      expect(ledgerKeyring.setAccountToUnlock).toHaveBeenCalled();
      expect(ledgerKeyring.addAccounts).toHaveBeenCalledWith(1);
    });

    it('sets the newly unlocked account as selected address', async () => {
      await unlockLedgerWalletAccount(1);
      expect(MockEngine.setSelectedAddress).toHaveBeenCalledWith(
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
      );
    });

    it(`throws an error if the account name has already exists`, async () => {
      mockAccountsController.state.internalAccounts.accounts = [
        {
          // @ts-expect-error: The account metadata type is hard to mock
          metadata: {
            name: 'Ledger 1',
          },
        },
      ];

      try {
        await unlockLedgerWalletAccount(1);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(`Account Ledger 1 already exists`);
      }
    });
  });
});
