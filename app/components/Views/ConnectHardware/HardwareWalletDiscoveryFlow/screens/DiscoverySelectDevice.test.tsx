import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '@metamask/design-system-react-native';
import DiscoverySelectDeviceScreen from './DiscoverySelectDevice';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

const TEST_CONFIG: DeviceUIConfig = {
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: 'Ledger',
  stateMachineName: 'Ledger_states',
  deviceIcon: IconName.Mobile,
  troubleshootingItems: [
    { id: 'lock', icon: IconName.LockSlash, label: 'Unlock device' },
  ],
  errorToStepMap: {},
  accountManager: {
    getAccounts: jest.fn().mockResolvedValue([]),
    unlockAccounts: jest.fn().mockResolvedValue(undefined),
    forgetDevice: jest.fn().mockResolvedValue(undefined),
  },
  strings: {
    deviceFound: 'Device found',
    connectButton: 'Connect',
    deviceNotFound: 'Device not found',
    tryAgain: 'Try again',
    selectAccounts: 'Select accounts',
  },
};

const TEST_DEVICES: DiscoveredDevice[] = [
  { id: 'nano-x', name: 'Nano X' },
  { id: 'nano-s-plus', name: 'Nano S Plus' },
];

describe('DiscoverySelectDeviceScreen', () => {
  it('calls onSelectDevice with the tapped device', () => {
    const onSelectDevice = jest.fn();

    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={onSelectDevice}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    fireEvent.press(screen.getByTestId('discovery-device-option-nano-s-plus'));

    expect(
      screen.getByTestId('discovery-device-option-nano-x'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('discovery-device-option-nano-s-plus'),
    ).toBeOnTheScreen();
    expect(onSelectDevice).toHaveBeenCalledWith(TEST_DEVICES[1]);
  });

  it('calls onSave and onClose from the footer and close button', () => {
    const onClose = jest.fn();
    const onSave = jest.fn();

    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={jest.fn()}
        onClose={onClose}
        onSave={onSave}
        config={TEST_CONFIG}
      />,
    );

    fireEvent.press(screen.getByTestId('discovery-save-button'));
    fireEvent.press(screen.getByTestId('discovery-close-sheet'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
