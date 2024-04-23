import {
  addLedgerKeyring,
  getLedgerKeyring,
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
  forgetLedger,
  ledgerSignTypedMessage,
} from './Ledger';
import Engine from '../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';

const ledgerKeyring = {
  getAppAndVersion: jest.fn().mockResolvedValue({ appName: 'appName' }),
  getDefaultAccount: jest.fn().mockResolvedValue('defaultAccount'),
  openEthApp: jest.fn(),
  quitApp: jest.fn(),
  forgetDevice: jest.fn(),
  deserialize: jest.fn(),
  setHdPath: jest.fn(),
  setDeviceId: jest.fn(),
  bridge: {
    updateTransportMethod: jest.fn(),
    getAppNameAndVersion: jest.fn().mockResolvedValue({ appName: 'appName' }),
    openEthApp: jest.fn(),
    closeApps: jest.fn(),
  },
  deviceId: 'deviceId',
  getName: jest.fn().mockResolvedValue('name'),
};

describe('Ledger core', () => {
  const ledgerKeyringClone = {
    ...ledgerKeyring,
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

  const mockUpdateIdentities = jest.fn();
  Engine.context.PreferencesController = {
    updateIdentities: mockUpdateIdentities,
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
    it('should call keyring.bridge.updateTransportMethod', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(ledgerKeyring.setHdPath).toHaveBeenCalledWith("m/44'/60'/0'/0");
      expect(ledgerKeyring.setDeviceId).toHaveBeenCalledWith('bar');
      expect(ledgerKeyring.bridge.updateTransportMethod).toHaveBeenCalledWith(
        mockTransport,
      );
    });

    it('should call keyring.bridge.getAppAndVersion', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
      expect(ledgerKeyring.setHdPath).toHaveBeenCalledWith("m/44'/60'/0'/0");
      expect(ledgerKeyring.setDeviceId).toHaveBeenCalledWith('bar');
      expect(ledgerKeyring.bridge.updateTransportMethod).toHaveBeenCalledWith(
        mockTransport,
      );
      expect(ledgerKeyring.bridge.getAppNameAndVersion).toHaveBeenCalled();
    });

    it('should return app name', async () => {
      const value = await connectLedgerHardware(mockTransport, 'bar');
      expect(value).toBe('appName');
    });
  });

  describe('openEthereumAppOnLedger', () => {
    it('should call keyring.openEthApp', async () => {
      await openEthereumAppOnLedger();
      expect(ledgerKeyring.bridge.openEthApp).toHaveBeenCalled();
    });
  });

  describe('closeRunningAppOnLedger', () => {
    it('should call keyring.quitApp', async () => {
      await closeRunningAppOnLedger();
      expect(ledgerKeyring.bridge.closeApps).toHaveBeenCalled();
    });
  });

  describe('forgetLedger', () => {
    it('should call keyring.forgetDevice', async () => {
      await forgetLedger();
      expect(ledgerKeyring.forgetDevice).toHaveBeenCalled();
      expect(mockGetAccounts).toHaveBeenCalled();
      expect(mockPersistAllKeyrings).toHaveBeenCalled();
      mockGetAccounts.mockReturnValue([
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
      ]);
      expect(mockUpdateIdentities).toBeCalledWith([
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
      ]);
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
