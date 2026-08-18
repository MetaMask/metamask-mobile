import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';

/**
 * Opens the add-device OTP sheet on the current stack so it appears over the
 * scanner flow instead of the wallet home tab (ROOT_MODAL_FLOW is AppFlow-root).
 */
export const showAddDeviceVerificationSheet = (
  navigation: AppNavigationProp,
): void => {
  navigation.navigate(Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE);
};
