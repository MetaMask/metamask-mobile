import {
  addLedgerKeyring,
  getLedgerKeyring,
  connectLedgerHardware,
} from './Ledger';
import Engine from '../../core/Engine';

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
};

describe('Ledger core', () => {
  const ledgerKeyringClone = {
    ...ledgerKeyring,
    deviceId: 'deviceIdClone',
  };
  const mockAddNewKeyring = jest.fn().mockReturnValue(ledgerKeyring);
  const mockGetKeyringsByType = jest.fn().mockReturnValue([ledgerKeyringClone]);
  Engine.context.KeyringController = {
    addNewKeyring: mockAddNewKeyring,
    getKeyringsByType: mockGetKeyringsByType,
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
    // TBD
  });

  describe('closeRunningAppOnLedger', () => {
    // TBD
  });

  describe('forgetLedger', () => {
    // TBD
  });

  describe('getDeviceId', () => {
    // TBD
  });

  describe('ledgerSignTypedMessage', () => {
    // TBD
  });
});
