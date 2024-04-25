import {
  addLedgerKeyring,
  getLedgerKeyring,
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
  forgetLedger,
  ledgerSignTypedMessage,
  getDeviceId,
  getLedgerAccountsByPage,
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
  getDeviceId: jest.fn().mockResolvedValue('deviceId'),
  getName: jest.fn().mockResolvedValue('name'),
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

  describe('getDeviceId', () => {
    it('should return the device id', async () => {
      const value = await getDeviceId();
      expect(value).toBe('deviceId');
      expect(ledgerKeyring.getDeviceId).toHaveBeenCalled();
    });
  });

  describe('getLedgerAccountsByPage', () => {
    it('should return first page accounts when page is 1', async () => {
      const value = await getLedgerAccountsByPage(0);
      expect(value).toEqual([
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

      expect(ledgerKeyring.getFirstPage).toHaveBeenCalled();
    });

    it('should return next page accounts when page is 1', async () => {
      const value = await getLedgerAccountsByPage(1);
      expect(value).toEqual([
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

    it('should return previous page accounts when page is -1', async () => {
      const value = await getLedgerAccountsByPage(-1);
      expect(value).toEqual([
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

    it('should throw an error when an unspecified error occurs', async () => {
      ledgerKeyring.getFirstPage.mockRejectedValueOnce(new Error('error'));
      await expect(getLedgerAccountsByPage(0)).rejects.toThrow(
        'Unspecified error when connect Ledger Hardware, Error: error',
      );
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
