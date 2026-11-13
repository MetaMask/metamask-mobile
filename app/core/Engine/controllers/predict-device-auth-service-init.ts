import { getPredictDeviceAuthIssuerUrl } from '../../../components/UI/PredictNext/config/predictClusterUrls';
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
    getIssuerUrl: getPredictDeviceAuthIssuerUrl,
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

  // Lock, sign-out and a change of Predict User also drop the approved
  // intents: a confirmation never outlives the session that gave it.
  const clearApprovals = () => {
    controller.clearApprovals().catch(() => undefined);
  };
  initMessenger.subscribe('KeyringController:lock', clearApprovals);
  initMessenger.subscribe('AuthenticationController:stateChange', () => {
    const currentAuthentication = initMessenger.call(
      'AuthenticationController:getState',
    );
    if (isSignedIn && !currentAuthentication.isSignedIn) {
      rememberCanonicalProfileId(undefined);
      clearApprovals();
    }
    isSignedIn = currentAuthentication.isSignedIn;
  });
  initMessenger.subscribe(
    'AuthenticationController:profileSignIn',
    ({ profileId, profileIdChanged }) => {
      if (profileIdChanged) {
        clearApprovals();
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
