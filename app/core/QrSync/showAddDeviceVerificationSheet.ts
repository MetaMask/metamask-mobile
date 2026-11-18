import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';

/**
 * Opens the add-device OTP sheet. AppFlow registers the sheet on the same
 * stack as the scanner, so the sheet pushes over the scanner.
 */
export const showAddDeviceVerificationSheet = (
  navigation: AppNavigationProp,
): void => {
  navigation.navigate(Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE);
};
