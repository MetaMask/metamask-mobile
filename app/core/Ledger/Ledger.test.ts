import LedgerKeyring from '@consensys/ledgerhq-metamask-keyring';
import {
  addLedgerKeyring,
  getLedgerKeyring,
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
  forgetLedger,
  ledgerSignTypedMessage,
  unlockLedgerDefaultAccount,
  getDeviceId,
} from './Ledger';
import Engine from '../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      addNewAccount: jest.fn(),
      addNewAccountForKeyring: jest.fn(),
      addNewKeyring: jest.fn(),
      getAccounts: jest.fn(),
      getKeyringsByType: jest.fn(),
      persistAllKeyrings: jest.fn(),
      signTypedMessage: jest.fn(),
    },
  },
}));
const MockEngine = jest.mocked(Engine);

describe('Ledger core', () => {
  let ledgerKeyring: LedgerKeyring;
  let ledgerKeyringClone: LedgerKeyring;

  beforeEach(() => {
    jest.resetAllMocks();

    // @ts-expect-error This is a partial mock, not completely identical
    // TODO: Replace this with a type-safe mock
    ledgerKeyring = {
      setTransport: jest.fn(),
      getAppAndVersion: jest.fn().mockResolvedValue({ appName: 'appName' }),
      getDefaultAccount: jest.fn().mockResolvedValue('defaultAccount'),
      openEthApp: jest.fn(),
      quitApp: jest.fn(),
      forgetDevice: jest.fn(),
      deserialize: jest.fn(),
      deviceId: 'deviceId',
      getName: jest.fn().mockResolvedValue('name'),
    };
    // @ts-expect-error This is a partial mock, not completely identical
    // TODO: Replace this with a type-safe mock
    ledgerKeyringClone = {
      ...ledgerKeyring,
      deviceId: 'deviceIdClone',
    };
    const mockKeyringController = MockEngine.context.KeyringController;

    mockKeyringController.addNewKeyring.mockResolvedValue(ledgerKeyring);
    mockKeyringController.getAccounts.mockResolvedValue([
      '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
    ]);
    mockKeyringController.getKeyringsByType.mockReturnValue([
      ledgerKeyringClone,
    ]);
    mockKeyringController.persistAllKeyrings.mockResolvedValue(false);
    mockKeyringController.signTypedMessage.mockResolvedValue('signature');
  });

  describe('addLedgerKeyring', () => {
    it('should call addNewKeyring from keyring controller', async () => {
      addLedgerKeyring();
      expect(
        MockEngine.context.KeyringController.addNewKeyring,
      ).toHaveBeenCalledTimes(1);
      const result =
        MockEngine.context.KeyringController.addNewKeyring.mock.results[0]
          .value;
      await expect(result).resolves.toBe(ledgerKeyring);
    });
  });

  describe('getLedgerKeyring', () => {
    it('should call getKeyringsByType from keyring controller', async () => {
      const value = await getLedgerKeyring();
      expect(
        MockEngine.context.KeyringController.getKeyringsByType,
      ).toHaveBeenCalled();
      expect(value).toStrictEqual({
        ...ledgerKeyring,
        deviceId: 'deviceIdClone',
      });
    });

    it('should add a keyring if none could be found', async () => {
      MockEngine.context.KeyringController.getKeyringsByType.mockReturnValue(
        [],
      );
      const value = await getLedgerKeyring();
      expect(
        MockEngine.context.KeyringController.getKeyringsByType,
      ).toHaveBeenCalled();
      expect(
        MockEngine.context.KeyringController.addNewKeyring,
      ).toHaveBeenCalled();
      expect(value).toBe(ledgerKeyring);
    });
  });

  describe('connectLedgerHardware', () => {
    const mockTransport = 'foo' as unknown as BleTransport;
    it('should call keyring.setTransport', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(ledgerKeyring.setTransport).toHaveBeenCalled();
    });

    it('should call keyring.getAppAndVersion', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(ledgerKeyring.getAppAndVersion).toHaveBeenCalled();
    });

    it('should return app name', async () => {
      const value = await connectLedgerHardware(mockTransport, 'bar');
      expect(value).toBe('appName');
    });
  });

  describe('unlockLedgerDefaultAccount', () => {
    it('should not call KeyringController.addNewAccountForKeyring if isAccountImportReq is false', async () => {
      const account = await unlockLedgerDefaultAccount(false);
      expect(
        MockEngine.context.KeyringController.addNewAccountForKeyring,
      ).not.toHaveBeenCalled();
      expect(ledgerKeyring.getDefaultAccount).toHaveBeenCalled();

      expect(account).toEqual({
        address: 'defaultAccount',
        balance: '0x0',
      });
    });

    it('should call KeyringController.addNewAccountForKeyring if isAccountImportReq is true', async () => {
      const account = await unlockLedgerDefaultAccount(true);
      expect(
        MockEngine.context.KeyringController.addNewAccountForKeyring,
      ).toHaveBeenCalledWith(ledgerKeyringClone);
      expect(ledgerKeyring.getDefaultAccount).toHaveBeenCalled();

      expect(account).toEqual({
        address: 'defaultAccount',
        balance: '0x0',
      });
    });
  });

  describe('openEthereumAppOnLedger', () => {
    it('should call keyring.openEthApp', async () => {
      await openEthereumAppOnLedger();
      expect(ledgerKeyring.openEthApp).toHaveBeenCalled();
    });
  });

  describe('closeRunningAppOnLedger', () => {
    it('should call keyring.quitApp', async () => {
      await closeRunningAppOnLedger();
      expect(ledgerKeyring.quitApp).toHaveBeenCalled();
    });
  });

  describe('forgetLedger', () => {
    it('should call keyring.forgetDevice', async () => {
      await forgetLedger();
      expect(ledgerKeyring.forgetDevice).toHaveBeenCalled();
      expect(
        MockEngine.context.KeyringController.persistAllKeyrings,
      ).toHaveBeenCalled();
    });
  });

  describe('getDeviceId', () => {
    it('should return deviceId', async () => {
      const value = await getDeviceId();
      expect(value).toBe('deviceIdClone');
    });
  });

  describe('ledgerSignTypedMessage', () => {
    it('should call signTypedMessage from keyring controller and return correct signature', async () => {
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
});
