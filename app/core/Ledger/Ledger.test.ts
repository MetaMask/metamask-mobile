import {
  addLedgerKeyring,
  getLedgerKeyring,
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
  forgetLedger,
} from './Ledger';
import Engine from '../../core/Engine';
import exp from 'constants';

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
  Engine.context.KeyringController = {
    addNewKeyring: mockAddNewKeyring,
    getKeyringsByType: mockGetKeyringsByType,
    getAccounts: mockGetAccounts,
    persistAllKeyrings: mockPersistAllKeyrings,
  };

  const mockSetSelectedAddress = jest.fn();
  Engine.context.PreferencesController = {
    setSelectedAddress: mockSetSelectedAddress,
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

  describe('restoreLedgerKeyring', () => {
    // TBD
  });

  describe('connectLedgerHardware', () => {
    it('should call keyring.setTransport', async () => {
      await connectLedgerHardware('foo', 'bar');
      expect(ledgerKeyring.setTransport).toHaveBeenCalled();
    });

    it('should call keyring.getAppAndVersion', async () => {
      await connectLedgerHardware('foo', 'bar');
      expect(ledgerKeyring.getAppAndVersion).toHaveBeenCalled();
    });

    it('should return app name', async () => {
      const value = await connectLedgerHardware('foo', 'bar');
      expect(value).toBe('appName');
    });
  });

  describe('unlockLedgerDefaultAccount', () => {
    // TBD
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
      expect(mockGetAccounts).toHaveBeenCalled();
      expect(mockPersistAllKeyrings).toHaveBeenCalled();

      expect(mockSetSelectedAddress).toBeCalledWith(
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
      );
    });
  });

  describe('getDeviceId', () => {
    it('should return deviceId', async () => {
      const value = await getLedgerKeyring();
      expect(value.deviceId).toBe('deviceIdClone');
    });
  });

  describe('ledgerSignTypedMessage', () => {
    // TBD
  });
});
