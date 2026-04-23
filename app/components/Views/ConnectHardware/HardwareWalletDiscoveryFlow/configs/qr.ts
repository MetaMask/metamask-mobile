import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import {
  forgetQrDevice,
  withQrKeyring,
} from '../../../../../core/QrKeyring/QrKeyring';
import PAGINATION_OPERATIONS from '../../../../../constants/pagination';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

export function createQRConfig(): DeviceUIConfig {
  return {
    walletType: HardwareWalletType.Qr,
    discoveryTimeoutMs: 0,
    animationSource: require('../../../../../animations/hardware_wallet.riv'),
    artboardName: 'Ledger',
    stateMachineName: 'Ledger_states',
    deviceIcon: 'qr-code',
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
      [ErrorCode.PermissionCameraDenied]: 'permission-denied',
      [ErrorCode.DeviceNotFound]: 'not-found',
      [ErrorCode.ConnectionTimeout]: 'not-found',
    },
    accountManager: {
      getAccounts: async (operation: string) => {
        const op = Number(operation);
        return withQrKeyring(async ({ keyring }) => {
          switch (op) {
            case PAGINATION_OPERATIONS.GET_NEXT_PAGE:
              return keyring.getNextPage();
            case PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE:
              return keyring.getPreviousPage();
            default:
              return keyring.getFirstPage();
          }
        });
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
