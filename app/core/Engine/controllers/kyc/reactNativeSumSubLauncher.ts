import { NativeModules } from 'react-native';
import type {
  KycSumSubLauncher,
  KycSumSubLaunchParams,
} from '@metamask/kyc-controller';

/**
 * React Native implementation of the platform-agnostic {@link KycSumSubLauncher}
 * consumed by the `KycController`.
 *
 * The controller owns all orchestration (UKYC session creation, wrapped-key
 * exchange, token refresh, and state); this adapter only presents the native
 * SumSub SDK and forwards status / token-expiration callbacks back to the
 * controller. Keeping the SDK import on the mobile side lets the controller stay
 * platform-agnostic and shippable to the extension / web.
 *
 * The native SDK is required lazily inside `launch` so that merely wiring the
 * controller into the Engine never loads the native module (which is absent in
 * Jest and Expo Go).
 */
export const reactNativeSumSubLauncher: KycSumSubLauncher = {
  isAvailable: () => Boolean(NativeModules.SNSMobileSDKModule),

  async launch({
    applicantAccessToken,
    onTokenExpiration,
    onStatusChange,
    locale = 'en',
    debug = false,
  }: KycSumSubLaunchParams): Promise<Record<string, unknown>> {
    // Lazily load the native SDK so that merely wiring the controller into the
    // Engine never loads the native module (which is absent in Jest and Expo Go).
    const SNSMobileSDK = (await import('@sumsub/react-native-mobilesdk-module'))
      .default;
    const sdk = SNSMobileSDK.init(applicantAccessToken, () =>
      onTokenExpiration(),
    )
      .withHandlers({
        onStatusChanged: (event: { prevStatus: string; newStatus: string }) => {
          onStatusChange?.(event.prevStatus, event.newStatus);
        },
      })
      .withDebug(debug)
      .withLocale(locale)
      .build();

    return (await sdk.launch()) as Record<string, unknown>;
  },
};
