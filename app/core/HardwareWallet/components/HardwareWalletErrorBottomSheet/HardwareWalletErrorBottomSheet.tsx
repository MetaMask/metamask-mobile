/**
 * Hardware Wallet Error BottomSheet.
 * Displays hardware wallet errors with user-friendly messages and recovery options.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button/Button.types';
import Icon, {
  IconSize,
} from '../../../../component-library/components/Icons/Icon';

import { useTheme } from '../../../../util/theme';

import { strings } from '../../../../../locales/i18n';

import {
  getIconForErrorCode,
  getIconColorForErrorCode,
  getTitleForErrorCode,
  RecoveryAction,
} from '../../errors';
import { HardwareWalletError } from '@metamask/hw-wallet-sdk';
import { HardwareWalletType } from '../../helpers';

const createStyles = (colors: { background: { default: string } }) =>
  StyleSheet.create({
    container: {
      padding: 24,
      paddingTop: 16,
      paddingBottom: 0,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      textAlign: 'center',
    },
    subtitleContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    subtitle: {
      textAlign: 'center',
    },
    bottomSheet: {
      backgroundColor: colors.background.default,
    },
  });

export interface HardwareWalletErrorBottomSheetProps {
  sheetRef: React.RefObject<BottomSheetRef>;
  error: HardwareWalletError | null;
  deviceType: HardwareWalletType;
  /**
   * Callback when user acknowledges the error (taps "Continue" button)
   */
  onContinue?: () => void;
  /**
   * Callback to open app settings (for permission errors)
   * Uses react-native-permissions openSettings() by default
   */
  onOpenSettings?: () => void;
  /**
   * Callback to open Bluetooth settings specifically
   * On iOS this should open App-Prefs:Bluetooth, on Android Linking.openSettings()
   */
  onOpenBluetoothSettings?: () => void;
  /**
   * Callback when the bottom sheet closes (swipe down, etc.)
   */
  onClose?: () => void;
}

/**
 * Hardware Wallet Error BottomSheet Component
 */
export function HardwareWalletErrorBottomSheet({
  sheetRef,
  error,
  deviceType,
  onContinue,
  onOpenSettings,
  onOpenBluetoothSettings,
  onClose,
}: HardwareWalletErrorBottomSheetProps): JSX.Element | null {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const recoveryAction = useMemo(() => {
    if (!error) return RecoveryAction.ACKNOWLEDGE;
    return (
      (error.metadata?.recoveryAction as RecoveryAction) ??
      RecoveryAction.ACKNOWLEDGE
    );
  }, [error]);

  const errorTitle = useMemo(() => {
    if (!error) return strings('hardware_wallet.error.something_went_wrong');
    return getTitleForErrorCode(error.code, deviceType);
  }, [error, deviceType]);

  const errorSubtitle = useMemo(() => {
    return error?.userMessage ?? null;
  }, [error]);

  const handleContinue = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    onContinue?.();
  }, [sheetRef, onContinue]);

  const handleOpenSettings = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    onOpenSettings?.();
  }, [sheetRef, onOpenSettings]);

  const handleOpenBluetoothSettings = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    onOpenBluetoothSettings?.();
  }, [sheetRef, onOpenBluetoothSettings]);

  const buttonPropsArray = useMemo((): ButtonProps[] => {
    const buttons: ButtonProps[] = [];

    switch (recoveryAction) {
      case RecoveryAction.OPEN_APP_SETTINGS:
        buttons.push({
          variant: ButtonVariants.Primary,
          size: ButtonSize.Lg,
          onPress: handleOpenSettings,
          label: strings('hardware_wallet.error.view_settings'),
        });
        break;

      case RecoveryAction.OPEN_BLUETOOTH_SETTINGS:
        buttons.push({
          variant: ButtonVariants.Primary,
          size: ButtonSize.Lg,
          onPress: handleOpenBluetoothSettings,
          label: strings('hardware_wallet.error.view_settings'),
        });
        break;

      case RecoveryAction.ACKNOWLEDGE:
      default:
        buttons.push({
          variant: ButtonVariants.Primary,
          size: ButtonSize.Lg,
          onPress: handleContinue,
          label: strings('hardware_wallet.error.continue'),
        });
        break;
    }

    return buttons;
  }, [
    recoveryAction,
    handleContinue,
    handleOpenSettings,
    handleOpenBluetoothSettings,
  ]);

  // Don't render if no error
  if (!error) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen={false}
      onClose={onClose}
      shouldNavigateBack={false}
      style={styles.bottomSheet}
    >
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Icon
            name={getIconForErrorCode(error.code)}
            size={IconSize.Xl}
            color={getIconColorForErrorCode(error.code)}
          />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            style={styles.title}
          >
            {errorTitle}
          </Text>
        </View>

        {/* Subtitle */}
        {errorSubtitle && (
          <View style={styles.subtitleContainer}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              style={styles.subtitle}
            >
              {errorSubtitle}
            </Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        buttonPropsArray={buttonPropsArray}
      />
    </BottomSheet>
  );
}
