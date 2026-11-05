import {
  parsePredictConfig,
  resolveSelectedAuthProfile,
  resolveVenueAuthProfile,
  type PredictConfig,
} from '../../../components/UI/PredictNext/config/predictConfig';
import {
  PredictDeviceAuthService,
  type PredictDeviceAuthServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import type { PredictDeviceAuthServiceInitMessenger } from '../messengers/predict-device-auth-service-messenger';
import type { MessengerClientInitFunction } from '../types';

const KALSHI_A2T_ISSUER_URL = {
  dev: 'https://authentication.dev-api.cx.metamask.io',
  uat: 'https://authentication.uat-api.cx.metamask.io',
} as const;

/**
 * A2T issuer base. `MM_PREDICT_A2T_URL` wins when set. Otherwise a
 * debug build falls back to the dev host, and other builds stay blank.
 */
export const resolvePredictDeviceAuthIssuerUrl = (
  rawApiEnv: string | undefined,
  override: string | undefined,
  isDevelopment: boolean,
): string | undefined => {
  if (typeof override === 'string' && override.trim().length > 0) {
    return override;
  }

  const apiEnv = (rawApiEnv ?? '').trim().toLowerCase();
  if (apiEnv === 'dev' || (apiEnv === '' && isDevelopment)) {
    return KALSHI_A2T_ISSUER_URL.dev;
  }
  if (apiEnv === 'uat') {
    return KALSHI_A2T_ISSUER_URL.uat;
  }
  return undefined;
};

const getConfiguredIssuerUrl = (): string | undefined =>
  resolvePredictDeviceAuthIssuerUrl(
    process.env.MM_API_ENV,
    process.env.MM_PREDICT_A2T_URL,
    __DEV__,
  );

export const predictDeviceAuthServiceInit: MessengerClientInitFunction<
  PredictDeviceAuthService,
  PredictDeviceAuthServiceMessenger,
  PredictDeviceAuthServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const readConfig = (): PredictConfig => {
    const state = initMessenger.call('RemoteFeatureFlagController:getState');
    return parsePredictConfig(state.remoteFeatureFlags?.predictConfig);
  };

  // Cached canonical profile id. Bearer-token reads refresh it from
  // getSessionProfile, and profileSignIn writes it when pairing changes the
  // id or returns new aliases. The installed profile-sync-controller emits
  // that event only from #doPair, so a normal single-SRP sign-in does not.
  // Sign-out and reset still clear this cache, and the session reuses a
  // cached A2T only while this id matches the one it was issued for. This
  // trusts those updates. The previous code read the id from
  // AuthenticationController state on each check.
  let canonicalProfileId: string | undefined;
  const rememberCanonicalProfileId = (profileId: string | undefined): void => {
    canonicalProfileId = profileId || undefined;
  };
  const refreshCanonicalProfileId = async (): Promise<void> => {
    const profile = await initMessenger.call(
      'AuthenticationController:getSessionProfile',
    );
    rememberCanonicalProfileId(profile.canonicalProfileId);
  };

  let isSignedIn = initMessenger.call(
    'AuthenticationController:getState',
  ).isSignedIn;
  const controller = new PredictDeviceAuthService(controllerMessenger, {
    getProfile: () => resolveSelectedAuthProfile(readConfig()),
    getIssuerUrl: getConfiguredIssuerUrl,
    getAccessToken: async () => {
      const accessToken = await initMessenger.call(
        'AuthenticationController:getBearerToken',
      );
      await refreshCanonicalProfileId();
      return accessToken;
    },
    getCanonicalProfileId: () => canonicalProfileId,
    isEnabled: () => resolveVenueAuthProfile(readConfig()) !== undefined,
    isUnlocked: () =>
      initMessenger.call('KeyringController:getState').isUnlocked,
    isSignedIn: () =>
      initMessenger.call('AuthenticationController:getState').isSignedIn,
    now: () => Math.floor(Date.now() / 1000),
    nowMs: Date.now,
    sleep: (ms) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      }),
    fetch: (input, init) => global.fetch(input, init),
  });

  initMessenger.subscribe('KeyringController:lock', () => controller.clear());
  initMessenger.subscribe('AuthenticationController:stateChange', () => {
    const currentAuthentication = initMessenger.call(
      'AuthenticationController:getState',
    );
    if (isSignedIn && !currentAuthentication.isSignedIn) {
      rememberCanonicalProfileId(undefined);
      controller.clear();
    }
    isSignedIn = currentAuthentication.isSignedIn;
  });
  initMessenger.subscribe(
    'AuthenticationController:profileSignIn',
    ({ profileId, profileIdChanged }) => {
      if (profileIdChanged) {
        controller.clear();
      }
      rememberCanonicalProfileId(profileId);
    },
  );
  initMessenger.subscribe('RemoteFeatureFlagController:stateChange', () => {
    if (!resolveVenueAuthProfile(readConfig())) {
      controller.clear();
    }
  });

  return { controller };
};
