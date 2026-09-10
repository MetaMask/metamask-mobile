import { NativeModules } from 'react-native';
import type {
  KycSumSubLauncher,
  KycSumSubLaunchParams,
} from '@metamask/kyc-controller';
import Logger from '../../../../util/Logger';

export const SUMSUB_NATIVE_MODULE_NAME = 'SNSMobileSDKModule';

export const SUMSUB_NATIVE_MODULE_MISSING_ERROR = `${SUMSUB_NATIVE_MODULE_NAME} is not linked. Rebuild the native app (yarn start:ios or yarn start:android) after adding @sumsub/react-native-mobilesdk-module. A Metro reload or Expo JS-only session is not enough.`;

const assertSumSubNativeModuleLinked = (): void => {
  if (NativeModules[SUMSUB_NATIVE_MODULE_NAME]) {
    return;
  }

  throw new Error(SUMSUB_NATIVE_MODULE_MISSING_ERROR);
};

/**
 * Mobile implementation of the platform-agnostic {@link KycSumSubLauncher}
 * consumed by `KycController`.
 *
 * The controller owns orchestration (UKYC session, token refresh, state); this
 * adapter only presents the native SumSub SDK. The SDK is required lazily so
 * wiring the controller into Engine never loads the native module (absent in
 * Jest and Expo Go). The SumSub package is CommonJS (`module.exports`), so the
 * API may live on the namespace itself or under `.default`.
 */
export const sumSubLauncher: KycSumSubLauncher = {
  isAvailable: () => Boolean(NativeModules[SUMSUB_NATIVE_MODULE_NAME]),

  async launch({
    applicantAccessToken,
    onTokenExpiration,
    onStatusChange,
    locale = 'en',
    debug = Boolean(__DEV__),
  }: KycSumSubLaunchParams): Promise<Record<string, unknown>> {
    assertSumSubNativeModuleLinked();

    const startedAt = Date.now();
    Logger.log('[Sumsub] launch start', {
      locale,
      debug,
      hasApplicantAccessToken: Boolean(applicantAccessToken),
    });

    try {
      const SumSubModule = await import('@sumsub/react-native-mobilesdk-module');
      const SNSMobileSDK = SumSubModule.default ?? SumSubModule;
      const sdk = SNSMobileSDK.init(applicantAccessToken, () => {
        Logger.log('[Sumsub] token expired', {
          elapsedMs: Date.now() - startedAt,
        });
        return onTokenExpiration();
      })
        .withHandlers({
          onStatusChanged: (event: {
            prevStatus: string;
            newStatus: string;
          }) => {
            Logger.log('[Sumsub] status changed', {
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
      Logger.log('[Sumsub] launch success', {
        durationMs: Date.now() - startedAt,
        status: result.status,
      });
      return result;
    } catch (error) {
      Logger.log('[Sumsub] launch failed', {
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};
