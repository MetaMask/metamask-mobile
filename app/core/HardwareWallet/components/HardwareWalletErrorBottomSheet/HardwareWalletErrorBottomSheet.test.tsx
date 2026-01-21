import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  ErrorCode,
  HardwareWalletError,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';
import { HardwareWalletErrorBottomSheet } from './HardwareWalletErrorBottomSheet';
import { HardwareWalletType } from '../../helpers';
import { RecoveryAction } from '../../errors';

// Mock dependencies - must be before imports
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'hardware_wallet.error.something_went_wrong': 'Something went wrong',
      'hardware_wallet.error.continue': 'Continue',
      'hardware_wallet.error.view_settings': 'View Settings',
      'hardware_wallet.error.device_disconnected_title': 'Device Disconnected',
      'hardware_wallet.error.device_locked_title': 'Device Locked',
    };
    return translations[key] ?? key;
  }),
}));

jest.mock('../../../../component-library/components/Icons/Icon', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, testID }: { name: string; testID?: string }) => (
      <View testID={testID ?? `icon-${name}`} />
    ),
    IconSize: { Xl: 'Xl' },
    IconName: {
      Lock: 'Lock',
      Setting: 'Setting',
      Plug: 'Plug',
      Search: 'Search',
      Clock: 'Clock',
      Eye: 'Eye',
      Close: 'Close',
      Connect: 'Connect',
      Location: 'Location',
      SecurityTick: 'SecurityTick',
      Danger: 'Danger',
    },
    IconColor: {
      Error: 'Error',
      Warning: 'Warning',
      Info: 'Info',
    },
  };
});

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#FFFFFF' },
    },
  }),
}));

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const MockReact = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { View } = require('react-native');
    return {
      __esModule: true,
      default: MockReact.forwardRef(
        (
          {
            children,
            onClose,
          }: { children: React.ReactNode; onClose?: () => void },
          _ref: React.Ref<unknown>,
        ) => (
          <View testID="bottom-sheet" onTouchEnd={onClose}>
            {children}
          </View>
        ),
      ),
    };
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { View, TouchableOpacity, Text } = require('react-native');
    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray: { label: string; onPress: () => void }[];
      }) => (
        <View testID="bottom-sheet-footer">
          {buttonPropsArray.map(
            (button: { label: string; onPress: () => void }, index: number) => (
              <TouchableOpacity
                key={index}
                testID={`action-button-${index}`}
                onPress={button.onPress}
              >
                <Text>{button.label}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      ),
      ButtonsAlignment: { Vertical: 'vertical' },
    };
  },
);

jest.mock('../../../../component-library/components/Texts/Text', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <Text testID={testID}>{children}</Text>,
    TextVariant: { HeadingMD: 'HeadingMD', BodyMD: 'BodyMD' },
    TextColor: { Default: 'Default' },
  };
});

