/**
 * Hardware Wallet Error Context
 *
 * A simple context for centralized hardware wallet error handling.
 *
 * This context provides:
 * - Error state management
 * - Error bottom sheet display
 * - Error clearing actions
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  ReactNode,
  useState,
} from 'react';
import { Linking, Platform } from 'react-native';
import { openSettings } from 'react-native-permissions';
import { HardwareWalletError } from '@metamask/hw-wallet-sdk';

import { parseErrorByType, isUserCancellation } from './errors';
import { HardwareWalletErrorBottomSheet } from './components';
import type { BottomSheetRef } from '../../component-library/components/BottomSheets/BottomSheet';
import { HardwareWalletType } from './helpers';

export interface HardwareWalletErrorContextType {
  error: HardwareWalletError | null;
  parseAndShowError: (error: unknown, deviceType: HardwareWalletType) => void;
  clearError: () => void;
}

const defaultContextValue: HardwareWalletErrorContextType = {
  error: null,
  parseAndShowError: () => {},
  clearError: () => {},
};

const HardwareWalletErrorContext =
  createContext<HardwareWalletErrorContextType>(defaultContextValue);

export interface HardwareWalletErrorProviderProps {
  children: ReactNode;
}

export function HardwareWalletErrorProvider({
  children,
}: HardwareWalletErrorProviderProps): JSX.Element {
  const [error, setError] = useState<HardwareWalletError | null>(null);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [currentDeviceType, setCurrentDeviceType] =
    useState<HardwareWalletType>(HardwareWalletType.Ledger);
  const errorBottomSheetRef = useRef<BottomSheetRef>(null);

  const showError = useCallback((hwError: HardwareWalletError) => {
    setError(hwError);
    // Only show bottom sheet if not a user cancellation
    if (!isUserCancellation(hwError)) {
      setIsBottomSheetVisible(true);
      // Delay opening to ensure the BottomSheet component has mounted.
      // React Native's layout pass needs a frame to complete before the
      // ref becomes available and the sheet can animate open.
      setTimeout(() => {
        errorBottomSheetRef.current?.onOpenBottomSheet();
      }, 100);
    }
  }, []);

  const parseAndShowError = useCallback(
    (e: unknown, deviceType: HardwareWalletType) => {
      setCurrentDeviceType(deviceType);
      const hwError = parseErrorByType(e, deviceType);
      showError(hwError);
    },
    [showError],
  );

  const clearError = useCallback(() => {
    setError(null);
    setIsBottomSheetVisible(false);
    errorBottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleContinue = useCallback(() => {
    clearError();
  }, [clearError]);

  const handleOpenBluetoothSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:Bluetooth');
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    openSettings();
  }, []);

  return (
    <HardwareWalletErrorContext.Provider
      value={{
        error,
        parseAndShowError,
        clearError,
      }}
    >
      {children}
      {isBottomSheetVisible && (
        <HardwareWalletErrorBottomSheet
          sheetRef={errorBottomSheetRef}
          error={error}
          deviceType={currentDeviceType}
          onContinue={handleContinue}
          onOpenSettings={handleOpenSettings}
          onOpenBluetoothSettings={handleOpenBluetoothSettings}
          onClose={handleContinue}
        />
      )}
    </HardwareWalletErrorContext.Provider>
  );
}

export function useHardwareWalletError(): HardwareWalletErrorContextType {
  return useContext(HardwareWalletErrorContext);
}
