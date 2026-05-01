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
  checkAccountNameExists,
} from './Ledger';
import Engine from '../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import {
  LedgerKeyring,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
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
          accounts: {},
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

// Bridge stub used by the real LedgerKeyring instance below. We don't run
// the real bridge methods — production code reads them off `keyring.bridge`
// (e.g. `getAppNameAndVersion`, `openEthApp`), so they need to be jest mocks.
const mockBridge = {
  getAppNameAndVersion: jest.fn(),
  updateTransportMethod: jest.fn(),
  openEthApp: jest.fn(),
  closeApps: jest.fn(),
};

const ledgerKeyring = new LedgerKeyring({
  bridge: mockBridge as unknown as LedgerMobileBridge,
});

describe('Ledger core', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Reset AccountsController state that may have been modified by previous tests
    MockEngine.context.AccountsController.state.internalAccounts.accounts = {};

    const mockKeyringController = MockEngine.context.KeyringController;

    // Re-establish bridge mock implementations after `jest.resetAllMocks`
    // wipes them.
    mockBridge.getAppNameAndVersion.mockResolvedValue({
      appName: 'appName',
    });

    // Re-establish LedgerKeyring spies each test. `testSetup.js` runs
    // `jest.restoreAllMocks()` in afterEach, which restores spied methods to
    // their real implementations, so spies must be recreated here.
    jest
      .spyOn(ledgerKeyring, 'addAccounts')
      .mockResolvedValue(['0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2']);
    jest.spyOn(ledgerKeyring, 'deserialize').mockImplementation();
    jest.spyOn(ledgerKeyring, 'forgetDevice').mockImplementation();
    jest.spyOn(ledgerKeyring, 'getDeviceId').mockReturnValue('deviceId');
    jest.spyOn(ledgerKeyring, 'getFirstPage').mockResolvedValue([
      {
        address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        index: 0,
        balance: 0,
      },
      {
        address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB3',
        index: 1,
        balance: 0,
      },
    ]);
    jest.spyOn(ledgerKeyring, 'getNextPage').mockResolvedValue([
      {
        address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB4',
        index: 4,
        balance: 0,
      },
      {
        address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB5',
        index: 5,
        balance: 0,
      },
    ]);
    jest.spyOn(ledgerKeyring, 'getPreviousPage').mockResolvedValue([
      {
        address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB6',
        index: 2,
        balance: 0,
      },
      {
        address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB7',
        index: 3,
        balance: 0,
      },
    ]);
    jest.spyOn(ledgerKeyring, 'setDeviceId').mockImplementation();
    jest.spyOn(ledgerKeyring, 'setHdPath').mockImplementation();
    ledgerKeyring.hdPath = LEDGER_LIVE_PATH;
    jest.spyOn(ledgerKeyring, 'setAccountToUnlock').mockImplementation();
    jest
      .spyOn(ledgerKeyring, 'getAccounts')
      .mockResolvedValue([
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB3',
      ]);

    mockKeyringController.withKeyring.mockImplementation(
      (_selector, operation) =>
        operation({
          keyring: ledgerKeyring,
          metadata: { id: '1234', name: '' },
        }),
    );
    mockKeyringController.signTypedMessage.mockResolvedValue('signature');
  });

  describe('connectLedgerHardware', () => {
    const mockTransport = 'foo' as unknown as BleTransport;
    it('calls keyring.setTransport', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(mockBridge.updateTransportMethod).toHaveBeenCalled();
    });

    it('calls keyring.getAppAndVersion', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(mockBridge.getAppNameAndVersion).toHaveBeenCalled();
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

    it('releases the keyring lock before requesting app metadata from the device', async () => {
      const events: string[] = [];
      mockBridge.getAppNameAndVersion.mockImplementationOnce(async () => {
        events.push('getAppNameAndVersion');
        return { appName: 'Ethereum' };
      });
      MockEngine.context.KeyringController.withKeyring.mockImplementationOnce(
        async (_selector, operation) => {
          const result = await operation({
            keyring: ledgerKeyring,
            metadata: { id: '1234', name: 'Ledger Hardware' },
          });
          events.push('withKeyring settled');
          return result;
        },
      );

      await expect(connectLedgerHardware(mockTransport, 'bar')).resolves.toBe(
        'Ethereum',
      );

      expect(mockBridge.updateTransportMethod).toHaveBeenCalled();
      expect(mockBridge.getAppNameAndVersion).toHaveBeenCalled();
      expect(events).toEqual(['withKeyring settled', 'getAppNameAndVersion']);
    });

    it('skips app metadata request when aborted before the BLE exchange starts', async () => {
      const abortController = new AbortController();
      mockBridge.updateTransportMethod.mockImplementationOnce(async () => {
        abortController.abort();
      });

      const resultPromise = connectLedgerHardware(
        mockTransport,
        'bar',
        abortController.signal,
      );
      const error = await resultPromise.catch((caughtError) => caughtError);

      expect(error).toMatchObject({
        name: 'LedgerOperationAbortedError',
      });

      expect(mockBridge.getAppNameAndVersion).not.toHaveBeenCalled();
    });
  });

  describe('openEthereumAppOnLedger', () => {
    it('calls keyring.openEthApp', async () => {
      await openEthereumAppOnLedger();
      expect(mockBridge.openEthApp).toHaveBeenCalled();
    });

    it('releases the keyring lock before opening the Ethereum app on the device', async () => {
      const events: string[] = [];
      mockBridge.openEthApp.mockImplementationOnce(async () => {
        events.push('openEthApp');
      });
      MockEngine.context.KeyringController.withKeyring.mockImplementationOnce(
        async (_selector, operation) => {
          const result = await operation({
            keyring: ledgerKeyring,
            metadata: { id: '1234', name: 'Ledger Hardware' },
          });
          events.push('withKeyring settled');
          return result;
        },
      );

      await openEthereumAppOnLedger();

      expect(events).toEqual(['withKeyring settled', 'openEthApp']);
    });
  });

  describe('closeRunningAppOnLedger', () => {
    it('calls keyring.quitApp', async () => {
      await closeRunningAppOnLedger();
      expect(mockBridge.closeApps).toHaveBeenCalled();
    });

    it('releases the keyring lock before closing the current app on the device', async () => {
      const events: string[] = [];
      mockBridge.closeApps.mockImplementationOnce(async () => {
        events.push('closeApps');
      });
      MockEngine.context.KeyringController.withKeyring.mockImplementationOnce(
        async (_selector, operation) => {
          const result = await operation({
            keyring: ledgerKeyring,
            metadata: { id: '1234', name: 'Ledger Hardware' },
          });
          events.push('withKeyring settled');
          return result;
        },
      );

      await closeRunningAppOnLedger();

      expect(events).toEqual(['withKeyring settled', 'closeApps']);
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

    it('calls keyring.setHdPath with LEDGER_BIP44_PATH', async () => {
      await setHDPath(LEDGER_BIP44_PATH);
      expect(ledgerKeyring.setHdPath).toHaveBeenCalledWith(LEDGER_BIP44_PATH);
    });

    it('calls keyring.setHdPath with LEDGER_LEGACY_PATH', async () => {
      await setHDPath(LEDGER_LEGACY_PATH);
      expect(ledgerKeyring.setHdPath).toHaveBeenCalledWith(LEDGER_LEGACY_PATH);
    });

    it('throws error with invalid HD path', async () => {
      await expect(setHDPath('')).rejects.toThrow('HD Path is invalid: ');
    });

    it("throws error with path not starting with m/44'/60'", async () => {
      await expect(setHDPath("m/44'/61'/0'")).rejects.toThrow(
        "HD Path is invalid: m/44'/61'/0'",
      );
    });

    it('throws error with arbitrary path even if starts correctly', async () => {
      await expect(setHDPath("m/44'/60'/999'/0'/0")).rejects.toThrow(
        "HD Path is invalid: m/44'/60'/999'/0'/0",
      );
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

    it('calls getFirstPage for unknown operation values', async () => {
      await getLedgerAccountsByOperation(999);
      expect(ledgerKeyring.getFirstPage).toHaveBeenCalled();
    });

    it('returns accounts with balance set to 0x0', async () => {
      const accounts = await getLedgerAccountsByOperation(
        PAGINATION_OPERATIONS.GET_FIRST_PAGE,
      );
      expect(accounts).toEqual([
        {
          balance: '0x0',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
          index: 0,
        },
        {
          balance: '0x0',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB3',
          index: 1,
        },
      ]);
    });

    it('returns next page accounts with balance set to 0x0', async () => {
      const accounts = await getLedgerAccountsByOperation(
        PAGINATION_OPERATIONS.GET_NEXT_PAGE,
      );
      expect(accounts).toEqual([
        {
          balance: '0x0',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB4',
          index: 4,
        },
        {
          balance: '0x0',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB5',
          index: 5,
        },
      ]);
    });

    it('returns previous page accounts with balance set to 0x0', async () => {
      const accounts = await getLedgerAccountsByOperation(
        PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
      );
      expect(accounts).toEqual([
        {
          balance: '0x0',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB6',
          index: 2,
        },
        {
          balance: '0x0',
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB7',
          index: 3,
        },
      ]);
    });

    it('throws ETH app not open error when TransportStatusError with 0x6d00', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6d00;
      jest
        .mocked(ledgerKeyring.getFirstPage)
        .mockRejectedValueOnce(transportError);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when TransportStatusError with 0x6e00', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6e00;
      jest
        .mocked(ledgerKeyring.getNextPage)
        .mockRejectedValueOnce(transportError);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_NEXT_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when TransportStatusError with 0x650f', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x650f;
      jest
        .mocked(ledgerKeyring.getFirstPage)
        .mockRejectedValueOnce(transportError);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when error message contains 0x650f', async () => {
      const error = new Error('Ledger device: UNKNOWN_ERROR (0x650f)');
      jest.mocked(ledgerKeyring.getFirstPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws unspecified error for other errors', async () => {
      jest
        .mocked(ledgerKeyring.getFirstPage)
        .mockRejectedValueOnce(new Error('Some other error'));

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Unspecified error when connect Ledger Hardware,');
    });

    it('throws ETH app not open error when TransportStatusError with 0x6e01', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6e01;
      jest
        .mocked(ledgerKeyring.getFirstPage)
        .mockRejectedValueOnce(transportError);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when TransportStatusError with 0x6511', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6511;
      jest
        .mocked(ledgerKeyring.getPreviousPage)
        .mockRejectedValueOnce(transportError);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when TransportStatusError with 0x6700', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6700;
      jest
        .mocked(ledgerKeyring.getFirstPage)
        .mockRejectedValueOnce(transportError);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when error message contains 0x6511', async () => {
      const error = new Error('Ledger device: APP_NOT_OPEN (0x6511)');
      jest.mocked(ledgerKeyring.getFirstPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when error message contains 0x6d00', async () => {
      const error = new Error('TransportError: CLA_NOT_SUPPORTED (0x6d00)');
      jest.mocked(ledgerKeyring.getNextPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_NEXT_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when error message contains 0x6e00', async () => {
      const error = new Error('TransportError: INS_NOT_SUPPORTED (0x6e00)');
      jest.mocked(ledgerKeyring.getFirstPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when error message contains 0x6e01', async () => {
      const error = new Error('Ledger: INS_NOT_SUPPORTED variant (0x6e01)');
      jest.mocked(ledgerKeyring.getFirstPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error when error message contains 0x6700', async () => {
      const error = new Error('Ledger: INCORRECT_LENGTH (0x6700)');
      jest.mocked(ledgerKeyring.getFirstPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error for unknown_error pattern with 0x650f', async () => {
      const error = new Error('ledger device: unknown_error (0x650f)');
      jest.mocked(ledgerKeyring.getFirstPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('throws ETH app not open error for unknown_error pattern with 0x6511', async () => {
      const error = new Error('ledger device: unknown_error (0x6511)');
      jest.mocked(ledgerKeyring.getFirstPage).mockRejectedValueOnce(error);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Please open the Ethereum app on your Ledger device.');
    });

    it('does not throw ETH app not open error for non-matching status codes', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x1234; // Non-matching code
      jest
        .mocked(ledgerKeyring.getFirstPage)
        .mockRejectedValueOnce(transportError);

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Unspecified error when connect Ledger Hardware,');
    });

    it('does not throw ETH app not open error for non-Error objects', async () => {
      jest
        .mocked(ledgerKeyring.getFirstPage)
        .mockRejectedValueOnce('string error');

      await expect(
        getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      ).rejects.toThrow('Unspecified error when connect Ledger Hardware,');
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

    it('handles Record<string, unknown> data type', async () => {
      const expectedArg = {
        from: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        data: { message: 'test', value: 123 },
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

    it('handles Record<string, unknown>[] data type', async () => {
      const expectedArg = {
        from: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        data: [{ type: 'string', name: 'test' }],
      };
      const value = await ledgerSignTypedMessage(
        expectedArg,
        SignTypedDataVersion.V3,
      );
      expect(
        MockEngine.context.KeyringController.signTypedMessage,
      ).toHaveBeenCalledWith(expectedArg, SignTypedDataVersion.V3);
      expect(value).toBe('signature');
    });
  });

  describe('checkAccountNameExists', () => {
    it('returns true when account name exists', async () => {
      MockEngine.context.AccountsController.state.internalAccounts.accounts = {
        'account-1': {
          metadata: {
            name: 'Test Account',
            importTime: 0,
            keyring: { type: 'Ledger' },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = await checkAccountNameExists('Test Account');
      expect(result).toBe(true);
    });

    it('returns false when account name does not exist', async () => {
      MockEngine.context.AccountsController.state.internalAccounts.accounts = {
        'account-1': {
          metadata: {
            name: 'Test Account',
            importTime: 0,
            keyring: { type: 'Ledger' },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = await checkAccountNameExists('Non-existent Account');
      expect(result).toBe(false);
    });

    it('returns false when accounts list is empty', async () => {
      MockEngine.context.AccountsController.state.internalAccounts.accounts =
        {};

      const result = await checkAccountNameExists('Any Account');
      expect(result).toBe(false);
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

    it('calls setAccountName when account name differs from expected name', async () => {
      mockAccountsController.state.internalAccounts.accounts = {};
      mockAccountsController.getAccountByAddress.mockReturnValue({
        id: 'account-id-123',
        metadata: {
          name: 'Different Name',
          importTime: 0,
          keyring: { type: 'Ledger' },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      (
        mockAccountsController as unknown as { setAccountName: jest.Mock }
      ).setAccountName = jest.fn();

      await unlockLedgerWalletAccount(1);

      expect(
        (mockAccountsController as unknown as { setAccountName: jest.Mock })
          .setAccountName,
      ).toHaveBeenCalledWith('account-id-123', 'Ledger 3');
    });

    it('does not call setAccountName when account name matches expected name', async () => {
      mockAccountsController.state.internalAccounts.accounts = {};
      mockAccountsController.getAccountByAddress.mockReturnValue({
        id: 'account-id-123',
        metadata: {
          name: 'Ledger 3',
          importTime: 0,
          keyring: { type: 'Ledger' },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      (
        mockAccountsController as unknown as { setAccountName: jest.Mock }
      ).setAccountName = jest.fn();

      await unlockLedgerWalletAccount(1);

      expect(
        (mockAccountsController as unknown as { setAccountName: jest.Mock })
          .setAccountName,
      ).not.toHaveBeenCalled();
    });

    it('handles case when getAccountByAddress returns undefined', async () => {
      mockAccountsController.state.internalAccounts.accounts = {};
      mockAccountsController.getAccountByAddress.mockReturnValue(undefined);
      (
        mockAccountsController as unknown as { setAccountName: jest.Mock }
      ).setAccountName = jest.fn();

      await unlockLedgerWalletAccount(1);

      expect(
        (mockAccountsController as unknown as { setAccountName: jest.Mock })
          .setAccountName,
      ).not.toHaveBeenCalled();
      expect(MockEngine.setSelectedAddress).toHaveBeenCalledWith(
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
      );
    });

    it(`throws an error if the account name has already exists`, async () => {
      mockAccountsController.state.internalAccounts.accounts = {
        'existing-account': {
          metadata: {
            name: 'Ledger 3',
            importTime: 0,
            keyring: { type: 'Ledger' },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Account Ledger 3 already exists',
      );
    });

    it('throws ETH app not open error when TransportStatusError with 0x6d00', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6d00;
      jest
        .mocked(ledgerKeyring.addAccounts)
        .mockRejectedValueOnce(transportError);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws ETH app not open error when TransportStatusError with 0x6e00', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6e00;
      jest
        .mocked(ledgerKeyring.addAccounts)
        .mockRejectedValueOnce(transportError);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws ETH app not open error when TransportStatusError with 0x6e01', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6e01;
      jest
        .mocked(ledgerKeyring.addAccounts)
        .mockRejectedValueOnce(transportError);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws ETH app not open error when TransportStatusError with 0x6511', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6511;
      jest
        .mocked(ledgerKeyring.addAccounts)
        .mockRejectedValueOnce(transportError);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws ETH app not open error when TransportStatusError with 0x6700', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x6700;
      jest
        .mocked(ledgerKeyring.addAccounts)
        .mockRejectedValueOnce(transportError);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws ETH app not open error when TransportStatusError with 0x650f', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x650f;
      jest
        .mocked(ledgerKeyring.addAccounts)
        .mockRejectedValueOnce(transportError);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws ETH app not open error when error message contains 0x650f', async () => {
      const error = new Error('Ledger device: UNKNOWN_ERROR (0x650f)');
      jest.mocked(ledgerKeyring.addAccounts).mockRejectedValueOnce(error);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws ETH app not open error when error message contains 0x6511', async () => {
      const error = new Error('Ledger device: APP_NOT_OPEN (0x6511)');
      jest.mocked(ledgerKeyring.addAccounts).mockRejectedValueOnce(error);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Please open the Ethereum app on your Ledger device.',
      );
    });

    it('throws original error for non-ETH app not open errors', async () => {
      const error = new Error('Some other error');
      jest.mocked(ledgerKeyring.addAccounts).mockRejectedValueOnce(error);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'Some other error',
      );
    });

    it('does not throw ETH app not open error for non-matching status codes', async () => {
      const transportError = new Error('TransportStatusError');
      transportError.name = 'TransportStatusError';
      // @ts-expect-error statusCode is a custom property on TransportStatusError
      transportError.statusCode = 0x1234; // Non-matching code
      jest
        .mocked(ledgerKeyring.addAccounts)
        .mockRejectedValueOnce(transportError);

      await expect(unlockLedgerWalletAccount(1)).rejects.toThrow(
        'TransportStatusError',
      );
    });
  });
});
