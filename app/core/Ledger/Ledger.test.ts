import {
  closeRunningAppOnLedger,
  connectLedgerHardware,
  forgetLedger,
  getDeviceId,
  getLedgerAccountsByOperation,
  ledgerSignTypedMessage,
  openEthereumAppOnLedger,
  unlockLedgerWalletAccount,
} from './Ledger';
import Engine from '../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import OperationTypes from './types';

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: jest.fn(),
      withKeyring: jest.fn(),
    },
  },
}));
const MockEngine = jest.mocked(Engine);

interface mockKeyringType {
  addAccounts: jest.Mock;
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
  setAccountToUnlock: jest.Mock;
}

describe('Ledger core', () => {
  let ledgerKeyring: mockKeyringType;

  beforeEach(() => {
    jest.resetAllMocks();

    const mockKeyringController = MockEngine.context.KeyringController;

    ledgerKeyring = {
      addAccounts: jest.fn(),
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
      setAccountToUnlock: jest.fn(),
    };

    mockKeyringController.withKeyring.mockImplementation(
      // @ts-expect-error The Ledger keyring is not compatible with our keyring type yet
      (_selector, operation) => operation(ledgerKeyring),
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

  describe('getLedgerAccountsByOperation', () => {
    it('calls ledgerKeyring.getNextPage on ledgerKeyring', async () => {
      await getLedgerAccountsByOperation(OperationTypes.GET_NEXT_PAGE);
      expect(ledgerKeyring.getNextPage).toHaveBeenCalled();
    });
    it('calls getPreviousPage on ledgerKeyring', async () => {
      await getLedgerAccountsByOperation(OperationTypes.GET_PREVIOUS_PAGE);
      expect(ledgerKeyring.getPreviousPage).toHaveBeenCalled();
    });
    it('calls getFirstPage on ledgerKeyring', async () => {
      await getLedgerAccountsByOperation(OperationTypes.GET_FIRST_PAGE);
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
    it(`calls keyring.setAccountToUnlock and addAccounts`, async () => {
      await unlockLedgerWalletAccount(1);
      expect(ledgerKeyring.setAccountToUnlock).toHaveBeenCalled();
      expect(ledgerKeyring.addAccounts).toHaveBeenCalledWith(1);
    });
  });
});
