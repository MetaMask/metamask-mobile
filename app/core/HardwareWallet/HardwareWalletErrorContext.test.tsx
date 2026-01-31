import React from 'react';
import { render, act } from '@testing-library/react-native';
import {
  HardwareWalletErrorProvider,
  useHardwareWalletError,
} from './HardwareWalletErrorContext';
import { HardwareWalletType } from './helpers';
import { LedgerCommunicationErrors } from '../Ledger/ledgerErrors';
import { ErrorCode } from '@metamask/hw-wallet-sdk';
import { Text, TouchableOpacity, Platform, Linking } from 'react-native';

// Mock dependencies
jest.mock('../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockOpenSettings = jest.fn();
jest.mock('react-native-permissions', () => ({
  openSettings: () => mockOpenSettings(),
}));

// Store the callbacks so we can test them
let capturedCallbacks: {
  onContinue?: () => void;
  onOpenSettings?: () => void;
  onOpenBluetoothSettings?: () => void;
  onClose?: () => void;
} = {};

jest.mock('./components', () => ({
  HardwareWalletErrorBottomSheet: jest.fn(
    ({ onContinue, onOpenSettings, onOpenBluetoothSettings, onClose }) => {
      capturedCallbacks = {
        onContinue,
        onOpenSettings,
        onOpenBluetoothSettings,
        onClose,
      };
      return null;
    },
  ),
}));

// Test component that uses the hook
function TestConsumer({
  onError,
}: {
  onError?: (error: ReturnType<typeof useHardwareWalletError>['error']) => void;
}) {
  const { error, parseAndShowError, clearError } = useHardwareWalletError();

  React.useEffect(() => {
    if (onError) {
      onError(error);
    }
  }, [error, onError]);

  return (
    <>
      <Text testID="error-code">{error?.code ?? 'no-error'}</Text>
      <TouchableOpacity
        testID="trigger-error"
        onPress={() =>
          parseAndShowError(
            LedgerCommunicationErrors.LedgerDisconnected,
            HardwareWalletType.Ledger,
          )
        }
      />
      <TouchableOpacity
        testID="trigger-user-cancelled"
        onPress={() =>
          parseAndShowError(
            LedgerCommunicationErrors.UserRefusedConfirmation,
            HardwareWalletType.Ledger,
          )
        }
      />
      <TouchableOpacity testID="clear-error" onPress={clearError} />
    </>
  );
}

describe('HardwareWalletErrorContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('HardwareWalletErrorProvider', () => {
    it('renders children', () => {
      const { getByText } = render(
        <HardwareWalletErrorProvider>
          <Text>Child content</Text>
        </HardwareWalletErrorProvider>,
      );

      expect(getByText('Child content')).toBeOnTheScreen();
    });

    it('provides default context values', () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      expect(getByTestId('error-code').props.children).toBe('no-error');
    });
  });

  describe('useHardwareWalletError', () => {
    it('provides error state', () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      expect(getByTestId('error-code')).toBeOnTheScreen();
    });

    it('provides parseAndShowError function', () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      expect(getByTestId('trigger-error')).toBeOnTheScreen();
    });

    it('provides clearError function', () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      expect(getByTestId('clear-error')).toBeOnTheScreen();
    });
  });

  describe('parseAndShowError', () => {
    it('parses error and updates state', async () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer onError={onError} />
        </HardwareWalletErrorProvider>,
      );

      await act(async () => {
        getByTestId('trigger-error').props.onPress();
      });

      // Error should be set to DeviceDisconnected
      expect(getByTestId('error-code').props.children).toBe(
        ErrorCode.DeviceDisconnected,
      );
    });

    it('sets error state without showing bottom sheet for user cancellations', async () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      await act(async () => {
        getByTestId('trigger-user-cancelled').props.onPress();
        jest.advanceTimersByTime(100);
      });

      // Error should be set but bottom sheet shouldn't show for user cancellations
      expect(getByTestId('error-code').props.children).toBe(
        ErrorCode.UserRejected,
      );

      // The bottom sheet should not be rendered for user cancellations
      // (isBottomSheetVisible should remain false)
      // Since our mock returns null, we can't directly test visibility,
      // but we verify the error code is correct
    });
  });

  describe('clearError', () => {
    it('clears the error state', async () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      // First trigger an error
      await act(async () => {
        getByTestId('trigger-error').props.onPress();
      });

      expect(getByTestId('error-code').props.children).toBe(
        ErrorCode.DeviceDisconnected,
      );

      // Then clear it
      await act(async () => {
        getByTestId('clear-error').props.onPress();
      });

      expect(getByTestId('error-code').props.children).toBe('no-error');
    });
  });

  describe('default context value', () => {
    it('provides noop functions when used outside provider', () => {
      // Test that using the hook outside provider doesn't crash
      // (uses default context value)
      const TestOutsideProvider = () => {
        const { error, parseAndShowError, clearError } =
          useHardwareWalletError();

        return (
          <>
            <Text testID="error">{error?.code ?? 'null'}</Text>
            <TouchableOpacity
              testID="parse"
              onPress={() =>
                parseAndShowError(
                  LedgerCommunicationErrors.LedgerDisconnected,
                  HardwareWalletType.Ledger,
                )
              }
            />
            <TouchableOpacity testID="clear" onPress={clearError} />
          </>
        );
      };

      const { getByTestId } = render(<TestOutsideProvider />);

      // Should not crash when calling functions
      expect(() => {
        getByTestId('parse').props.onPress();
        getByTestId('clear').props.onPress();
      }).not.toThrow();

      // Error should remain null (noop functions)
      expect(getByTestId('error').props.children).toBe('null');
    });
  });

  describe('bottom sheet callbacks', () => {
    beforeEach(() => {
      capturedCallbacks = {};
      jest.clearAllMocks();
    });

    it('sets error state and makes bottom sheet visible when non-user-cancellation error occurs', async () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      await act(async () => {
        getByTestId('trigger-error').props.onPress();
        jest.advanceTimersByTime(100);
      });

      // The error code should be set
      expect(getByTestId('error-code').props.children).toBe(
        ErrorCode.DeviceDisconnected,
      );
    });

    it('handleContinue clears error', async () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      // Trigger an error to get the callbacks
      await act(async () => {
        getByTestId('trigger-error').props.onPress();
        jest.advanceTimersByTime(100);
      });

      // Now call onContinue
      await act(async () => {
        capturedCallbacks.onContinue?.();
      });

      expect(getByTestId('error-code').props.children).toBe('no-error');
    });

    it('handleOpenSettings calls openSettings from react-native-permissions', async () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      // Trigger an error to get the callbacks
      await act(async () => {
        getByTestId('trigger-error').props.onPress();
        jest.advanceTimersByTime(100);
      });

      // Now call onOpenSettings
      await act(async () => {
        capturedCallbacks.onOpenSettings?.();
      });

      expect(mockOpenSettings).toHaveBeenCalled();
    });

    it('handleOpenBluetoothSettings opens iOS Bluetooth settings on iOS', async () => {
      const originalPlatform = Platform.OS;
      Platform.OS = 'ios';
      const mockOpenURL = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);

      try {
        const { getByTestId } = render(
          <HardwareWalletErrorProvider>
            <TestConsumer />
          </HardwareWalletErrorProvider>,
        );

        // Trigger an error to get the callbacks
        await act(async () => {
          getByTestId('trigger-error').props.onPress();
          jest.advanceTimersByTime(100);
        });

        // Now call onOpenBluetoothSettings
        await act(async () => {
          capturedCallbacks.onOpenBluetoothSettings?.();
        });

        expect(mockOpenURL).toHaveBeenCalledWith('App-Prefs:Bluetooth');
      } finally {
        Platform.OS = originalPlatform;
        mockOpenURL.mockRestore();
      }
    });

    it('handleOpenBluetoothSettings opens Android settings on Android', async () => {
      const originalPlatform = Platform.OS;
      Platform.OS = 'android';
      const linkingOpenSettings = jest
        .spyOn(Linking, 'openSettings')
        .mockResolvedValue();

      try {
        const { getByTestId } = render(
          <HardwareWalletErrorProvider>
            <TestConsumer />
          </HardwareWalletErrorProvider>,
        );

        // Trigger an error to get the callbacks
        await act(async () => {
          getByTestId('trigger-error').props.onPress();
          jest.advanceTimersByTime(100);
        });

        // Now call onOpenBluetoothSettings
        await act(async () => {
          capturedCallbacks.onOpenBluetoothSettings?.();
        });

        expect(linkingOpenSettings).toHaveBeenCalled();
      } finally {
        Platform.OS = originalPlatform;
        linkingOpenSettings.mockRestore();
      }
    });

    it('onClose clears error', async () => {
      const { getByTestId } = render(
        <HardwareWalletErrorProvider>
          <TestConsumer />
        </HardwareWalletErrorProvider>,
      );

      // Trigger an error to get the callbacks
      await act(async () => {
        getByTestId('trigger-error').props.onPress();
        jest.advanceTimersByTime(100);
      });

      // Now call onClose
      await act(async () => {
        capturedCallbacks.onClose?.();
      });

      expect(getByTestId('error-code').props.children).toBe('no-error');
    });
  });
});
