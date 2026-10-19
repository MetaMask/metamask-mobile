import { HandlerType } from '@metamask/snaps-utils';
import type { SnapId } from '@metamask/snaps-sdk';
// PoC local issuer. Remove these imports once the A2T service has an external
// URL. They exist to rewrite localhost for an Android emulator.
import { Platform } from 'react-native';
import { isEmulatorSync } from 'react-native-device-info';

import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import { selectCanonicalProfileId } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { store } from '../../../../store';
import { selectPredictConfig } from '../selectors/predictConfig';
import { resolveA2tIssuerUrl } from './a2tIssuerUrl';
import { A2tSession, type A2tIssuedSummary } from './a2tSession';
import {
  ensureKalshiDeviceKey,
  getKalshiDeviceKey,
  signWithKalshiDeviceKey,
} from './kalshiDeviceKey';

const MESSAGE_SIGNING_SNAP_ID: SnapId =
  'npm:@metamask/message-signing-snap' as SnapId;

/**
 * PoC local issuer. Remove this default once the A2T service has an external
 * URL. `yarn start:a2t` serves it on port 4445.
 */
const DEV_ISSUER_URL = 'http://localhost:4445';

const configuredIssuerUrl = (): string | undefined => {
  const fromEnv = process.env.MM_A2T_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  // PoC local issuer. Remove this development fallback once the A2T service
  // has an external URL.
  return __DEV__ ? DEV_ISSUER_URL : undefined;
};

const invokeMessageSigningSnap = (
  method: string,
  params?: Record<string, unknown>,
): Promise<unknown> =>
  handleSnapRequest(Engine.controllerMessenger, {
    snapId: MESSAGE_SIGNING_SNAP_ID,
    origin: 'metamask',
    handler: HandlerType.OnRpcRequest,
    request: params ? { method, params } : { method },
  });

/**
 * PoC only. One process-wide A2T session so PredictNext can prefetch without
 * starting a second challenge on remount. A proper version registers this as
 * an Engine service, the same way the PredictNext data services are built in
 * `predict-service-init`, and deletes this module singleton.
 */
export const a2tSession = new A2tSession({
  getIssuerUrl: () =>
    // PoC local issuer. Remove the host argument once the A2T service has an
    // external URL. It tells the resolver when to rewrite localhost.
    resolveA2tIssuerUrl(configuredIssuerUrl(), {
      os: Platform.OS,
      isEmulator: isEmulatorSync(),
    }),
  getAccessToken: () =>
    Engine.context.AuthenticationController.getBearerToken(),
  getCanonicalProfileId: () =>
    selectCanonicalProfileId(store.getState()) || undefined,
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
  getDeviceKey: () => {
    const state = store.getState();
    return ensureKalshiDeviceKey(
      selectPredictConfig(state),
      selectIsUnlocked(state),
    );
  },
  peekDeviceKey: () => getKalshiDeviceKey(),
  signDeviceProof: (message) => signWithKalshiDeviceKey(message),
  fetch: (input, init) =>
    global.fetch(input, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(15_000),
    }),
  now: () => Math.floor(Date.now() / 1000),
  nowMs: () => Date.now(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
  logIssued: (summary: A2tIssuedSummary) => {
    if (!__DEV__) {
      return;
    }
    // Dev-only. Logger.log stores a Sentry breadcrumb outside development,
    // and this summary contains the A2T.
    // eslint-disable-next-line no-console
    console.log('A2T issued', summary);
  },
});
