import type { Messenger } from '@metamask/messenger';

import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
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
  /**
   * Resolves the bundled profile the current configuration selects,
   * independent of whether the venue is currently enabled. Queried on every
   * capability call so a resolved profile id change rebuilds the device key
   * and session; undefined when this build does not recognize the selected
   * profile id. `isEnabled` is the separate on/off switch.
   */
  getProfile: () => VenueAuthenticationProfile | undefined;
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

interface PredictDeviceAuthBinding {
  profileId: string;
  deviceKey: P256DeviceKey;
  session: A2tSession;
}

/**
 * Engine-owned authentication capability for Predict venues.
 *
 * The public surface is deliberately narrow: callers can prepare credentials
 * or obtain an A2T, but cannot ask the service to sign arbitrary bytes.
 */
export class PredictDeviceAuthService {
  readonly #deps: PredictDeviceAuthServiceDependencies;
  #active: PredictDeviceAuthBinding | undefined;

  constructor(
    messenger: PredictDeviceAuthServiceMessenger,
    deps: PredictDeviceAuthServiceDependencies,
  ) {
    this.#deps = deps;

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
    const binding = this.#resolveBinding();
    if (!enabled || !unlocked || !binding) {
      this.clear();
      return null;
    }
    return binding.deviceKey.ensure(unlocked);
  }

  async getA2t(): Promise<string | undefined> {
    const key = await this.ensureDeviceKey();
    if (!key) {
      return undefined;
    }
    const binding = this.#resolveBinding();
    if (!this.#deps.isSignedIn()) {
      binding?.session.clear();
      return undefined;
    }
    return binding?.session.ensureA2T();
  }

  async prefetch(includeA2t = true): Promise<void> {
    const key = await this.ensureDeviceKey();
    const binding = this.#resolveBinding();
    if (key && includeA2t && this.#deps.isSignedIn()) {
      await binding?.session.ensureA2T();
    } else if (!this.#deps.isSignedIn()) {
      binding?.session.clear();
    }
  }

  clear(): void {
    this.#active?.session.clear();
    this.#active?.deviceKey.clear();
  }

  async reset(): Promise<void> {
    try {
      // Resolve (rather than read `#active`) so a reset issued while the
      // capability is currently disabled still targets the persisted key for
      // the configured profile, e.g. after the remote flag turned it off.
      const binding = this.#resolveBinding();
      binding?.session.clear();
      await binding?.deviceKey.delete();
    } catch (error) {
      // A failed key delete must not abort wallet reset.
      Logger.error(
        ensureError(error, 'PredictDeviceAuthService.reset'),
        'Failed to reset Predict device authentication',
      );
    }
  }

  /**
   * Builds the device key and A2T session bound to the profile `getProfile`
   * currently resolves, rebuilding them if the resolved profile id changed.
   * Returns undefined only when this build does not recognize the selected
   * profile id.
   */
  #resolveBinding(): PredictDeviceAuthBinding | undefined {
    const profile = this.#deps.getProfile();
    if (!profile || this.#active?.profileId !== profile.id) {
      this.#active?.session.clear();
      this.#active?.deviceKey.clear();
      this.#active = profile && this.#buildBinding(profile);
    }
    return this.#active;
  }

  #buildBinding(profile: VenueAuthenticationProfile): PredictDeviceAuthBinding {
    const deviceKey = createP256DeviceKey(profile.deviceKey);
    const session = new A2tSession({
      profile,
      getIssuerUrl: () => resolveA2tIssuerUrl(this.#deps.getIssuerUrl()),
      getAccessToken: this.#deps.getAccessToken,
      getCanonicalProfileId: this.#deps.getCanonicalProfileId,
      getSrpIdentifier: this.#deps.getSrpIdentifier,
      signSrpMessage: this.#deps.signSrpMessage,
      getDeviceKey: deviceKey.wait,
      peekDeviceKey: deviceKey.get,
      signDeviceProof: deviceKey.sign,
      fetch: this.#deps.fetch,
      now: this.#deps.now,
      nowMs: this.#deps.nowMs,
      sleep: this.#deps.sleep,
    });
    return { profileId: profile.id, deviceKey, session };
  }
}
