import { NativeModules } from 'react-native';
import type {
  KycSumSubLauncher,
  KycSumSubLaunchParams,
} from '@metamask/kyc-controller';
import {
  describeError,
  describeShape,
  vbaTrace,
} from '../../../../components/UI/Ramp/debug/vbaTrace';

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
  isAvailable: () => {
    const available = Boolean(NativeModules.SNSMobileSDKModule);
    vbaTrace('kyc.sumsub.availability', {
      available,
      reason: available
        ? 'native module present'
        : 'SNSMobileSDKModule missing',
    });
    return available;
  },

  async launch({
    applicantAccessToken,
    onTokenExpiration,
    onStatusChange,
    locale = 'en',
    debug = false,
  }: KycSumSubLaunchParams): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    vbaTrace('kyc.sumsub.launch.start', {
      locale,
      debug,
      hasApplicantAccessToken: Boolean(applicantAccessToken),
    });

    try {
      // Lazily load the native SDK so that merely wiring the controller into the
      // Engine never loads the native module (which is absent in Jest and Expo Go).
      // The SumSub package is a CommonJS module that assigns its API directly to
      // `module.exports` (no `default` export), so depending on interop the API
      // may live on the namespace itself or under `.default`.
      const SumSubModule = await import(
        '@sumsub/react-native-mobilesdk-module'
      );
      const SNSMobileSDK = SumSubModule.default ?? SumSubModule;
      const sdk = SNSMobileSDK.init(applicantAccessToken, () => {
        vbaTrace('kyc.sumsub.tokenExpired', {
          elapsedMs: Date.now() - startedAt,
        });
        return onTokenExpiration();
      })
        .withHandlers({
          onStatusChanged: (event: {
            prevStatus: string;
            newStatus: string;
          }) => {
            vbaTrace('kyc.sumsub.statusChanged', {
              previousStatus: event.prevStatus,
              nextStatus: event.newStatus,
              elapsedMs: Date.now() - startedAt,
            });
            onStatusChange?.(event.prevStatus, event.newStatus);
          },
        })
        .withDebug(debug)
        .withLocale(locale)
        .build();

      const result = (await sdk.launch()) as Record<string, unknown>;
      vbaTrace('kyc.sumsub.launch.success', {
        durationMs: Date.now() - startedAt,
        result: describeShape(result),
        status: result.status,
      });
      return result;
    } catch (error) {
      vbaTrace('kyc.sumsub.launch.failed', {
        durationMs: Date.now() - startedAt,
        error: describeError(error),
      });
      throw error;
    }
  },
};
