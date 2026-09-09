import { NativeModules } from 'react-native';
import Logger from '../../../../../util/Logger';

export const SUMSUB_NATIVE_MODULE_NAME = 'SNSMobileSDKModule';

export const SUMSUB_NATIVE_MODULE_MISSING_ERROR = `${SUMSUB_NATIVE_MODULE_NAME} is not linked. Rebuild the native app (yarn start:ios or yarn start:android) after adding @sumsub/react-native-mobilesdk-module. A Metro reload or Expo JS-only session is not enough.`;

const assertSumSubNativeModuleLinked = (): void => {
  if (NativeModules[SUMSUB_NATIVE_MODULE_NAME]) {
    return;
  }

  throw new Error(SUMSUB_NATIVE_MODULE_MISSING_ERROR);
};

/**
 * Presents the native Sumsub SDK. The SDK is required lazily so that merely
 * importing this helper never loads the native module (which is absent in
 * Jest and Expo Go). The Sumsub package is CommonJS (`module.exports`), so the
 * API may live on the namespace itself or under `.default`.
 */
export const launchSumSubSdk = async ({
  accessToken,
  onTokenExpired,
  locale = 'en',
  debug = Boolean(__DEV__),
}: {
  accessToken: string;
  onTokenExpired?: () => Promise<string>;
  locale?: string;
  debug?: boolean;
}): Promise<Record<string, unknown>> => {
  assertSumSubNativeModuleLinked();

  const startedAt = Date.now();
  Logger.log('[Sumsub] launch start', {
    locale,
    debug,
    hasApplicantAccessToken: Boolean(accessToken),
  });

  try {
    const SumSubModule = await import('@sumsub/react-native-mobilesdk-module');
    const SNSMobileSDK = SumSubModule.default ?? SumSubModule;
    const sdk = SNSMobileSDK.init(accessToken, () => {
      Logger.log('[Sumsub] token expired', {
        elapsedMs: Date.now() - startedAt,
      });
      return onTokenExpired ? onTokenExpired() : Promise.resolve(accessToken);
    })
      .withHandlers({
        onStatusChanged: (event: { prevStatus: string; newStatus: string }) => {
          Logger.log('[Sumsub] status changed', {
            previousStatus: event.prevStatus,
            nextStatus: event.newStatus,
            elapsedMs: Date.now() - startedAt,
          });
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
};
