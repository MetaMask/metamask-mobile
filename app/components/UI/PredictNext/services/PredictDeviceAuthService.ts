import type { Messenger } from '@metamask/messenger';

import { resolveA2tIssuerUrl } from '../auth/a2tIssuerUrl';
import { A2tSession } from '../auth/a2tSession';
import {
  createP256DeviceKey,
  type P256DeviceKey,
  type P256DevicePublicMaterial,
} from '../auth/p256DeviceKey';
import type { VenueAuthenticationProfile } from '../auth/venueAuthProfiles';

export const PREDICT_DEVICE_AUTH_SERVICE_NAME =
  'PredictDeviceAuthService' as const;

export interface PredictDeviceAuthServiceEnsureDeviceKeyAction {
  type: 'PredictDeviceAuthService:ensureDeviceKey';
  handler: () => Promise<P256DevicePublicMaterial | null>;
}

export interface PredictDeviceAuthServiceGetA2tAction {
  type: 'PredictDeviceAuthService:getA2t';
  handler: () => Promise<string | undefined>;
}

export interface PredictDeviceAuthServicePrefetchAction {
  type: 'PredictDeviceAuthService:prefetch';
  handler: (includeA2t?: boolean) => Promise<void>;
}

export interface PredictDeviceAuthServiceClearAction {
  type: 'PredictDeviceAuthService:clear';
  handler: () => void;
}

export interface PredictDeviceAuthServiceResetAction {
  type: 'PredictDeviceAuthService:reset';
  handler: () => Promise<void>;
}

export type PredictDeviceAuthServiceActions =
  | PredictDeviceAuthServiceEnsureDeviceKeyAction
  | PredictDeviceAuthServiceGetA2tAction
  | PredictDeviceAuthServicePrefetchAction
  | PredictDeviceAuthServiceClearAction
  | PredictDeviceAuthServiceResetAction;

export type PredictDeviceAuthServiceMessenger = Messenger<
  typeof PREDICT_DEVICE_AUTH_SERVICE_NAME,
  PredictDeviceAuthServiceActions,
  never
>;

export interface PredictDeviceAuthServiceDependencies {
  profile: VenueAuthenticationProfile;
  getIssuerUrl: () => string | undefined;
  getAccessToken: () => Promise<string>;
  getCanonicalProfileId: () => string | undefined;
  getSrpIdentifier: () => Promise<string>;
  signSrpMessage: (message: string) => Promise<string>;
  isEnabled: () => boolean;
  isUnlocked: () => boolean;
  isSignedIn: () => boolean;
  fetch: typeof fetch;
  now: () => number;
  nowMs: () => number;
  sleep: (ms: number) => Promise<void>;
}

/**
 * Engine-owned authentication capability for Predict venues.
 *
 * The public surface is deliberately narrow: callers can prepare credentials
 * or obtain an A2T, but cannot ask the service to sign arbitrary bytes.
 */
export class PredictDeviceAuthService {
  readonly #deps: PredictDeviceAuthServiceDependencies;
  readonly #session: A2tSession;
  readonly #deviceKey: P256DeviceKey;

  constructor(
    messenger: PredictDeviceAuthServiceMessenger,
    deps: PredictDeviceAuthServiceDependencies,
  ) {
    this.#deps = deps;
    this.#deviceKey = createP256DeviceKey(deps.profile.deviceKey);
    this.#session = new A2tSession({
      profile: deps.profile,
      getIssuerUrl: () => resolveA2tIssuerUrl(deps.getIssuerUrl()),
      getAccessToken: deps.getAccessToken,
      getCanonicalProfileId: deps.getCanonicalProfileId,
      getSrpIdentifier: deps.getSrpIdentifier,
      signSrpMessage: deps.signSrpMessage,
      getDeviceKey: this.#deviceKey.wait,
      peekDeviceKey: this.#deviceKey.get,
      signDeviceProof: this.#deviceKey.sign,
      fetch: deps.fetch,
      now: deps.now,
      nowMs: deps.nowMs,
      sleep: deps.sleep,
    });

    messenger.registerActionHandler(
      'PredictDeviceAuthService:ensureDeviceKey',
      this.ensureDeviceKey.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:getA2t',
      this.getA2t.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:prefetch',
      this.prefetch.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:clear',
      this.clear.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:reset',
      this.reset.bind(this),
    );
  }

  async ensureDeviceKey(): Promise<P256DevicePublicMaterial | null> {
    const enabled = this.#deps.isEnabled();
    const unlocked = this.#deps.isUnlocked();
    if (!enabled || !unlocked) {
      this.clear();
      return null;
    }
    return this.#deviceKey.ensure(unlocked);
  }

  async getA2t(): Promise<string | undefined> {
    const key = await this.ensureDeviceKey();
    if (!key) {
      return undefined;
    }
    if (!this.#deps.isSignedIn()) {
      this.#session.clear();
      return undefined;
    }
    return this.#session.ensureA2T();
  }

  async prefetch(includeA2t = true): Promise<void> {
    const key = await this.ensureDeviceKey();
    if (key && includeA2t && this.#deps.isSignedIn()) {
      await this.#session.ensureA2T();
    } else if (!this.#deps.isSignedIn()) {
      this.#session.clear();
    }
  }

  clear(): void {
    this.#session.clear();
    this.#deviceKey.clear();
  }

  async reset(): Promise<void> {
    this.#session.clear();
    await this.#deviceKey.delete();
  }
}
