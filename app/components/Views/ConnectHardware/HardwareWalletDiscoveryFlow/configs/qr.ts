import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  forgetQrDevice,
  withQrKeyring,
} from '../../../../../core/QrKeyring/QrKeyring';
import PAGINATION_OPERATIONS from '../../../../../constants/pagination';
import hardwareWalletAnimation from '../../../../../animations/hardware_wallet.riv';
import { DiscoveryStep } from '../DiscoveryFlow.machine.types';
import type { DeviceUIConfig, AccountInfo } from '../DiscoveryFlow.types';

/**
 * Builds the device UI configuration for QR-based hardware wallets
 * (Keystone, OneKey, etc.). QR wallets have no BLE discovery, so the
 * discovery timeout is zero and the flow jumps straight to the
 * account selection step.
 *
 * @returns The configuration consumed by the discovery flow orchestrator.
 */
export function createQRConfig(): DeviceUIConfig {
  return {
    walletType: HardwareWalletType.Qr,
    discoveryTimeoutMs: 0,
    animationSource: hardwareWalletAnimation,
    artboardName: 'Ledger',
    stateMachineName: 'Ledger_states',
    deviceIcon: IconName.QrCode,
    troubleshootingItems: [
      {
        id: 'camera',
        icon: IconName.Camera,
        label: strings('connect_hardware.enable_camera'),
      },
      {
        id: 'qr-visible',
        icon: IconName.QrCode,
        label: strings('connect_hardware.qr_visible'),
      },
    ],
    errorToStepMap: {
      [ErrorCode.PermissionCameraDenied]: DiscoveryStep.PermissionDenied,
      [ErrorCode.DeviceNotFound]: DiscoveryStep.NotFound,
      [ErrorCode.ConnectionTimeout]: DiscoveryStep.NotFound,
    },
    accountManager: {
      getAccounts: async (operation: string): Promise<AccountInfo[]> => {
        const op = Number(operation);
        const accounts = await withQrKeyring(async ({ keyring }) => {
          switch (op) {
            case PAGINATION_OPERATIONS.GET_NEXT_PAGE:
              return keyring.getNextPage();
            case PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE:
              return keyring.getPreviousPage();
            default:
              return keyring.getFirstPage();
          }
        });

        return accounts.map((account) => ({
          address: account.address,
          index: account.index,
          balance: '0x0',
        }));
      },
      unlockAccounts: async (indexes: number[]) => {
        await withQrKeyring(async ({ keyring }) => {
          for (const index of indexes) {
            keyring.setAccountToUnlock(index);
            await keyring.addAccounts(1);
          }
        });
      },
      forgetDevice: forgetQrDevice,
    },
    strings: {
      deviceFound: strings('connect_hardware.scan_qr_code'),
      connectButton: strings('connect_hardware.continue'),
      deviceNotFound: strings('connect_hardware.device_not_found'),
      tryAgain: strings('connect_hardware.try_again'),
      selectAccounts: strings('connect_hardware.select_accounts'),
    },
  };
}
