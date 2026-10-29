import { HandlerType } from '@metamask/snaps-utils';
import type { SnapId } from '@metamask/snaps-sdk';

import { parsePredictConfig } from '../../../components/UI/PredictNext/config/predictConfig';
import { KALSHI_AUTHENTICATION_PROFILE } from '../../../components/UI/PredictNext/auth/venueAuthProfiles';
import {
  PredictDeviceAuthService,
  type PredictDeviceAuthServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import { resolveCanonicalProfileId } from '../../../util/identity/resolveCanonicalProfileId';
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

  const getCanonicalProfileId = (): string | undefined => {
    const authentication = initMessenger.call(
      'AuthenticationController:getState',
    );
    const keyring = initMessenger.call('KeyringController:getState');
    return resolveCanonicalProfileId(authentication, keyring);
  };

  let isSignedIn = initMessenger.call(
    'AuthenticationController:getState',
  ).isSignedIn;
  let canonicalProfileId = getCanonicalProfileId();
  const controller = new PredictDeviceAuthService(controllerMessenger, {
    profile: KALSHI_AUTHENTICATION_PROFILE,
    getIssuerUrl: getConfiguredIssuerUrl,
    getAccessToken: () =>
      initMessenger.call('AuthenticationController:getBearerToken'),
    getCanonicalProfileId,
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
    const current = getCanonicalProfileId();
    if (
      (isSignedIn && !currentAuthentication.isSignedIn) ||
      current !== canonicalProfileId
    ) {
      controller.clear();
    }
    isSignedIn = currentAuthentication.isSignedIn;
    canonicalProfileId = current;
  });
  initMessenger.subscribe('RemoteFeatureFlagController:stateChange', () => {
    const state = initMessenger.call('RemoteFeatureFlagController:getState');
    const config = parsePredictConfig(state.remoteFeatureFlags?.predictConfig);
    if (!config.enabled || !config.venues.kalshi.enabled) {
      controller.clear();
    }
  });

  return { controller };
};
