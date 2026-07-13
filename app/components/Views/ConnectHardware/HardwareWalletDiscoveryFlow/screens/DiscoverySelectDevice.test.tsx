import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '@metamask/design-system-react-native';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';

const mockOnCloseBottomSheet = jest.fn();

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
          onClose,
        }: {
          children: React.ReactNode;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => {
            mockOnCloseBottomSheet();
            onClose?.();
          },
        }));

        return (
          <View testID={testID}>
            <TouchableOpacity
              testID="discovery-select-device-overlay"
              onPress={onClose}
            />
            {children}
          </View>
        );
      },
    ),
  };
});

import DiscoverySelectDeviceScreen from './DiscoverySelectDevice';
import {
  LEDGER_ARTBOARD_NAME,
  LEDGER_STATE_MACHINE_NAME,
} from '../../ledgerRiveConstants';

const TEST_CONFIG: DeviceUIConfig = {
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: LEDGER_ARTBOARD_NAME,
  stateMachineName: LEDGER_STATE_MACHINE_NAME,
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

const defaultProps = {
  devices: TEST_DEVICES,
  selectedDeviceId: 'nano-x',
  onSelectDevice: jest.fn(),
  onClose: jest.fn(),
  onSave: jest.fn(),
  config: TEST_CONFIG,
};

describe('DiscoverySelectDeviceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bottom sheet container', () => {
    render(<DiscoverySelectDeviceScreen {...defaultProps} />);

    expect(
      screen.getByTestId('discovery-select-device-sheet'),
    ).toBeOnTheScreen();
  });

  it('calls onSelectDevice with the tapped device', () => {
    const onSelectDevice = jest.fn();

    render(
      <DiscoverySelectDeviceScreen
        {...defaultProps}
        onSelectDevice={onSelectDevice}
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
        {...defaultProps}
        devices={duplicateNameDevices}
        selectedDeviceId="ble-aa:11:22"
      />,
    );

    expect(
      screen.getByTestId('discovery-device-option-ble-aa:11:22'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('discovery-device-option-ble:bb:33:44'),
    ).toBeOnTheScreen();
  });

  it('calls onSave and closes from the footer and close button', () => {
    const onClose = jest.fn();
    const onSave = jest.fn();

    render(
      <DiscoverySelectDeviceScreen
        {...defaultProps}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByTestId('discovery-save-button');
    expect(saveButton).toBeEnabled();

    fireEvent.press(saveButton);
    fireEvent.press(screen.getByTestId('discovery-close-sheet'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the overlay', () => {
    const onClose = jest.fn();
    render(<DiscoverySelectDeviceScreen {...defaultProps} onClose={onClose} />);

    fireEvent.press(screen.getByTestId('discovery-select-device-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when interacting with sheet controls', () => {
    const onClose = jest.fn();
    const onSave = jest.fn();
    const onSelectDevice = jest.fn();
    render(
      <DiscoverySelectDeviceScreen
        {...defaultProps}
        onSelectDevice={onSelectDevice}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    fireEvent.press(screen.getByTestId('discovery-device-option-nano-s-plus'));
    fireEvent.press(screen.getByTestId('discovery-save-button'));

    expect(onSelectDevice).toHaveBeenCalledWith(TEST_DEVICES[1]);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the heading and save button text', () => {
    render(<DiscoverySelectDeviceScreen {...defaultProps} />);

    expect(screen.getByText('Select device')).toBeOnTheScreen();
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('renders device names from the devices list', () => {
    render(<DiscoverySelectDeviceScreen {...defaultProps} />);

    expect(screen.getByText('Nano X')).toBeOnTheScreen();
    expect(screen.getByText('Nano S Plus')).toBeOnTheScreen();
  });

  it('shows a check icon only on the selected device', () => {
    render(
      <DiscoverySelectDeviceScreen
        {...defaultProps}
        selectedDeviceId="nano-s-plus"
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
        {...defaultProps}
        selectedDeviceId="unknown-id"
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

  it('disables Save when selectedDeviceId is empty', () => {
    const onSave = jest.fn();

    render(
      <DiscoverySelectDeviceScreen
        {...defaultProps}
        selectedDeviceId=""
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByTestId('discovery-save-button');
    expect(saveButton).toBeDisabled();

    fireEvent.press(saveButton);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('disables Save when selectedDeviceId does not match any device', () => {
    const onSave = jest.fn();

    render(
      <DiscoverySelectDeviceScreen
        {...defaultProps}
        selectedDeviceId="unknown-id"
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByTestId('discovery-save-button');
    expect(saveButton).toBeDisabled();

    fireEvent.press(saveButton);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('renders with an empty devices list', () => {
    const onSave = jest.fn();

    render(
      <DiscoverySelectDeviceScreen
        {...defaultProps}
        devices={[]}
        selectedDeviceId=""
        onSave={onSave}
      />,
    );

    expect(
      screen.getByTestId('discovery-select-device-sheet'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Select device')).toBeOnTheScreen();
    expect(screen.getByText('Save')).toBeOnTheScreen();

    const saveButton = screen.getByTestId('discovery-save-button');
    expect(saveButton).toBeDisabled();

    fireEvent.press(saveButton);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('uses the deviceIcon from config', () => {
    render(<DiscoverySelectDeviceScreen {...defaultProps} />);

    const icons = screen.UNSAFE_queryAllByProps({ name: 'Mobile' });
    expect(icons.length).toBeGreaterThanOrEqual(TEST_DEVICES.length);
  });
});
