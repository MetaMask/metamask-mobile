import SNSMobileSDK, {
  type SumSubLaunchResult,
  type SumSubTokenExpirationHandler,
} from '@sumsub/react-native-mobilesdk-module';
import Logger from '../../../../../util/Logger';

export type { SumSubLaunchResult };

export interface LaunchSumSubSdkParams {
  accessToken: string;
  onTokenExpired?: SumSubTokenExpirationHandler;
}

/**
 * Opens the native Sumsub Mobile SDK. The caller supplies an applicant
 * access token (minted by the KYC API). An empty token is valid input —
 * the SDK still presents, then asks `onTokenExpired` for a refresh.
 *
 * Stand-in for the KycController launcher (`reactNativeSumSubLauncher`)
 * until that controller is published and wired into Engine.
 *
 * @param params - Launch options.
 * @param params.accessToken - Applicant access token, or `''` to launch and refresh via `onTokenExpired`.
 * @param params.onTokenExpired - Optional token refresh. Defaults to returning the original `accessToken`.
 */
export const launchSumSubSdk = async ({
  accessToken,
  onTokenExpired,
}: LaunchSumSubSdkParams): Promise<SumSubLaunchResult> => {
  SNSMobileSDK.reset();

  const tokenExpirationHandler: SumSubTokenExpirationHandler =
    onTokenExpired ?? (async () => accessToken);

  const sdk = SNSMobileSDK.init(accessToken, tokenExpirationHandler)
    .withDebug(Boolean(__DEV__))
    .withHandlers({
      onStatusChanged: (event) => {
        Logger.log('[Sumsub] status changed', {
          prevStatus: event.prevStatus,
          newStatus: event.newStatus,
        });
      },
    })
    .build();

  return sdk.launch();
};