describe('HardwareWalletErrorBottomSheet', () => {
  const mockSheetRef = {
    current: {
      onCloseBottomSheet: jest.fn(),
      onOpenBottomSheet: jest.fn(),
    },
  };

  const createError = (
    code: ErrorCode,
    userMessage: string,
    recoveryAction?: RecoveryAction,
  ): HardwareWalletError =>
    new HardwareWalletError('Test error', {
      code,
      severity: Severity.Err,
      category: Category.Connection,
      userMessage,
      metadata: recoveryAction ? { recoveryAction } : undefined,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('returns null when error is null', () => {
      const { queryByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={null}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      expect(queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders bottom sheet when error is provided', () => {
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      expect(getByTestId('bottom-sheet')).toBeDefined();
    });

    it('displays error title', () => {
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
      );

      const { getByText } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      // The title comes from getTitleForErrorCode which calls strings()
      // Since we mock strings() to return 'Device Disconnected' for device_disconnected_title
      expect(getByText('Device Disconnected')).toBeDefined();
    });

    it('displays error subtitle (userMessage)', () => {
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Please reconnect your device',
      );

      const { getByText } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      expect(getByText('Please reconnect your device')).toBeDefined();
    });

    it('does not display subtitle when userMessage is null', () => {
      const error = new HardwareWalletError('Test error', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: undefined as unknown as string,
      });

      const { queryByText } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      // Subtitle container should not be rendered
      expect(queryByText('undefined')).toBeNull();
    });

    it('renders icon for the error', () => {
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      // Icon should be rendered (name depends on error code mapping)
      expect(getByTestId('icon-Plug')).toBeDefined();
    });
  });

  describe('action buttons', () => {
    it('shows Continue button for ACKNOWLEDGE action', () => {
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
        RecoveryAction.ACKNOWLEDGE,
      );

      const { getByText } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      expect(getByText('Continue')).toBeDefined();
    });

    it('shows View Settings button for OPEN_APP_SETTINGS action', () => {
      const error = createError(
        ErrorCode.PermissionBluetoothDenied,
        'Permission denied',
        RecoveryAction.OPEN_APP_SETTINGS,
      );

      const { getByText } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      expect(getByText('View Settings')).toBeDefined();
    });

    it('shows View Settings button for OPEN_BLUETOOTH_SETTINGS action', () => {
      const error = createError(
        ErrorCode.BluetoothDisabled,
        'Bluetooth disabled',
        RecoveryAction.OPEN_BLUETOOTH_SETTINGS,
      );

      const { getByText } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      expect(getByText('View Settings')).toBeDefined();
    });
  });

  describe('callbacks', () => {
    it('calls onContinue when Continue button is pressed', () => {
      const onContinue = jest.fn();
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
        RecoveryAction.ACKNOWLEDGE,
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
          onContinue={onContinue}
        />,
      );

      fireEvent.press(getByTestId('action-button-0'));

      expect(mockSheetRef.current.onCloseBottomSheet).toHaveBeenCalled();
      expect(onContinue).toHaveBeenCalled();
    });

    it('calls onOpenSettings when View Settings button is pressed for app settings', () => {
      const onOpenSettings = jest.fn();
      const error = createError(
        ErrorCode.PermissionBluetoothDenied,
        'Permission denied',
        RecoveryAction.OPEN_APP_SETTINGS,
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
          onOpenSettings={onOpenSettings}
        />,
      );

      fireEvent.press(getByTestId('action-button-0'));

      expect(mockSheetRef.current.onCloseBottomSheet).toHaveBeenCalled();
      expect(onOpenSettings).toHaveBeenCalled();
    });

    it('calls onOpenBluetoothSettings when View Settings button is pressed for bluetooth', () => {
      const onOpenBluetoothSettings = jest.fn();
      const error = createError(
        ErrorCode.BluetoothDisabled,
        'Bluetooth disabled',
        RecoveryAction.OPEN_BLUETOOTH_SETTINGS,
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
          onOpenBluetoothSettings={onOpenBluetoothSettings}
        />,
      );

      fireEvent.press(getByTestId('action-button-0'));

      expect(mockSheetRef.current.onCloseBottomSheet).toHaveBeenCalled();
      expect(onOpenBluetoothSettings).toHaveBeenCalled();
    });

    it('calls onClose when bottom sheet is closed', () => {
      const onClose = jest.fn();
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
          onClose={onClose}
        />,
      );

      fireEvent(getByTestId('bottom-sheet'), 'touchEnd');

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('default recovery action', () => {
    it('defaults to ACKNOWLEDGE when no recovery action in metadata', () => {
      const error = new HardwareWalletError('Test error', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Test',
        // No metadata with recoveryAction
      });

      const { getByText } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      // Should show Continue button (default for ACKNOWLEDGE)
      expect(getByText('Continue')).toBeDefined();
    });
  });

  describe('device type', () => {
    it('works with Ledger device type', () => {
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.Ledger}
        />,
      );

      expect(getByTestId('bottom-sheet')).toBeDefined();
    });

    it('works with QR device type', () => {
      const error = createError(
        ErrorCode.DeviceDisconnected,
        'Device disconnected',
      );

      const { getByTestId } = render(
        <HardwareWalletErrorBottomSheet
          sheetRef={mockSheetRef}
          error={error}
          deviceType={HardwareWalletType.QR}
        />,
      );

      expect(getByTestId('bottom-sheet')).toBeDefined();
    });
  });
});
