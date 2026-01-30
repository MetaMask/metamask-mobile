// Mocks must be before imports for proper hoisting
// Mock context values
const mockConnectionState: Record<string, unknown> = { status: 'disconnected' };
const mockDeviceSelection = {
  devices: [],
  selectedDevice: null,
  isScanning: false,
  scanError: null,
};
const mockConfig = { walletType: 'ledger' };
const mockActions = {
  clearError: jest.fn(),
  retry: jest.fn(),
  disconnect: jest.fn(),
  closeDeviceSelection: jest.fn(),
  selectDevice: jest.fn(),
  rescan: jest.fn(),
  connect: jest.fn(),
};

// Mock contexts
jest.mock('../../contexts', () => ({
  useHardwareWalletState: () => ({
    connectionState: mockConnectionState,
    deviceSelection: mockDeviceSelection,
  }),
  useHardwareWalletConfig: () => mockConfig,
  useHardwareWalletActions: () => mockActions,
}));

// Mock dependencies
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#FFFFFF' },
    },
  }),
}));

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

// Mock content components
jest.mock('./contents', () => ({
  ConnectingContent: () => null,
  DeviceSelectionContent: () => null,
  AwaitingAppContent: () => null,
  AwaitingConfirmationContent: () => null,
  ErrorContent: () => null,
  SuccessContent: () => null,
}));

// Mock bottom sheet
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      }) => <View testID={testID}>{children}</View>,
    };
  },
);

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  HardwareWalletError,
  ErrorCode,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';

import {
  HardwareWalletBottomSheet,
  HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID,
} from './HardwareWalletBottomSheet';
import { ConnectionStatus } from '../../connectionState';
import { HardwareWalletType } from '../../helpers';

describe('HardwareWalletBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock connection state
    Object.assign(mockConnectionState, {
      status: ConnectionStatus.Disconnected,
    });
  });

  describe('visibility', () => {
    it('should not render when disconnected', () => {
      mockConnectionState.status = ConnectionStatus.Disconnected;
      const { queryByTestId } = render(<HardwareWalletBottomSheet />);

      expect(queryByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeNull();
    });

    it('should render when connected (polling may still be in progress)', () => {
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.Connected,
        deviceId: 'device-123',
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      // Connected state now shows the sheet because polling for app readiness
      // may still be in progress
      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });

    it('should render when connecting', () => {
      mockConnectionState.status = ConnectionStatus.Connecting;
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });

    it('should render when awaiting app', () => {
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });

    it('should render when awaiting confirmation', () => {
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: 'device-123',
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });

    it('should render when in error state', () => {
      const error = new HardwareWalletError('Test error', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Test error message',
      });
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.ErrorState,
        error,
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });
  });
});
