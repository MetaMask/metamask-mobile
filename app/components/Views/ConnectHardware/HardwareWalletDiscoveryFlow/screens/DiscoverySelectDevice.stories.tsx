import React from 'react';
import {
  Box,
  BoxBackgroundColor,
  IconName,
} from '@metamask/design-system-react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import DiscoverySelectDeviceScreen from './DiscoverySelectDevice';
import {
  LEDGER_ARTBOARD_NAME,
  LEDGER_STATE_MACHINE_NAME,
} from '../../ledgerRiveConstants';

const mockDevices: DiscoveredDevice[] = [
  { id: '1', name: 'Ledger Nano X' },
  { id: '2', name: 'Ledger Nano S Plus' },
  { id: '3', name: 'Ledger Stax' },
];

const mockConfig: DeviceUIConfig = {
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: LEDGER_ARTBOARD_NAME,
  stateMachineName: LEDGER_STATE_MACHINE_NAME,
  deviceIcon: IconName.Mobile,
  troubleshootingItems: [],
  errorToStepMap: {},
  accountManager: {
    getAccounts: async () => [],
    unlockAccounts: async () => {
      /* noop */
    },
    forgetDevice: async () => {
      /* noop */
    },
  },
  strings: {
    deviceFound: 'Device found',
    connectButton: 'Connect',
    deviceNotFound: 'Device not found',
    tryAgain: 'Try again',
    selectAccounts: 'Select accounts',
  },
};

const noop = () => {
  /* noop */
};

const DiscoverySelectDeviceMeta = {
  title: 'Views / Connect Hardware / Discovery Select Device',
  component: DiscoverySelectDeviceScreen,
  decorators: [
    (Story: React.FC) => (
      <Box
        twClassName="flex-1"
        backgroundColor={BoxBackgroundColor.BackgroundDefault}
      >
        <Story />
      </Box>
    ),
  ],
  args: {
    devices: mockDevices,
    selectedDeviceId: '1',
    onSelectDevice: noop,
    onClose: noop,
    onSave: noop,
    config: mockConfig,
  },
};

export default DiscoverySelectDeviceMeta;

export const Default = {};

export const NoDeviceSelected = {
  args: {
    selectedDeviceId: '',
  },
};

export const SingleDevice = {
  args: {
    devices: [mockDevices[0]],
    selectedDeviceId: '1',
  },
};
