import { ApiEnv, getApiEnv } from '../../apiEnv';
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

/**
 * MetaMask Auth hosts that mint the Kalshi A2T. The placeholder
 * `authentication.<env>.cx.metamask.io` does not resolve. These are the
 * hosts that answer `POST /api/v2/kalshi/token` with 401 when no bearer
 * token is sent. Prod is `authentication.api`, matching the rest of Auth.
 */
const KALSHI_AUTH_API_URL: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://authentication.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://authentication.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://authentication.api.cx.metamask.io',
};

/** Auth base for the cluster `MM_API_ENV` selects. Unset is prod. */
export const resolveKalshiAuthApiUrl = (apiEnv: ApiEnv = getApiEnv()): string =>
  KALSHI_AUTH_API_URL[apiEnv];

const getConfiguredIssuerUrl = (): string => resolveKalshiAuthApiUrl();

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
