import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import { HardwareWalletType } from '../../../helpers';
import { DiscoveredDevice } from '../../../types';
import {
  DeviceSelectionContent,
  DEVICE_SELECTION_CONTENT_TEST_ID,
  DEVICE_SELECTION_ITEM_TEST_ID,
  DEVICE_SELECTION_EMPTY_TEST_ID,
  DEVICE_SELECTION_SCANNING_TEST_ID,
} from './DeviceSelectionContent';

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'hardware_wallet.device_names.ledger': 'Ledger',
      'hardware_wallet.device_selection.title': `Select ${params?.device || 'device'}`,
      'hardware_wallet.device_selection.scanning': 'Scanning...',
      'hardware_wallet.device_selection.no_devices_found': 'No devices found',
      'hardware_wallet.device_selection.no_devices_hint': `Make sure your ${params?.device || 'device'} is on`,
      'hardware_wallet.device_selection.tips': `Tips for ${params?.device || 'device'}`,
      'hardware_wallet.device_selection.connect': 'Connect',
      'hardware_wallet.device_selection.rescan': 'Scan Again',
      'hardware_wallet.device_selection.unknown_device': 'Unknown Device',
      'hardware_wallet.device_selection.signal_strength': `Signal: ${params?.rssi || '0'}`,
      'hardware_wallet.common.cancel': 'Cancel',
    };
    return translations[key] || key;
  },
}));

const mockDevices: DiscoveredDevice[] = [
  { id: 'device-1', name: 'Nano X 1234', metadata: { rssi: -45 } },
  { id: 'device-2', name: 'Nano X 5678', metadata: { rssi: -60 } },
  { id: 'device-3', name: 'Nano S Plus', metadata: { rssi: -75 } },
];

const mockInitialState = {
  user: {
    appTheme: AppThemeKey.light,
  },
};

describe('DeviceSelectionContent', () => {
  const defaultProps = {
    devices: mockDevices,
    selectedDevice: undefined,
    isScanning: false,
    deviceType: HardwareWalletType.Ledger,
    onSelectDevice: jest.fn(),
    onConfirmSelection: jest.fn(),
    onRescan: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with devices', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <DeviceSelectionContent {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByTestId(DEVICE_SELECTION_CONTENT_TEST_ID)).toBeDefined();
    expect(getByText('Select Ledger')).toBeDefined();
    expect(getByText('Nano X 1234')).toBeDefined();
    expect(getByText('Nano X 5678')).toBeDefined();
    expect(getByText('Nano S Plus')).toBeDefined();
  });

  it('renders empty state when no devices', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <DeviceSelectionContent {...defaultProps} devices={[]} />,
      { state: mockInitialState },
    );

    expect(getByTestId(DEVICE_SELECTION_EMPTY_TEST_ID)).toBeDefined();
    expect(getByText('No devices found')).toBeDefined();
  });

  it('shows scanning indicator when scanning', () => {
    const { getByTestId, getAllByText } = renderWithProvider(
      <DeviceSelectionContent {...defaultProps} isScanning devices={[]} />,
      { state: mockInitialState },
    );

    expect(getByTestId(DEVICE_SELECTION_SCANNING_TEST_ID)).toBeDefined();
    expect(getAllByText('Scanning...').length).toBeGreaterThan(0);
  });

  it('calls onSelectDevice when device is tapped', () => {
    const onSelectDevice = jest.fn();
    const { getByTestId } = renderWithProvider(
      <DeviceSelectionContent
        {...defaultProps}
        onSelectDevice={onSelectDevice}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`${DEVICE_SELECTION_ITEM_TEST_ID}-device-1`));
    expect(onSelectDevice).toHaveBeenCalledWith(mockDevices[0]);
  });

  it('highlights selected device', () => {
    const { getByTestId } = renderWithProvider(
      <DeviceSelectionContent
        {...defaultProps}
        selectedDevice={mockDevices[0]}
      />,
      { state: mockInitialState },
    );

    const selectedItem = getByTestId(
      `${DEVICE_SELECTION_ITEM_TEST_ID}-device-1`,
    );
    // Check that selected item has the right accessibility state
    expect(selectedItem.props.accessibilityState.selected).toBe(true);
  });

  it('shows connect button when device is selected', () => {
    const { getByText } = renderWithProvider(
      <DeviceSelectionContent
        {...defaultProps}
        selectedDevice={mockDevices[0]}
      />,
      { state: mockInitialState },
    );

    expect(getByText('Connect')).toBeDefined();
  });

  it('calls onConfirmSelection when connect button is pressed', () => {
    const onConfirmSelection = jest.fn();
    const { getByText } = renderWithProvider(
      <DeviceSelectionContent
        {...defaultProps}
        selectedDevice={mockDevices[0]}
        onConfirmSelection={onConfirmSelection}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText('Connect'));
    expect(onConfirmSelection).toHaveBeenCalled();
  });

  it('calls onRescan when rescan button is pressed', () => {
    const onRescan = jest.fn();
    const { getByText } = renderWithProvider(
      <DeviceSelectionContent {...defaultProps} onRescan={onRescan} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText('Scan Again'));
    expect(onRescan).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = renderWithProvider(
      <DeviceSelectionContent {...defaultProps} onCancel={onCancel} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('hides rescan button when scanning', () => {
    const { queryByText } = renderWithProvider(
      <DeviceSelectionContent {...defaultProps} isScanning />,
      { state: mockInitialState },
    );

    expect(queryByText('Scan Again')).toBeNull();
  });

  it('renders without optional callbacks', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <DeviceSelectionContent
        devices={mockDevices}
        selectedDevice={undefined}
        isScanning={false}
        onSelectDevice={jest.fn()}
        onConfirmSelection={jest.fn()}
      />,
      { state: mockInitialState },
    );

    expect(getByTestId(DEVICE_SELECTION_CONTENT_TEST_ID)).toBeDefined();
    expect(queryByText('Scan Again')).toBeNull();
    expect(queryByText('Cancel')).toBeNull();
  });
});
