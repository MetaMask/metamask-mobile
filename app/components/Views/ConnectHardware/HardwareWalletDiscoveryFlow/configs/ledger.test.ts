import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createLedgerConfig } from './ledger';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

jest.mock('../../../../../core/Ledger/Ledger', () => ({
  getLedgerAccountsByOperation: jest.fn().mockResolvedValue([
    { address: '0xabc', index: 0, balance: '0x0' },
  ]),
  unlockLedgerWalletAccount: jest.fn().mockResolvedValue(undefined),
  forgetLedger: jest.fn().mockResolvedValue(undefined),
  getHDPath: jest.fn().mockResolvedValue("m/44'/60'/0'/0/0"),
  setHDPath: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('Ledger config', () => {
  let config: DeviceUIConfig;

  beforeEach(() => {
    config = createLedgerConfig();
  });

  it('returns ledger wallet type', () => {
    expect(config.walletType).toBe(HardwareWalletType.Ledger);
  });

  it('has 15 second discovery timeout', () => {
    expect(config.discoveryTimeoutMs).toBe(15000);
  });

  it('maps authentication device locked to device-locked', () => {
    expect(config.errorToStepMap[ErrorCode.AuthenticationDeviceLocked]).toBe(
      'device-locked',
    );
  });

  it('maps device unresponsive to device-unresponsive', () => {
    expect(config.errorToStepMap[ErrorCode.DeviceUnresponsive]).toBe(
      'device-unresponsive',
    );
  });

  it('maps eth app closed to app-not-open', () => {
    expect(config.errorToStepMap[ErrorCode.DeviceStateEthAppClosed]).toBe(
      'app-not-open',
    );
  });

  it('maps bluetooth disabled to transport-unavailable', () => {
    expect(config.errorToStepMap[ErrorCode.BluetoothDisabled]).toBe(
      'transport-unavailable',
    );
  });

  it('maps bluetooth connection failed to transport-connection-failed', () => {
    expect(config.errorToStepMap[ErrorCode.BluetoothConnectionFailed]).toBe(
      'transport-connection-failed',
    );
  });

  it('maps permission bluetooth denied to permission-denied', () => {
    expect(config.errorToStepMap[ErrorCode.PermissionBluetoothDenied]).toBe(
      'permission-denied',
    );
  });

  it('provides troubleshooting items', () => {
    expect(config.troubleshootingItems.length).toBeGreaterThan(0);
    config.troubleshootingItems.forEach((item) => {
      expect(item.id).toBeDefined();
      expect(item.icon).toBeDefined();
      expect(item.label).toBeDefined();
    });
  });

  describe('accountManager', () => {
    it('exposes getHDPathOptions with ledger paths', () => {
      const options = config.accountManager.getHDPathOptions?.();
      expect(options).toBeDefined();
      expect(options!.length).toBe(3);
    });

    it('delegates getAccounts to getLedgerAccountsByOperation', async () => {
      const accounts = await config.accountManager.getAccounts('0');
      expect(accounts).toEqual([{ address: '0xabc', index: 0, balance: '0x0' }]);
    });

    it('delegates unlockAccounts to unlockLedgerWalletAccount', async () => {
      await config.accountManager.unlockAccounts([0, 1]);
      const { unlockLedgerWalletAccount } = jest.requireMock(
        '../../../../../core/Ledger/Ledger',
      );
      expect(unlockLedgerWalletAccount).toHaveBeenCalledTimes(2);
    });

    it('delegates forgetDevice to forgetLedger', async () => {
      await config.accountManager.forgetDevice();
      const { forgetLedger } = jest.requireMock(
        '../../../../../core/Ledger/Ledger',
      );
      expect(forgetLedger).toHaveBeenCalled();
    });

    it('delegates setHDPath to setHDPath', async () => {
      await config.accountManager.setHDPath?.("m/44'/60'/0'/0/0");
      const { setHDPath } = jest.requireMock(
        '../../../../../core/Ledger/Ledger',
      );
      expect(setHDPath).toHaveBeenCalledWith("m/44'/60'/0'/0/0");
    });
  });
});
