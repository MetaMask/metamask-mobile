import LedgerKeyring from '@consensys/ledgerhq-metamask-keyring';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
  forgetLedger,
  ledgerSignTypedMessage,
  getDeviceId,
} from './Ledger';
import Engine from '../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: jest.fn(),
      withKeyring: jest.fn(),
    },
  },
}));
const MockEngine = jest.mocked(Engine);

describe('Ledger core', () => {
  let ledgerKeyring: LedgerKeyring;

  beforeEach(() => {
    jest.resetAllMocks();

    // @ts-expect-error This is a partial mock, not completely identical
    // TODO: Replace this with a type-safe mock
    ledgerKeyring = {
      addAccounts: jest.fn(),
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
    const mockKeyringController = MockEngine.context.KeyringController;

    mockKeyringController.withKeyring.mockImplementation(
      // @ts-expect-error The Ledger keyring is not compatible with our keyring type yet
      (_selector, operation) => operation(ledgerKeyring),
    );
    mockKeyringController.signTypedMessage.mockResolvedValue('signature');
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
