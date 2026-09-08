import { NativeModules } from 'react-native';
import type { KycSumSubLauncher } from '@metamask/kyc-controller';
import {
  launchSumSubSdk,
  SUMSUB_NATIVE_MODULE_NAME,
} from '../../../../components/UI/Ramp/Views/VirtualBankAccount/launchSumSubSdk';

/**
 * Mobile adapter that lets KycController present the native Sumsub SDK.
 */
export const reactNativeSumSubLauncher: KycSumSubLauncher = {
  isAvailable: () => Boolean(NativeModules[SUMSUB_NATIVE_MODULE_NAME]),
  launch: ({
    applicantAccessToken,
    onTokenExpiration,
    onStatusChange,
    locale,
    debug,
  }) =>
    launchSumSubSdk({
      accessToken: applicantAccessToken,
      onTokenExpired: onTokenExpiration,
      onStatusChange,
      locale,
      debug,
    }),
};
