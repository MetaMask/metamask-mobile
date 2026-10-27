import { HandlerType } from '@metamask/snaps-utils';
import type { SnapId } from '@metamask/snaps-sdk';

import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import { selectCanonicalProfileId } from '../../../../selectors/identity';
import { store } from '../../../../store';
import { resolveA2tIssuerUrl } from './a2tIssuerUrl';
import { A2tSession } from './a2tSession';
import {
  clearKalshiDeviceKey,
  deleteKalshiDeviceKey,
  getKalshiDeviceKey,
  signWithKalshiDeviceKey,
  waitForKalshiDeviceKey,
} from './kalshiDeviceKey';

const MESSAGE_SIGNING_SNAP_ID: SnapId =
  'npm:@metamask/message-signing-snap' as SnapId;

/**
 * `MM_A2T_URL` overrides the issuer in every build. Debug builds with it
 * unset issue against the dev Predict API. Release builds with it unset
 * skip issuance.
 */
const DEV_ISSUER_URL = 'https://predict-api.dev-api.cx.metamask.io';

const configuredIssuerUrl = (): string | undefined => {
  const fromEnv = process.env.MM_A2T_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv;
  }
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
  getIssuerUrl: () => resolveA2tIssuerUrl(configuredIssuerUrl()),
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
  getDeviceKey: () => waitForKalshiDeviceKey(),
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
});

let watchingWalletLock = false;

/**
 * Drops the cached A2T and the plaintext device key whenever the wallet
 * locks, including when PredictNext is no longer on screen. The bootstraps
 * only see a lock while the stack is mounted. Idempotent: the first call
 * subscribes, and the subscription lives as long as `a2tSession`.
 * `KalshiA2tSessionBootstrap` calls this on mount, after Engine is running,
 * so nothing is cached before the subscription exists.
 */
export const watchWalletLockForA2tSession = (): void => {
  if (watchingWalletLock) {
    return;
  }
  Engine.controllerMessenger.subscribe('KeyringController:lock', () => {
    a2tSession.clear();
    clearKalshiDeviceKey();
  });
  watchingWalletLock = true;
};

/** Wallet reset. Drops the cached A2T, then removes the device key. */
export const deleteKalshiTradingSession = async (): Promise<void> => {
  a2tSession.clear();
  await deleteKalshiDeviceKey();
};
