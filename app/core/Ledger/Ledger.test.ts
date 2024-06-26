import {
  closeRunningAppOnLedger,
  connectLedgerHardware,
  forgetLedger,
  getDeviceId,
  getLedgerAccountsByPage,
  ledgerSignTypedMessage,
  openEthereumAppOnLedger,
} from './Ledger';
import Engine from '../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import {
  LedgerKeyring,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';

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
  let ledgerMobileBridge: LedgerMobileBridge;

  beforeEach(() => {
    jest.resetAllMocks();

    ledgerMobileBridge = {
      getAppNameAndVersion: jest.fn().mockResolvedValue({ appName: 'appName' }),
      updateTransportMethod: jest.fn(),
      openEthApp: jest.fn(),
      closeApps: jest.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ledgerKeyring = {
      addAccounts: jest.fn(),
      bridge: ledgerMobileBridge,
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
      expect(ledgerKeyring.bridge.updateTransportMethod).toHaveBeenCalled();
    });

    it('should call keyring.getAppAndVersion', async () => {
      await connectLedgerHardware(mockTransport, 'bar');
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
    });
  });

  describe('getDeviceId', () => {
    it('should return deviceId', async () => {
      const value = await getDeviceId();
      expect(value).toBe('deviceId');
    });
  });

  describe('getLedgerAccountsByPage', () => {
    it('should call getNextPage on ledgerKeyring', async () => {
      await getLedgerAccountsByPage(1);
      expect(ledgerKeyring.getNextPage).toHaveBeenCalled();
    });
    it('should call getNextPage on ledgerKeyring', async () => {
      await getLedgerAccountsByPage(-1);
      expect(ledgerKeyring.getPreviousPage).toHaveBeenCalled();
    });
    it('should call getFirstPage on ledgerKeyring', async () => {
      await getLedgerAccountsByPage(0);
      expect(ledgerKeyring.getFirstPage).toHaveBeenCalled();
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
