import type { Messenger } from '@metamask/messenger';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { resolveA2tIssuerUrl } from '../auth/a2tIssuerUrl';
import { A2tSession } from '../auth/a2tSession';
import {
  claimIntentSignature,
  clearApprovedIntents,
} from '../auth/signing/approvedIntentLedger';
import {
  createP256DeviceKey,
  type P256DeviceKey,
  type P256DevicePublicMaterial,
} from '../auth/p256DeviceKey';
import {
  listBundledAuthenticationProfiles,
  type VenueAuthenticationProfile,
} from '../auth/venueAuthProfiles';
import {
  loadVenueProfile,
  readAllowed,
  VENUE_AUTHORIZATION_HEADER,
  type SigningProfile,
} from '../auth/venueSigningProfiles';
import {
  renderRequest,
  TemplateError,
  type InvariantDisplay,
  type RenderedRequest,
  type RequestTemplate,
} from '../auth/signing/profileTemplates';
import { buildVenueAuthorization } from '../auth/signing/venueAuthorization';
import {
  signDeviceRequest,
  type DeviceSigningContext,
} from '../auth/signing/deviceRequestSigner';
import {
  type DeviceAuthHeader,
  type SignOperationInput,
  type SignedOperation,
} from '../auth/signing/signOperationTypes';
import type { ProposedRead } from '../adapters/remote/signedVenueCall';

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

export interface PredictDeviceAuthServiceSignOperationAction {
  type: 'PredictDeviceAuthService:signOperation';
  handler: (
    intent: string,
    input?: SignOperationInput,
  ) => Promise<SignedOperation | undefined>;
}

export interface PredictDeviceAuthServicePreviewOperationAction {
  type: 'PredictDeviceAuthService:previewOperation';
  handler: (
    intent: string,
    input?: SignOperationInput,
  ) => Promise<InvariantDisplay | undefined>;
}

export interface PredictDeviceAuthServiceSignReadAction {
  type: 'PredictDeviceAuthService:signRead';
  handler: (proposed: ProposedRead) => Promise<DeviceAuthHeader | undefined>;
}

export interface PredictDeviceAuthServicePrefetchAction {
  type: 'PredictDeviceAuthService:prefetch';
  handler: (includeA2t?: boolean) => Promise<void>;
}

export interface PredictDeviceAuthServiceInvalidateA2tAction {
  type: 'PredictDeviceAuthService:invalidateA2t';
  handler: () => void;
}

export interface PredictDeviceAuthServiceClearAction {
  type: 'PredictDeviceAuthService:clear';
  handler: () => void;
}

export interface PredictDeviceAuthServiceClearApprovalsAction {
  type: 'PredictDeviceAuthService:clearApprovals';
  handler: () => Promise<void>;
}

export interface PredictDeviceAuthServiceResetAction {
  type: 'PredictDeviceAuthService:reset';
  handler: () => Promise<void>;
}

export interface PredictDeviceAuthServiceGetApprovalGenerationAction {
  type: 'PredictDeviceAuthService:getApprovalGeneration';
  handler: () => number | undefined;
}

export type PredictDeviceAuthServiceActions =
  | PredictDeviceAuthServiceEnsureDeviceKeyAction
  | PredictDeviceAuthServiceGetA2tAction
  | PredictDeviceAuthServiceSignOperationAction
  | PredictDeviceAuthServicePreviewOperationAction
  | PredictDeviceAuthServiceGetApprovalGenerationAction
  | PredictDeviceAuthServiceSignReadAction
  | PredictDeviceAuthServicePrefetchAction
  | PredictDeviceAuthServiceInvalidateA2tAction
  | PredictDeviceAuthServiceClearAction
  | PredictDeviceAuthServiceClearApprovalsAction
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
  canonicalProfileId: string | undefined;
  deviceKey: P256DeviceKey;
  session: A2tSession;
}

interface PredictDeviceAuthSnapshot {
  binding: PredictDeviceAuthBinding;
  generation: number;
  canonicalProfileId: string | undefined;
}

