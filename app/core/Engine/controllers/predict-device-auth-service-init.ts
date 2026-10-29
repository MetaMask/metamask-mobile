import { HandlerType } from '@metamask/snaps-utils';
import type { SnapId } from '@metamask/snaps-sdk';

import { parsePredictConfig } from '../../../components/UI/PredictNext/config/predictConfig';
import { KALSHI_AUTHENTICATION_PROFILE } from '../../../components/UI/PredictNext/auth/venueAuthProfiles';
import {
  PredictDeviceAuthService,
  type PredictDeviceAuthServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import type { PredictDeviceAuthServiceInitMessenger } from '../messengers/predict-device-auth-service-messenger';
import type { MessengerClientInitFunction } from '../types';

const MESSAGE_SIGNING_SNAP_ID: SnapId =
  'npm:@metamask/message-signing-snap' as SnapId;
const DEV_ISSUER_URL = 'https://predict-api.dev-api.cx.metamask.io';

export const resolvePredictDeviceAuthIssuerUrl = (
  isDevelopment: boolean,
  override: string | undefined,
): string | undefined => {
  if (!isDevelopment) {
    return undefined;
  }
  if (typeof override === 'string' && override.trim().length > 0) {
    return override;
  }
  return DEV_ISSUER_URL;
};

const getConfiguredIssuerUrl = (): string | undefined =>
  resolvePredictDeviceAuthIssuerUrl(__DEV__, process.env.MM_A2T_URL);

export const predictDeviceAuthServiceInit: MessengerClientInitFunction<
  PredictDeviceAuthService,
  PredictDeviceAuthServiceMessenger,
  PredictDeviceAuthServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const invokeMessageSigningSnap = (
    method: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> =>
    initMessenger.call('SnapController:handleRequest', {
      snapId: MESSAGE_SIGNING_SNAP_ID,
      origin: 'metamask',
      handler: HandlerType.OnRpcRequest,
      request: params ? { method, params } : { method },
    });

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
    profile: KALSHI_AUTHENTICATION_PROFILE,
    getIssuerUrl: getConfiguredIssuerUrl,
    getAccessToken: async () => {
      const accessToken = await initMessenger.call(
        'AuthenticationController:getBearerToken',
      );
      await refreshCanonicalProfileId();
      return accessToken;
    },
    getCanonicalProfileId: () => canonicalProfileId,
    getSrpIdentifier: async () => {
      const identifier = await invokeMessageSigningSnap('getPublicKey');
      if (typeof identifier !== 'string' || identifier.length === 0) {
        throw new Error('SRP identifier was not available');
      }
      return identifier;
    },
    signSrpMessage: async (message) => {
      const signature = await invokeMessageSigningSnap('signMessage', {
        message,
      });
      if (typeof signature !== 'string' || signature.length === 0) {
        throw new Error('SRP signature was not available');
      }
      return signature;
    },
    isEnabled: () => {
      const state = initMessenger.call('RemoteFeatureFlagController:getState');
      const config = parsePredictConfig(
        state.remoteFeatureFlags?.predictConfig,
      );
      return config.enabled && config.venues.kalshi.enabled;
    },
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
    fetch: (input, init) =>
      global.fetch(input, {
        ...init,
        signal:
          init?.signal ??
          AbortSignal.timeout(
            KALSHI_AUTHENTICATION_PROFILE.a2t.requestTimeoutMs,
          ),
      }),
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
    const state = initMessenger.call('RemoteFeatureFlagController:getState');
    const config = parsePredictConfig(state.remoteFeatureFlags?.predictConfig);
    if (!config.enabled || !config.venues.kalshi.enabled) {
      controller.clear();
    }
  });

  return { controller };
};
