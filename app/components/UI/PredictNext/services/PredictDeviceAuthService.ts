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
import {
  listBundledAuthenticationProfiles,
  type VenueAuthenticationProfile,
} from '../auth/venueAuthProfiles';

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
   * independent of whether the venue is currently enabled. Queried when
   * preparing credentials so a resolved profile id change rebuilds the device
   * key and session. Undefined when this build does not recognize the
   * selected profile id. `isEnabled` is the separate on/off switch. Wallet
   * reset ignores this and deletes every bundled key slot.
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
    return this.#ensureDeviceKey(this.#resolveBinding(), enabled, unlocked);
  }

  async getA2t(): Promise<string | undefined> {
    const enabled = this.#deps.isEnabled();
    const unlocked = this.#deps.isUnlocked();
    const binding = this.#resolveBinding();
    const key = await this.#ensureDeviceKey(binding, enabled, unlocked);
    if (this.#stoppedDuringKeyLoad(binding, key) || !binding || !key) {
      return undefined;
    }
    if (!this.#deps.isSignedIn()) {
      binding.session.clear();
      return undefined;
    }
    return binding.session.ensureA2T();
  }

  async prefetch(includeA2t = true): Promise<void> {
    const enabled = this.#deps.isEnabled();
    const unlocked = this.#deps.isUnlocked();
    const binding = this.#resolveBinding();
    const key = await this.#ensureDeviceKey(binding, enabled, unlocked);
    if (this.#stoppedDuringKeyLoad(binding, key)) {
      return;
    }
    if (binding && key && includeA2t && this.#deps.isSignedIn()) {
      await binding.session.ensureA2T();
    } else if (!this.#deps.isSignedIn()) {
      binding?.session.clear();
    }
  }

  clear(): void {
    this.#active?.session.clear();
    this.#active?.deviceKey.clear();
  }

  /**
   * Drops the in-memory session and deletes every bundled profile's key.
   * The selected configuration is ignored. A failed delete is logged and
   * does not skip the remaining slots or reject.
   */
  async reset(): Promise<void> {
    const logFailure = (error: unknown): void => {
      Logger.error(
        ensureError(error, 'PredictDeviceAuthService.reset'),
        'Failed to reset Predict device authentication',
      );
    };
    const active = this.#active;
    this.#active = undefined;
    try {
      active?.session.clear();
      active?.deviceKey.clear();
    } catch (error) {
      logFailure(error);
    }

    for (const profile of listBundledAuthenticationProfiles()) {
      try {
        await createP256DeviceKey(profile.deviceKey).delete();
      } catch (error) {
        logFailure(error);
      }
    }
  }

  /**
   * A lock or flag clear during key loading already dropped this session.
   * `ensureA2T` would otherwise start a new flight and poll until timeout.
   * Returns true when issuance must stop. Clears only when this call still
   * holds a key, so the pre-load clear is not repeated.
   */
  #stoppedDuringKeyLoad(
    binding: PredictDeviceAuthBinding | undefined,
    key: P256DevicePublicMaterial | null,
  ): boolean {
    if (this.#deps.isEnabled() && this.#deps.isUnlocked()) {
      return false;
    }
    if (binding && key) {
      this.clear();
    }
    return true;
  }

  /**
   * Loads the key for the binding this call already resolved. A second
   * `getProfile` after the load would request the A2T from a new session
   * whose key was never loaded.
   */
  async #ensureDeviceKey(
    binding: PredictDeviceAuthBinding | undefined,
    enabled: boolean,
    unlocked: boolean,
  ): Promise<P256DevicePublicMaterial | null> {
    if (!enabled || !unlocked || !binding) {
      this.clear();
      return null;
    }
    return binding.deviceKey.ensure(unlocked);
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
