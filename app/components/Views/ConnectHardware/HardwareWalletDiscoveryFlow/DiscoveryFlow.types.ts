import type { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { IconName } from '../../../../component-library/components/Icons/Icon';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import PAGINATION_OPERATIONS from '../../../../constants/pagination';

export type DiscoveryStep =
  | 'searching'
  | 'found'
  | 'not-found'
  | 'accounts'
  | 'device-locked'
  | 'device-unresponsive'
  | 'app-not-open'
  | 'transport-unavailable'
  | 'transport-connection-failed'
  | 'permission-denied';

export interface TroubleshootingItem {
  id: string;
  icon: IconName;
  label: string;
}

export interface HDPathOption {
  key: string;
  label: string;
  value: string;
}

export interface AccountInfo {
  address: string;
  index: number;
  balance: string;
}

export interface HardwareAccountManager {
  getAccounts(operation: string): Promise<AccountInfo[]>;
  unlockAccounts(indexes: number[]): Promise<void>;
  forgetDevice(): Promise<void>;
  getHDPathOptions?(): HDPathOption[];
  setHDPath?(path: string): Promise<void>;
  getDeviceModelName?(device: DiscoveredDevice): string | undefined;
}

export interface DeviceUIConfig {
  walletType: HardwareWalletType;
  discoveryTimeoutMs: number;
  animationSource: number;
  artboardName: string;
  stateMachineName: string;
  deviceIcon: string;
  troubleshootingItems: TroubleshootingItem[];
  errorToStepMap: Partial<Record<ErrorCode, DiscoveryStep>>;
  accountManager: HardwareAccountManager;
  strings: {
    deviceFound: string;
    connectButton: string;
    deviceNotFound: string;
    tryAgain: string;
    selectAccounts: string;
  };
}

export type MachineEvent =
  | { type: 'PERMISSIONS_GRANTED' }
  | { type: 'PERMISSIONS_DENIED'; errorCode: ErrorCode }
  | { type: 'DEVICE_FOUND'; device: DiscoveredDevice }
  | { type: 'TIMEOUT' }
  | { type: 'SCAN_ERROR'; error: Error }
  | { type: 'TRANSPORT_UNAVAILABLE' }
  | { type: 'TRANSPORT_AVAILABLE' }
  | { type: 'CONNECT_ERROR'; errorCode: ErrorCode }
  | { type: 'DEVICE_SELECTED'; device: DiscoveredDevice }
  | { type: 'RETRY' }
  | { type: 'BACK' }
  | { type: 'OPEN_ACCOUNTS'; device: DiscoveredDevice };
