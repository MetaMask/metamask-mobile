import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '@metamask/design-system-react-native';
import DiscoverySelectDeviceScreen from './DiscoverySelectDevice';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';
import { mockTheme } from '../../../../../util/theme';

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

const selectedCheckTestId = (deviceId: string) =>
  `discovery-device-selected-${deviceId}`;

describe('DiscoverySelectDeviceScreen', () => {
  it('renders a visible drag handle using the muted border color', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    const dragHandle = screen.getByTestId(
      'discovery-select-device-drag-handle',
    );

    expect(dragHandle).toBeOnTheScreen();
    expect(StyleSheet.flatten(dragHandle.props.style)).toEqual(
      expect.objectContaining({
        width: 40,
        height: 4,
        backgroundColor: mockTheme.colors.border.muted,
      }),
    );
  });

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

  it('uses unique testIDs per device id when display names match', () => {
    const duplicateNameDevices: DiscoveredDevice[] = [
      { id: 'ble-aa:11:22', name: 'Nano X' },
      { id: 'ble:bb:33:44', name: 'Nano X' },
    ];

    render(
      <DiscoverySelectDeviceScreen
        devices={duplicateNameDevices}
        selectedDeviceId="ble-aa:11:22"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    expect(
      screen.getByTestId('discovery-device-option-ble-aa:11:22'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('discovery-device-option-ble:bb:33:44'),
    ).toBeOnTheScreen();
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

  it('closes from the overlay', () => {
    const onClose = jest.fn();
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={jest.fn()}
        onClose={onClose}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    fireEvent.press(screen.getByTestId('discovery-select-device-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when interacting with sheet controls', () => {
    const onClose = jest.fn();
    const onSave = jest.fn();
    const onSelectDevice = jest.fn();
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={onSelectDevice}
        onClose={onClose}
        onSave={onSave}
        config={TEST_CONFIG}
      />,
    );

    fireEvent.press(screen.getByTestId('discovery-device-option-nano-s-plus'));
    fireEvent.press(screen.getByTestId('discovery-save-button'));

    expect(onSelectDevice).toHaveBeenCalledWith(TEST_DEVICES[1]);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('marks the sheet content as the touch responder', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    expect(
      screen
        .getByTestId('discovery-select-device-sheet-content')
        .props.onStartShouldSetResponder(),
    ).toBe(true);
  });

  it('renders the heading and save button text', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    expect(screen.getByText('Select device')).toBeOnTheScreen();
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('renders device names from the devices list', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    expect(screen.getByText('Nano X')).toBeOnTheScreen();
    expect(screen.getByText('Nano S Plus')).toBeOnTheScreen();
  });

  it('shows a check icon only on the selected device', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-s-plus"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    const nanoSPlusRow = screen.getByTestId(
      'discovery-device-option-nano-s-plus',
    );
    const nanoXRow = screen.getByTestId('discovery-device-option-nano-x');

    expect(
      within(nanoSPlusRow).getByTestId(selectedCheckTestId('nano-s-plus')),
    ).toBeOnTheScreen();
    expect(
      within(nanoXRow).queryByTestId(selectedCheckTestId('nano-x')),
    ).toBeNull();
  });

  it('renders no check icons when no device matches selectedDeviceId', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="unknown-id"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    const nanoXRow = screen.getByTestId('discovery-device-option-nano-x');
    const nanoSPlusRow = screen.getByTestId(
      'discovery-device-option-nano-s-plus',
    );

    expect(
      within(nanoXRow).queryByTestId(selectedCheckTestId('nano-x')),
    ).toBeNull();
    expect(
      within(nanoSPlusRow).queryByTestId(selectedCheckTestId('nano-s-plus')),
    ).toBeNull();
  });

  it('renders with an empty devices list', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={[]}
        selectedDeviceId=""
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    expect(
      screen.getByTestId('discovery-select-device-sheet'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Select device')).toBeOnTheScreen();
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('uses the deviceIcon from config', () => {
    render(
      <DiscoverySelectDeviceScreen
        devices={TEST_DEVICES}
        selectedDeviceId="nano-x"
        onSelectDevice={jest.fn()}
        onClose={jest.fn()}
        onSave={jest.fn()}
        config={TEST_CONFIG}
      />,
    );

    const icons = screen.UNSAFE_queryAllByProps({ name: 'Mobile' });
    expect(icons.length).toBeGreaterThanOrEqual(TEST_DEVICES.length);
  });
});
