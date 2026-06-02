import type { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import { IconName } from '@metamask/design-system-react-native';
import type { DiscoveryStep } from './DiscoveryFlow.machine.types';

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
  animationSource: number | { uri: string };
  artboardName: string;
  stateMachineName: string;
  deviceIcon: IconName;
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
