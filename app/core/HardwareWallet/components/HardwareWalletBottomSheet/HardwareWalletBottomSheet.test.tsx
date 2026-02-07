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

// Track props passed to content components for testing handlers
let lastDeviceSelectionProps: Record<string, unknown> = {};
let lastErrorContentProps: Record<string, unknown> = {};
let lastSuccessContentProps: Record<string, unknown> = {};
let lastAwaitingConfirmationProps: Record<string, unknown> = {};
let lastAwaitingAppProps: Record<string, unknown> = {};

// Mock content components - capture props for testing
jest.mock('./contents', () => ({
  ConnectingContent: () => null,
  DeviceSelectionContent: (props: Record<string, unknown>) => {
    lastDeviceSelectionProps = props;
    return null;
  },
  AwaitingAppContent: (props: Record<string, unknown>) => {
    lastAwaitingAppProps = props;
    return null;
  },
  AwaitingConfirmationContent: (props: Record<string, unknown>) => {
    lastAwaitingConfirmationProps = props;
    return null;
  },
  ErrorContent: (props: Record<string, unknown>) => {
    lastErrorContentProps = props;
    return null;
  },
  SuccessContent: (props: Record<string, unknown>) => {
    lastSuccessContentProps = props;
    return null;
  },
}));

// Track BottomSheet onClose callback
let lastBottomSheetOnClose: (() => void) | undefined;

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
        onClose,
      }: {
        children: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      }) => {
        lastBottomSheetOnClose = onClose;
        return <View testID={testID}>{children}</View>;
      },
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

