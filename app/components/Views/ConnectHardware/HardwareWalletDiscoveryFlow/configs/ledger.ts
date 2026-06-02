import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { strings } from '../../../../../../locales/i18n';
import {
  LEDGER_BIP44_PATH,
  LEDGER_LEGACY_PATH,
  LEDGER_LIVE_PATH,
} from '../../../../../core/Ledger/constants';
import {
  forgetLedger,
  getLedgerAccountsByOperation,
  setHDPath,
  unlockLedgerWalletAccount,
} from '../../../../../core/Ledger/Ledger';
import hardwareWalletAnimation from '../../../../../animations/hardware_wallet.riv';
import { DiscoveryStep } from '../DiscoveryFlow.machine.types';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import { IconName } from '@metamask/design-system-react-native';

/**
 * Builds the device UI configuration for Ledger hardware wallets, including
 * the discovery timeout, animation source, troubleshooting copy, and the
 * account manager that delegates to the Ledger keyring integration.
 *
 * @returns The configuration consumed by the discovery flow orchestrator.
 */
export function createLedgerConfig(): DeviceUIConfig {
  return {
    walletType: HardwareWalletType.Ledger,
    discoveryTimeoutMs: 15000,
    animationSource: hardwareWalletAnimation,
    artboardName: 'Ledger',
    stateMachineName: 'Ledger_states',
    deviceIcon: IconName.Mobile,
    troubleshootingItems: [
      {
        id: 'lock',
        icon: IconName.LockSlash,
        label: strings('ledger.unlock_ledger_device'),
      },
      {
        id: 'ethereum',
        icon: IconName.Ethereum,
        label: strings('ledger.install_and_open_eth_app'),
      },
      {
        id: 'bluetooth',
        icon: IconName.Connect,
        label: strings('ledger.enable_bluetooth'),
      },
      {
        id: 'dnd',
        icon: IconName.VolumeOff,
        label: strings('ledger.turn_off_do_not_disturb'),
      },
    ],
    errorToStepMap: {
      [ErrorCode.AuthenticationDeviceLocked]: DiscoveryStep.DeviceLocked,
      [ErrorCode.DeviceUnresponsive]: DiscoveryStep.DeviceUnresponsive,
      [ErrorCode.DeviceStateEthAppClosed]: DiscoveryStep.AppNotOpen,
      [ErrorCode.BluetoothDisabled]: DiscoveryStep.TransportUnavailable,
      [ErrorCode.BluetoothConnectionFailed]:
        DiscoveryStep.TransportConnectionFailed,
      [ErrorCode.BluetoothScanFailed]: DiscoveryStep.TransportConnectionFailed,
      [ErrorCode.PermissionBluetoothDenied]:
        DiscoveryStep.BluetoothAccessDenied,
      [ErrorCode.PermissionLocationDenied]: DiscoveryStep.LocationAccessDenied,
      [ErrorCode.PermissionNearbyDevicesDenied]:
        DiscoveryStep.NearbyDevicesDenied,
    },
    accountManager: {
      getAccounts: (operation: string) =>
        getLedgerAccountsByOperation(Number(operation)),
      unlockAccounts: async (indexes: number[]) => {
        for (const index of indexes) {
          await unlockLedgerWalletAccount(index);
        }
      },
      forgetDevice: forgetLedger,
      getHDPathOptions: () => [
        {
          key: LEDGER_LIVE_PATH,
          label: strings('ledger.ledger_live_path'),
          value: LEDGER_LIVE_PATH,
        },
        {
          key: LEDGER_LEGACY_PATH,
          label: strings('ledger.ledger_legacy_path'),
          value: LEDGER_LEGACY_PATH,
        },
        {
          key: LEDGER_BIP44_PATH,
          label: strings('ledger.ledger_bip44_path'),
          value: LEDGER_BIP44_PATH,
        },
      ],
      setHDPath,
    },
    strings: {
      deviceFound: strings('ledger.device_found'),
      connectButton: strings('ledger.connect_ledger'),
      deviceNotFound: strings('ledger.device_not_found'),
      tryAgain: strings('ledger.try_again'),
      selectAccounts: strings('ledger.select_accounts'),
    },
  };
}
