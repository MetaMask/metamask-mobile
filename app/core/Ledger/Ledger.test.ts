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

const ledgerKeyring = {
  setTransport: jest.fn(),
  getAppAndVersion: jest.fn().mockResolvedValue({ appName: 'appName' }),
  getDefaultAccount: jest.fn().mockResolvedValue('defaultAccount'),
  openEthApp: jest.fn(),
  quitApp: jest.fn(),
  forgetDevice: jest.fn(),
  deserialize: jest.fn(),
  deviceId: 'deviceId',
  getName: jest.fn().mockResolvedValue('name'),
  openEthereumAppOnLedger: jest.fn(),
};

describe('Ledger core', () => {
  const ledgerKeyringClone = {
    ...ledgerKeyring,
    deviceId: 'deviceIdClone',
  };
  const mockAddNewKeyring = jest.fn().mockReturnValue(ledgerKeyring);
  const mockGetKeyringsByType = jest.fn().mockReturnValue([ledgerKeyringClone]);
  const mockGetAccounts = jest
    .fn()
    .mockReturnValue(['0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2']);
  const mockPersistAllKeyrings = jest.fn().mockReturnValue(Promise.resolve());
  const mockSDignTypedMessage = jest
    .fn()
    .mockReturnValue(Promise.resolve('signature'));
  const mockAddNewAccountForKeyring = jest.fn();
  Engine.context.KeyringController = {
    addNewKeyring: mockAddNewKeyring,
    getKeyringsByType: mockGetKeyringsByType,
    getAccounts: mockGetAccounts,
    persistAllKeyrings: mockPersistAllKeyrings,
    signTypedMessage: mockSDignTypedMessage,
    addNewAccountForKeyring: mockAddNewAccountForKeyring,
  };

  describe('addLedgerKeyring', () => {
    it('should call addNewKeyring from keyring controller', () => {
      addLedgerKeyring();
      expect(mockAddNewKeyring).toHaveBeenCalled();
      expect(mockAddNewKeyring).toReturnWith(ledgerKeyring);
    });
  });

  describe('getLedgerKeyring', () => {
    it('should call getKeyringsByType from keyring controller', async () => {
      const value = await getLedgerKeyring();
      expect(mockGetKeyringsByType).toHaveBeenCalled();
      expect(value).toBe(ledgerKeyringClone);
    });

    it('should add a keyring if none could be found', async () => {
      mockGetKeyringsByType.mockReturnValue([]);
      const value = await getLedgerKeyring();
      expect(mockGetKeyringsByType).toHaveBeenCalled();
      expect(mockAddNewKeyring).toHaveBeenCalled();
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
      expect(mockAddNewAccountForKeyring).not.toHaveBeenCalled();
      expect(ledgerKeyring.getDefaultAccount).toHaveBeenCalled();

      expect(account).toEqual({
        address: 'defaultAccount',
        balance: '0x0',
      });
    });

    it('should call KeyringController.addNewAccountForKeyring if isAccountImportReq is true', async () => {
      const account = await unlockLedgerDefaultAccount(true);
      expect(mockAddNewAccountForKeyring).toHaveBeenCalledWith(ledgerKeyring);
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
      expect(mockPersistAllKeyrings).toHaveBeenCalled();
      mockGetAccounts.mockReturnValue([
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
      ]);
    });
  });

  describe('getDeviceId', () => {
    it('should return deviceId', async () => {
      const value = await getDeviceId();
      expect(value).toBe('deviceId');
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
      expect(mockSDignTypedMessage).toHaveBeenCalledWith(
        expectedArg,
        SignTypedDataVersion.V4,
      );
      expect(value).toBe('signature');
    });
  });
});
