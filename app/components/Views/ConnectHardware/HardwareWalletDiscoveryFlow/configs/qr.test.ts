import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createQRConfig } from './qr';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

jest.mock('../../../../../core/QrKeyring/QrKeyring', () => ({
  withQrKeyring: jest.fn().mockImplementation((cb) =>
    cb({
      keyring: {
        getFirstPage: jest.fn().mockResolvedValue([
          { address: '0xdef', index: 0, balance: '0x0' },
        ]),
        getNextPage: jest.fn().mockResolvedValue([]),
        getPreviousPage: jest.fn().mockResolvedValue([]),
        setAccountToUnlock: jest.fn(),
        addAccounts: jest.fn().mockResolvedValue(['0xdef']),
        forgetDevice: jest.fn().mockResolvedValue(undefined),
      },
      metadata: { id: 'qr-1', name: 'QR Wallet' },
    }),
  ),
  forgetQrDevice: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('QR config', () => {
  let config: DeviceUIConfig;

  beforeEach(() => {
    config = createQRConfig();
  });

  it('returns QR wallet type', () => {
    expect(config.walletType).toBe(HardwareWalletType.Qr);
  });

  it('has zero discovery timeout (no BLE scan)', () => {
    expect(config.discoveryTimeoutMs).toBe(0);
  });

  it('maps camera permission denied to permission-denied', () => {
    expect(config.errorToStepMap[ErrorCode.PermissionCameraDenied]).toBe(
      'permission-denied',
    );
  });

  it('maps device not found to not-found', () => {
    expect(config.errorToStepMap[ErrorCode.DeviceNotFound]).toBe('not-found');
  });

  it('provides troubleshooting items', () => {
    expect(config.troubleshootingItems.length).toBeGreaterThan(0);
  });

  describe('accountManager', () => {
    it('does not provide HD path options', () => {
      expect(config.accountManager.getHDPathOptions).toBeUndefined();
    });

    it('delegates getAccounts to withQrKeyring', async () => {
      const accounts = await config.accountManager.getAccounts('0');
      expect(accounts).toEqual([{ address: '0xdef', index: 0, balance: '0x0' }]);
    });

    it('delegates forgetDevice to forgetQrDevice', async () => {
      await config.accountManager.forgetDevice();
      const { forgetQrDevice } = jest.requireMock(
        '../../../../../core/QrKeyring/QrKeyring',
      );
      expect(forgetQrDevice).toHaveBeenCalled();
    });
  });
});