/**
 * Engine-owned authentication capability for Predict venues.
 *
 * The public surface is deliberately narrow: callers can prepare credentials
 * or obtain an A2T, or sign a request that a bundled, signed venue profile
 * declares. They cannot ask the service to sign arbitrary bytes.
 */
export class PredictDeviceAuthService {
  readonly #deps: PredictDeviceAuthServiceDependencies;
  #active: PredictDeviceAuthBinding | undefined;
  #generation = 0;
  #approvalGeneration = 0;
  #resetsInProgress = 0;

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
      'PredictDeviceAuthService:signOperation',
      this.signOperation.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:previewOperation',
      this.previewOperation.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:getApprovalGeneration',
      this.getApprovalGeneration.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:signRead',
      this.signRead.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:prefetch',
      this.prefetch.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:invalidateA2t',
      this.invalidateA2t.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:clear',
      this.clear.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:clearApprovals',
      this.clearApprovals.bind(this),
    );
    messenger.registerActionHandler(
      'PredictDeviceAuthService:reset',
      this.reset.bind(this),
    );
  }

  async ensureDeviceKey(): Promise<P256DevicePublicMaterial | null> {
    return this.#ensureDeviceKey(this.#captureSession());
  }

  async getA2t(): Promise<string | undefined> {
    const snapshot = this.#captureSession();
    const key = await this.#ensureDeviceKey(snapshot);
    if (!snapshot || !key || !this.#canSign(snapshot, key)) {
      return undefined;
    }
    const a2t = await snapshot.binding.session.ensureA2T();
    return this.#canSign(snapshot, key) ? a2t : undefined;
  }

  /** Quotes bind to approval revocations, not ordinary A2T renewal. */
  getApprovalGeneration(): number | undefined {
    const snapshot = this.#captureSession();
    return snapshot && this.#isCurrent(snapshot) && this.#deps.isSignedIn()
      ? this.#approvalGeneration
      : undefined;
  }

  /**
   * Renders the intent from the active signing profile exactly as
   * `signOperation` would, and returns the worst-case figures its invariant
   * computed, for the confirmation sheet. Nothing is signed and nothing
   * leaves the phone. Returns undefined when no signing profile is active or
   * the intent carries no invariant. Throws `TemplateError` when the profile
   * does not allow the request, which keeps Confirm disabled.
   */
  async previewOperation(
    intent: string,
    input: SignOperationInput = {},
  ): Promise<InvariantDisplay | undefined> {
    const snapshot = this.#captureSession();
    const profile = snapshot ? await loadVenueProfile() : undefined;
    if (
      !snapshot ||
      !profile ||
      !this.#isCurrent(snapshot) ||
      (input.approvalGeneration !== undefined &&
        input.approvalGeneration !== this.#approvalGeneration)
    ) {
      return undefined;
    }
    const requests = this.#renderIntent(profile, intent, input);
    return requests.find((request) => request.display !== undefined)?.display;
  }

  /**
   * Renders the intent's requests from the bundled signing profile, the
   * caller's inputs and the server values, then signs them and returns the
   * envelope header plus the EXACT rendered body bytes the signature covers
   * (ADR-0004): the caller sends these bytes verbatim. The authority,
   * lifetime and covered components come from the profile and the device,
   * never from predict-api. Throws `TemplateError` and signs nothing when
   * the profile does not allow the request. Returns undefined when signing
   * is not available (disabled, locked, signed out, no signing profile, or
   * no A2T).
   */
  async signOperation(
    intent: string,
    input: SignOperationInput = {},
  ): Promise<SignedOperation | undefined> {
    const snapshot = this.#captureSession();
    if (
      input.approvalGeneration !== undefined &&
      input.approvalGeneration !== this.#approvalGeneration
    ) {
      return undefined;
    }
    const profile = snapshot ? await loadVenueProfile() : undefined;
    if (!snapshot || !profile || !this.#isCurrent(snapshot)) {
      return undefined;
    }
    const nowMs = this.#deps.nowMs();
    const requests = this.#renderIntent(profile, intent, input);
    const { maxSignatures } = profile.implementation.params;
    if (requests.length > maxSignatures) {
      throw new TemplateError('max_signatures', intent);
    }
    const key = await this.#ensureDeviceKey(snapshot);
    if (!key || !this.#canSign(snapshot, key)) {
      return undefined;
    }
    const a2t = await snapshot.binding.session.ensureA2T();
    if (!a2t || !this.#canSign(snapshot, key)) {
      return undefined;
    }
    // The Engine may learn the canonical identity during first issuance.
    snapshot.canonicalProfileId = this.#deps.getCanonicalProfileId();
    const intentRule = profile.intents.find((rule) => rule.id === intent);
    const confirmation = intentRule?.confirm;
    if (confirmation?.kind === 'per-intent') {
      const mutation = requests.find(
        (request) => request.idempotencyKey !== undefined,
      );
      const fromInput = input.inputs?.idempotencyKey;
      const idempotencyKey =
        mutation?.idempotencyKey ??
        (typeof fromInput === 'string' ? fromInput : undefined);
      if (!idempotencyKey) {
        throw new TemplateError('confirmation', intent);
      }
      await claimIntentSignature({
        operation: intent,
        idempotencyKey,
        body: mutation?.body,
        signLimit: confirmation.signLimit,
        nowMs,
        confirmed: input.confirmed === true,
      });
    }
    if (!this.#canSign(snapshot, key)) {
      return undefined;
    }
    const context: DeviceSigningContext = {
      a2t,
      deviceKey: key.publicKey,
      salt: key.salt,
    };
    const signatures =
      requests.length === 0
        ? []
        : await Promise.all(
            requests.map((request) =>
              signDeviceRequest(profile, request, context, {
                sign: (bytes) => {
                  if (!this.#canSign(snapshot, key)) {
                    throw new TemplateError('confirmation', intent);
                  }
                  return snapshot.binding.deviceKey.sign(bytes);
                },
                requestId: () => uuidv4(),
                now: this.#deps.now,
              }),
            ),
          );
    if (!this.#canSign(snapshot, key)) {
      return undefined;
    }
    const header: DeviceAuthHeader = {
      name: VENUE_AUTHORIZATION_HEADER,
      value: buildVenueAuthorization({
        profile: { id: profile.id, version: profile.version },
        context,
        signatures,
        maxSignatures,
      }),
    };
    // One signed body: the mutation this envelope covers. Its idempotency
    // key is the signature's own `idempotency-key` component.
    const mutation = requests.find(
      (request) => request.idempotencyKey !== undefined,
    );
    return {
      header,
      body: mutation?.body ?? '',
      idempotencyKey: mutation?.idempotencyKey,
    };
  }

  /**
   * Signs one server-proposed read. This is the security boundary for
   * reads: the GET must match the verified profile's `reads.allow`, within
   * its size limits and in plain URI characters, or nothing is signed and
   * a `TemplateError` is thrown. Returns the `Venue-Authorization` header
   * to re-send the read with, or undefined when signing is not available.
   */
  async signRead(
    proposed: ProposedRead,
  ): Promise<DeviceAuthHeader | undefined> {
    const snapshot = this.#captureSession();
    const profile = snapshot ? await loadVenueProfile() : undefined;
    if (!snapshot || !profile || !this.#isCurrent(snapshot)) {
      return undefined;
    }
    if (!readAllowed(profile, proposed)) {
      throw new TemplateError('class', 'read not allowed by the profile');
    }
    if (
      proposed.requestId !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        proposed.requestId,
      )
    ) {
      throw new TemplateError('input', 'read challenge is not a UUID v4');
    }
    const request: RenderedRequest = {
      name: 'proposal',
      class: 'read',
      method: 'GET',
      path: proposed.path,
      query: proposed.query,
      body: '',
    };
    const { maxSignatures } = profile.implementation.params;
    if (maxSignatures < 1) {
      throw new TemplateError('max_signatures', 'read');
    }
    const key = await this.#ensureDeviceKey(snapshot);
    if (!key || !this.#canSign(snapshot, key)) {
      return undefined;
    }
    const a2t = await snapshot.binding.session.ensureA2T();
    if (!a2t || !this.#canSign(snapshot, key)) {
      return undefined;
    }
    snapshot.canonicalProfileId = this.#deps.getCanonicalProfileId();
    const context: DeviceSigningContext = {
      a2t,
      deviceKey: key.publicKey,
      salt: key.salt,
    };
    const signature = await signDeviceRequest(profile, request, context, {
      sign: (bytes) => {
        if (!this.#canSign(snapshot, key)) {
          throw new TemplateError('confirmation', 'read');
        }
        return snapshot.binding.deviceKey.sign(bytes);
      },
      requestId: () => proposed.requestId ?? uuidv4(),
      now: this.#deps.now,
    });
    if (!this.#canSign(snapshot, key)) {
      return undefined;
    }
    return {
      name: VENUE_AUTHORIZATION_HEADER,
      value: buildVenueAuthorization({
        profile: { id: profile.id, version: profile.version },
        context,
        signatures: [signature],
        maxSignatures,
      }),
    };
  }

  async prefetch(includeA2t = true): Promise<void> {
    const snapshot = this.#captureSession();
    const key = await this.#ensureDeviceKey(snapshot);
    if (snapshot && key && includeA2t && this.#canSign(snapshot, key)) {
      await snapshot.binding.session.ensureA2T();
      this.#canSign(snapshot, key);
    } else if (snapshot && !this.#deps.isSignedIn()) {
      snapshot.binding.session.clear();
    }
  }

  /**
   * Drops the cached A2T only, after predict-api rejected it. The pinned
   * intents stay: a stale A2T does not undo what the user confirmed.
   */
  invalidateA2t(): void {
    this.#generation += 1;
    this.#active?.session.clear();
  }

  /** Drops the in-memory session and device key. The pinned intents stay. */
  clear(): void {
    this.#approvalGeneration += 1;
    this.#generation += 1;
    this.#active?.session.clear();
    this.#active?.deviceKey.clear();
  }

  /**
   * Also drops every pinned intent, the confirmation record. Lock and a
   * change of Predict User call this. Wallet reset drops them in `reset`.
   */
  async clearApprovals(): Promise<void> {
    this.clear();
    await clearApprovedIntents();
  }

  /**
   * Drops the in-memory session and deletes every bundled profile's key.
   * The selected configuration is ignored. A failed delete is logged and
   * does not skip the remaining slots or reject.
   */
  async reset(): Promise<void> {
    this.#resetsInProgress += 1;
    const active = this.#active;
    this.#active = undefined;
    this.#generation += 1;
    this.#approvalGeneration += 1;
    const logFailure = (error: unknown): void => {
      Logger.error(
        ensureError(error, 'PredictDeviceAuthService.reset'),
        'Failed to reset Predict device authentication',
      );
    };
    try {
      active?.session.clear();
      active?.deviceKey.clear();
    } catch (error) {
      logFailure(error);
    }
    // Revoke and enqueue deletes before yielding. A pending key load/write
    // must settle before deletion, and no new preparation may start meanwhile.
    const cleared = clearApprovedIntents();
    const deleted = listBundledAuthenticationProfiles().map(async (profile) => {
      try {
        await createP256DeviceKey(profile.deviceKey).delete();
      } catch (error) {
        logFailure(error);
      }
    });
    try {
      await cleared;
      await Promise.all(deleted);
    } finally {
      this.#resetsInProgress -= 1;
    }
  }

  #captureSession(): PredictDeviceAuthSnapshot | undefined {
    const binding = this.#resolveBinding();
    return (
      binding && {
        binding,
        generation: this.#generation,
        canonicalProfileId: this.#deps.getCanonicalProfileId(),
      }
    );
  }

  /** A later unlock cannot authorize work captured before a revocation. */
  #isCurrent(snapshot: PredictDeviceAuthSnapshot): boolean {
    if (
      snapshot.generation !== this.#generation ||
      snapshot.binding !== this.#active ||
      this.#resetsInProgress > 0
    ) {
      return false;
    }
    if (
      this.#resolveBinding() !== snapshot.binding ||
      snapshot.generation !== this.#generation
    ) {
      return false;
    }
    if (
      !this.#deps.isEnabled() ||
      !this.#deps.isUnlocked() ||
      (snapshot.canonicalProfileId !== undefined &&
        snapshot.canonicalProfileId !== this.#deps.getCanonicalProfileId())
    ) {
      void this.clearApprovals();
      return false;
    }
    return snapshot.generation === this.#generation;
  }

  #canSign(
    snapshot: PredictDeviceAuthSnapshot,
    key: P256DevicePublicMaterial,
  ): boolean {
    if (!this.#isCurrent(snapshot)) {
      return false;
    }
    if (!this.#deps.isSignedIn()) {
      void this.clearApprovals();
      return false;
    }
    const current = snapshot.binding.deviceKey.get();
    if (current?.publicKey !== key.publicKey || current.salt !== key.salt) {
      void this.clearApprovals();
      return false;
    }
    return true;
  }

  async #ensureDeviceKey(
    snapshot: PredictDeviceAuthSnapshot | undefined,
  ): Promise<P256DevicePublicMaterial | null> {
    if (!snapshot || !this.#isCurrent(snapshot)) {
      return null;
    }
    const key = await snapshot.binding.deviceKey.ensure(true);
    return this.#isCurrent(snapshot) ? key : null;
  }

  /**
   * Builds the device key and A2T session bound to the profile `getProfile`
   * currently resolves, rebuilding them if the resolved profile id changed.
   * Returns undefined only when this build does not recognize the selected
   * profile id.
   */
  #resolveBinding(): PredictDeviceAuthBinding | undefined {
    if (this.#resetsInProgress > 0) {
      return undefined;
    }
    const profile = this.#deps.getProfile();
    const canonicalProfileId = this.#deps.getCanonicalProfileId();
    if (!profile || this.#active?.profileId !== profile.id) {
      if (this.#active) {
        void this.clearApprovals();
      }
      this.#active = profile && this.#buildBinding(profile);
    } else if (
      this.#active.canonicalProfileId !== undefined &&
      this.#active.canonicalProfileId !== canonicalProfileId
    ) {
      void this.clearApprovals();
    }
    if (this.#active) {
      this.#active.canonicalProfileId = canonicalProfileId;
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
    return {
      profileId: profile.id,
      canonicalProfileId: this.#deps.getCanonicalProfileId(),
      deviceKey,
      session,
    };
  }

  /**
   * Renders one intent's payloads from the profile. The api payload declares
   * the exact bytes; the class is `mutation` for the POST kinds this DSL
   * version carries.
   */
  #renderIntent(
    profile: SigningProfile,
    intent: string,
    input: SignOperationInput,
  ): RenderedRequest[] {
    const intentRule = profile.intents.find((rule) => rule.id === intent);
    if (!intentRule) {
      throw new TemplateError('intent', intent);
    }
    const context = {
      inputs: input.inputs ?? {},
      values: input.values ?? {},
      nowMs: this.#deps.nowMs(),
    };
    return intentRule.payloads.map((payloadName) => {
      const payload = profile.payloads[payloadName];
      if (!payload) {
        throw new TemplateError('payload', payloadName);
      }
      if (payload.kind !== 'http-rfc9421') {
        throw new TemplateError('template', payloadName);
      }
      const template: RequestTemplate = {
        class: 'mutation',
        method: payload.method,
        path: payload.path,
        body: payload.body
          ? { json: payload.body.json, maxBytes: payload.body.maxBytes }
          : undefined,
        idempotencyKey: payload.idempotencyKey,
        invariants: payload.invariants,
      };
      return renderRequest(payloadName, template, context);
    });
  }
}