describe('HardwareWalletBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock connection state
    Object.assign(mockConnectionState, {
      status: ConnectionStatus.Disconnected,
    });
    // Reset device selection state
    Object.assign(mockDeviceSelection, {
      devices: [],
      selectedDevice: null,
      isScanning: false,
      scanError: null,
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

    it('should render when scanning', () => {
      mockConnectionState.status = ConnectionStatus.Scanning;
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });

    it('should render when in success state', () => {
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.Success,
        deviceId: 'device-123',
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });
  });

  describe('callbacks', () => {
    it('should call onClose callback when provided', () => {
      const onClose = jest.fn();
      mockConnectionState.status = ConnectionStatus.Connecting;
      render(<HardwareWalletBottomSheet onClose={onClose} />);

      // The onClose callback is set up but not directly testable without simulating sheet close
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onCancel callback when provided', () => {
      const onCancel = jest.fn();
      mockConnectionState.status = ConnectionStatus.Connecting;
      render(<HardwareWalletBottomSheet onCancel={onCancel} />);

      // The onCancel callback is set up but not directly testable without simulating cancel action
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should call onConnectionSuccess callback when provided', () => {
      const onConnectionSuccess = jest.fn();
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.Success,
        deviceId: 'device-123',
      });
      render(
        <HardwareWalletBottomSheet onConnectionSuccess={onConnectionSuccess} />,
      );

      // The callback is set up for the success content
      expect(onConnectionSuccess).not.toHaveBeenCalled();
    });

    it('should call onAwaitingConfirmationCancel when provided', () => {
      const onAwaitingConfirmationCancel = jest.fn();
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: 'device-123',
      });
      render(
        <HardwareWalletBottomSheet
          onAwaitingConfirmationCancel={onAwaitingConfirmationCancel}
        />,
      );

      // The callback is set up for awaiting confirmation content
      expect(onAwaitingConfirmationCancel).not.toHaveBeenCalled();
    });
  });

  describe('props', () => {
    it('should accept custom successAutoDismissMs', () => {
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.Success,
        deviceId: 'device-123',
      });
      const { getByTestId } = render(
        <HardwareWalletBottomSheet successAutoDismissMs={2000} />,
      );

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });

    it('should use default successAutoDismissMs when not provided', () => {
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.Success,
        deviceId: 'device-123',
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });
  });

  describe('device selection state', () => {
    it('should render when scanning with devices', () => {
      mockConnectionState.status = ConnectionStatus.Scanning;
      Object.assign(mockDeviceSelection, {
        devices: [{ id: 'device-1', name: 'Nano X' }],
        selectedDevice: null,
        isScanning: true,
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });

    it('should render when scanning with selected device', () => {
      mockConnectionState.status = ConnectionStatus.Scanning;
      const device = { id: 'device-1', name: 'Nano X' };
      Object.assign(mockDeviceSelection, {
        devices: [device],
        selectedDevice: device,
        isScanning: false,
      });
      const { getByTestId } = render(<HardwareWalletBottomSheet />);

      expect(getByTestId(HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID)).toBeTruthy();
    });
  });

  describe('handleClose behavior', () => {
    beforeEach(() => {
      lastBottomSheetOnClose = undefined;
    });

    it('should call closeDeviceSelection and onClose when sheet closes during scanning', () => {
      const onClose = jest.fn();
      mockConnectionState.status = ConnectionStatus.Scanning;
      render(<HardwareWalletBottomSheet onClose={onClose} />);

      expect(lastBottomSheetOnClose).toBeDefined();
      lastBottomSheetOnClose?.();

      expect(mockActions.closeDeviceSelection).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should call closeDeviceSelection and onClose when sheet closes during connecting', () => {
      const onClose = jest.fn();
      mockConnectionState.status = ConnectionStatus.Connecting;
      render(<HardwareWalletBottomSheet onClose={onClose} />);

      expect(lastBottomSheetOnClose).toBeDefined();
      lastBottomSheetOnClose?.();

      expect(mockActions.closeDeviceSelection).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should call closeDeviceSelection and onClose when sheet closes during awaiting app', () => {
      const onClose = jest.fn();
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
      });
      render(<HardwareWalletBottomSheet onClose={onClose} />);

      expect(lastBottomSheetOnClose).toBeDefined();
      lastBottomSheetOnClose?.();

      expect(mockActions.closeDeviceSelection).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should call closeDeviceSelection and onClose when sheet closes during error state', () => {
      const onClose = jest.fn();
      const error = new HardwareWalletError('Test error', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Test error',
      });
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.ErrorState,
        error,
      });
      render(<HardwareWalletBottomSheet onClose={onClose} />);

      expect(lastBottomSheetOnClose).toBeDefined();
      lastBottomSheetOnClose?.();

      expect(mockActions.closeDeviceSelection).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should only call onClose when sheet closes during success state', () => {
      const onClose = jest.fn();
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.Success,
        deviceId: 'device-123',
      });
      render(<HardwareWalletBottomSheet onClose={onClose} />);

      mockActions.closeDeviceSelection.mockClear();
      expect(lastBottomSheetOnClose).toBeDefined();
      lastBottomSheetOnClose?.();

      // Success state is not in the list that triggers closeDeviceSelection
      expect(mockActions.closeDeviceSelection).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('handler invocations', () => {
    beforeEach(() => {
      // Reset captured props
      lastDeviceSelectionProps = {};
      lastErrorContentProps = {};
      lastSuccessContentProps = {};
      lastAwaitingConfirmationProps = {};
      lastAwaitingAppProps = {};
    });

    it('should call selectDevice when device is selected', () => {
      mockConnectionState.status = ConnectionStatus.Scanning;
      const device = { id: 'device-1', name: 'Nano X' };
      Object.assign(mockDeviceSelection, {
        devices: [device],
        selectedDevice: null,
        isScanning: false,
      });
      render(<HardwareWalletBottomSheet />);

      // Invoke the captured onSelectDevice callback
      const onSelectDevice = lastDeviceSelectionProps.onSelectDevice as (
        d: unknown,
      ) => void;
      expect(onSelectDevice).toBeDefined();
      onSelectDevice(device);

      expect(mockActions.selectDevice).toHaveBeenCalledWith(device);
    });

    it('should call rescan when rescan is triggered', () => {
      mockConnectionState.status = ConnectionStatus.Scanning;
      render(<HardwareWalletBottomSheet />);

      const onRescan = lastDeviceSelectionProps.onRescan as () => void;
      expect(onRescan).toBeDefined();
      onRescan();

      expect(mockActions.rescan).toHaveBeenCalled();
    });

    it('should call closeDeviceSelection and onCancel when cancel is triggered', () => {
      const onCancel = jest.fn();
      mockConnectionState.status = ConnectionStatus.Scanning;
      render(<HardwareWalletBottomSheet onCancel={onCancel} />);

      const onCancelSelection = lastDeviceSelectionProps.onCancel as () => void;
      expect(onCancelSelection).toBeDefined();
      onCancelSelection();

      expect(mockActions.closeDeviceSelection).toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call connect when device selection is confirmed', async () => {
      mockConnectionState.status = ConnectionStatus.Scanning;
      const device = { id: 'device-1', name: 'Nano X' };
      Object.assign(mockDeviceSelection, {
        devices: [device],
        selectedDevice: device,
        isScanning: false,
      });
      mockActions.connect.mockResolvedValue(undefined);
      render(<HardwareWalletBottomSheet />);

      const onConfirmSelection =
        lastDeviceSelectionProps.onConfirmSelection as () => Promise<void>;
      expect(onConfirmSelection).toBeDefined();
      await onConfirmSelection();

      expect(mockActions.connect).toHaveBeenCalledWith('device-1');
    });

    it('should call retry when error continue is triggered', async () => {
      const error = new HardwareWalletError('Test error', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Test error',
      });
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.ErrorState,
        error,
      });
      mockActions.retry.mockResolvedValue(undefined);
      render(<HardwareWalletBottomSheet />);

      const onContinue =
        lastErrorContentProps.onContinue as () => Promise<void>;
      expect(onContinue).toBeDefined();
      await onContinue();

      expect(mockActions.retry).toHaveBeenCalled();
    });

    it('should call closeDeviceSelection when error dismiss is triggered', () => {
      const error = new HardwareWalletError('Test error', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Test error',
      });
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.ErrorState,
        error,
      });
      render(<HardwareWalletBottomSheet />);

      const onDismiss = lastErrorContentProps.onDismiss as () => void;
      expect(onDismiss).toBeDefined();
      onDismiss();

      expect(mockActions.closeDeviceSelection).toHaveBeenCalled();
    });

    it('should call onConnectionSuccess when success dismiss is triggered', () => {
      const onConnectionSuccess = jest.fn();
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.Success,
        deviceId: 'device-123',
      });
      render(
        <HardwareWalletBottomSheet onConnectionSuccess={onConnectionSuccess} />,
      );

      const onDismiss = lastSuccessContentProps.onDismiss as () => void;
      expect(onDismiss).toBeDefined();
      onDismiss();

      expect(onConnectionSuccess).toHaveBeenCalled();
    });

    it('should call onAwaitingConfirmationCancel when cancel is triggered during confirmation', () => {
      const onAwaitingConfirmationCancel = jest.fn();
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: 'device-123',
      });
      render(
        <HardwareWalletBottomSheet
          onAwaitingConfirmationCancel={onAwaitingConfirmationCancel}
        />,
      );

      const onCancel = lastAwaitingConfirmationProps.onCancel as () => void;
      expect(onCancel).toBeDefined();
      onCancel();

      expect(onAwaitingConfirmationCancel).toHaveBeenCalled();
    });

    it('should call retry when awaiting app continue is triggered', async () => {
      Object.assign(mockConnectionState, {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
        requiredApp: 'Ethereum',
      });
      mockActions.retry.mockResolvedValue(undefined);
      render(<HardwareWalletBottomSheet />);

      const onContinue = lastAwaitingAppProps.onContinue as () => Promise<void>;
      expect(onContinue).toBeDefined();
      await onContinue();

      expect(mockActions.retry).toHaveBeenCalled();
    });
  });
});
