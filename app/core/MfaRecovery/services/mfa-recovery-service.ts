import type {
  KeyringControllerGetStateAction,
  KeyringControllerWithKeyringV2UnsafeAction,
} from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import {
  MIN_IDENTIFIERS,
  MutationRejectedError,
  type Identifier,
  type MfaRecoveryControllerActions,
  type MfaRecoveryControllerAuthenticateIdentifierAction,
  type MfaRecoveryControllerGetIdentifiersAction,
  type MfaRecoveryControllerGetPhaseAction,
  type MfaRecoveryControllerGetRecoverySecretAction,
  type MfaRecoveryControllerRegisterAction,
  type MfaRecoveryControllerResumeAction,
  type MfaRecoveryControllerUpdateIdentifiersAction,
  type RecoveryIdentifiers,
} from '@metamask/mfa-recovery-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type {
  SecretMetadata,
  SeedlessOnboardingControllerAuthenticateForRecoveryAction,
  SeedlessOnboardingControllerFetchAllSecretDataAction,
  SeedlessOnboardingControllerGetAccessTokenAction,
  SeedlessOnboardingControllerGetStateAction,
  SeedlessOnboardingControllerMigrateToEnvelopeAction,
  SeedlessOnboardingControllerRecoverWithRecoverySecretAction,
  SeedlessOnboardingControllerResetPasswordWithVaultKeysAction,
  SeedlessOnboardingControllerRunMigrationsAction,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex } from '@metamask/utils';
import Logger from '../../../util/Logger';
import { authEnv } from '../../apiEnv';
import { createSiweIdentifier } from '../../Engine/controllers/mfa-recovery-controller/auth/identifier-auth-provider';
import {
  isProvablePasskeyIdentifier,
  withPasskeyVerifier,
} from '../../Engine/controllers/mfa-recovery-controller/auth/passkey-identifier-auth-provider';
import {
  createSrpSiweSignerFromMessenger,
  type SiweSigner,
} from '../../Engine/controllers/mfa-recovery-controller/auth/srp-siwe-signer';
import {
  getToprfRecoveryConfig,
  RECOVERY_SECRET_LENGTH,
} from '../../Engine/controllers/mfa-recovery-controller/config';
import { MfaRecoveryControllerError } from '../../Engine/controllers/mfa-recovery-controller/errors';
import { setDevSocialLinkEmail } from '../social-login/devSocialLinkEmail';
import { linkSocialLogin } from '../social-login/link-social-login';
import {
  findSocialIdentifier,
  getMfaRecoveryStatus,
  getRegistrationIdentifiers,
  isSameIdentifier,
  type CubistIdentifierChangeResult,
  type MfaRecoverySetupResult,
  type MfaRecoveryStatus,
} from './recovery-setup';

const SERVICE_NAME = 'MfaRecoveryService';

const APPROVAL_REQUEST_HASH_LENGTH = 32;

type MfaRecoveryControllerIsTrustedAction = Extract<
  MfaRecoveryControllerActions,
  { type: 'MfaRecoveryController:isTrusted' }
>;

type AllowedActions =
  | AuthenticationController.AuthenticationControllerGetVerificationTokenAction
  | AuthenticationController.AuthenticationControllerRequestMfaApprovalAction
  | KeyringControllerGetStateAction
  | KeyringControllerWithKeyringV2UnsafeAction
  | MfaRecoveryControllerAuthenticateIdentifierAction
  | MfaRecoveryControllerGetIdentifiersAction
  | MfaRecoveryControllerGetPhaseAction
  | MfaRecoveryControllerGetRecoverySecretAction
  | MfaRecoveryControllerIsTrustedAction
  | MfaRecoveryControllerRegisterAction
  | MfaRecoveryControllerResumeAction
  | MfaRecoveryControllerUpdateIdentifiersAction
  | SeedlessOnboardingControllerAuthenticateForRecoveryAction
  | SeedlessOnboardingControllerFetchAllSecretDataAction
  | SeedlessOnboardingControllerGetAccessTokenAction
  | SeedlessOnboardingControllerGetStateAction
  | SeedlessOnboardingControllerMigrateToEnvelopeAction
  | SeedlessOnboardingControllerRecoverWithRecoverySecretAction
  | SeedlessOnboardingControllerResetPasswordWithVaultKeysAction
  | SeedlessOnboardingControllerRunMigrationsAction;

/** The controller actions the recovery flows call. */
export type MfaRecoveryServiceMessenger = Messenger<
  typeof SERVICE_NAME,
  AllowedActions,
  never
>;

export interface MfaRecoveryServiceOptions {
  /** Reaches the MFA recovery, seedless, keyring, and Auth controllers. */
  messenger: MfaRecoveryServiceMessenger;
  /** Starts the verification session recovery approvals require. */
  verifyMfa: () => Promise<void>;
  /** The MFA reason the recovery approvals are requested for. */
  approvalOperation: string;
  /**
   * Asks for the email to link the social login with during setup.
   * `undefined` links with the social token's own email.
   */
  getSocialLinkEmail?: () => Promise<string | undefined>;
}

export interface MfaRecoverySetupOptions {
  /** Reject with {@link IdentifierNotApprovedError} if Auth approved no trusted passkey. */
  requirePasskey?: boolean;
}

export type RecoveryIdentifierType = 'passkey' | 'social';

export interface FindRecoveryIdentifierOptions {
  /** Which enrolled identifier to read the Recovery Secret with. */
  identifierType: RecoveryIdentifierType;
  /** Whether the social provider can issue a nonce-bound ID token. */
  canProveSocialIdentifier: boolean;
}

/** Auth approved no identifier of the requested type for this profile. */
export class IdentifierNotApprovedError extends MfaRecoveryControllerError {
  readonly identifierType: Identifier['type'];

  constructor(identifierType: Identifier['type']) {
    super(
      `Auth has no approved ${identifierType} identifier for this profile`,
      'identifier_not_approved',
    );
    this.name = 'IdentifierNotApprovedError';
    this.identifierType = identifierType;
  }
}

/**
 * Runs MFA recovery flows against the escrow and the TOPRF nodes. One instance
 * serves one run of a flow: `verifyMfa` and `approvalOperation` tie it to how
 * that run proves the user, and its verification session lasts as long as the
 * instance.
 */
export class MfaRecoveryService {
  readonly #messenger: MfaRecoveryServiceMessenger;

  readonly #options: MfaRecoveryServiceOptions;

  #verification?: Promise<void>;

  readonly #siweSigner: SiweSigner;

  constructor(options: MfaRecoveryServiceOptions) {
    this.#messenger = options.messenger;
    this.#options = options;
    this.#siweSigner = createSrpSiweSignerFromMessenger(this.#messenger);
  }

  /**
   * The address of the primary SRP's message-signing key, which SIWE
   * identifiers use.
   */
  async getSiweAddress(): Promise<string> {
    return await this.#siweSigner.getAddress();
  }

  /** Recovery is set up once the vault is envelope-managed. */
  getStatus(): MfaRecoveryStatus {
    return getMfaRecoveryStatus(this.#seedlessState());
  }

  /** The passkey Cubist has enrolled for the WebAuthn `credentialId`, if any. */
  async findEnrolledPasskeyIdentifier(
    credentialId: string,
  ): Promise<Identifier | undefined> {
    const { identifiers } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    return identifiers.find(
      (identifier) =>
        identifier.type === 'passkey' && identifier.value === credentialId,
    );
  }

  /** The trusted passkeys Auth approved that Cubist does not have enrolled yet. */
  async getUnenrolledPasskeyIdentifiers(): Promise<Identifier[]> {
    const { identifiers, authIdentifiers } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    const unenrolled = authIdentifiers.filter(
      (candidate) =>
        candidate.type === 'passkey' &&
        !identifiers.some((enrolled) => isSameIdentifier(enrolled, candidate)),
    );
    return await this.#filterTrusted(unenrolled);
  }

  /**
   * Decrypts the seed phrases with the Recovery Secret and creates the local
   * vault under `password`, the password that unlocks the wallet on this device.
   */
  async recoverWithRecoverySecret(
    recoverySecret: Uint8Array,
    password: string,
  ): Promise<SecretMetadata[]> {
    return await this.#messenger.call(
      'SeedlessOnboardingController:recoverWithRecoverySecret',
      { recoverySecret, password },
    );
  }

  /** Makes `newPassword` the global password, using the recovered vault keys. */
  async resetGlobalPassword(newPassword: string): Promise<void> {
    await this.#messenger.call(
      'SeedlessOnboardingController:resetPasswordWithVaultKeys',
      { newPassword },
    );
  }

  /**
   * Fetches the SRPs and private keys with the keys of the unlocked vault, such
   * as the one `recoverWithRecoverySecret` creates. The caller owns the result.
   */
  async fetchSecretsWithCachedKey(): Promise<SecretMetadata[]> {
    return await this.#messenger.call(
      'SeedlessOnboardingController:fetchAllSecretData',
    );
  }

  /** Returns a fresh random Recovery Secret. */
  createRecoverySecret(): Uint8Array {
    return randomBytes(RECOVERY_SECRET_LENGTH);
  }

  /**
   * Verifies the user once per instance; later approvals reuse the session.
   * A failed verification is retried on the next call.
   */
  async verifyMfa(): Promise<void> {
    this.#verification ??= this.#options.verifyMfa().catch((error) => {
      this.#verification = undefined;
      throw error;
    });
    await this.#verification;
  }

  /** Mints an approval for the TOPRF nodes; needs a verification session. */
  async mintAal2Token(): Promise<string> {
    const { approval } = await this.#messenger.call(
      'AuthenticationController:requestMfaApproval',
      {
        requestHash: bytesToHex(randomBytes(APPROVAL_REQUEST_HASH_LENGTH)),
        audiences: [getToprfRecoveryConfig().aal2Audience],
        requireVerification: true,
        includeIdentifiers: false,
        reason: { operation: this.#options.approvalOperation },
      },
    );
    return approval;
  }

  /**
   * Authenticates the identifier and reads the Recovery Secret from the
   * escrow. The caller owns the returned secret and must zero it.
   */
  async readRecoverySecret(
    identifier: Identifier,
  ): Promise<{ epoch: number; recoverySecret: Uint8Array }> {
    const identifierSession = await this.#messenger.call(
      'MfaRecoveryController:authenticateIdentifier',
      identifier,
    );
    const { epoch, recoverySecret } = await this.#messenger.call(
      'MfaRecoveryController:getRecoverySecret',
      identifierSession,
    );
    try {
      if (recoverySecret.length !== RECOVERY_SECRET_LENGTH) {
        throw new MfaRecoveryControllerError(
          'The escrow returned a Recovery Secret of the wrong length',
          'recovery_secret_invalid',
        );
      }
      return { epoch, recoverySecret: new Uint8Array(recoverySecret) };
    } finally {
      recoverySecret.fill(0);
    }
  }

  /** Authenticates with the TOPRF nodes at aal2 for vault recovery. */
  async openRecoverySession(): Promise<void> {
    const aal2Token = await this.mintAal2Token();
    const { authConnectionId, groupedAuthConnectionId } =
      getToprfRecoveryConfig();
    await this.#messenger.call(
      'SeedlessOnboardingController:authenticateForRecovery',
      { aal2Token, authConnectionId, groupedAuthConnectionId },
    );
  }

  /**
   * Picks the enrolled identifier of `identifierType` to read the Recovery
   * Secret with. A passkey must be one Auth approved and provable; a social
   * identifier must be approved and the provider must be able to prove it.
   * Runs while the wallet is locked, so it does not verify the user.
   *
   * @returns The identifier, or `null` when none of that type qualifies.
   */
  async findRecoveryIdentifier({
    identifierType,
    canProveSocialIdentifier,
  }: FindRecoveryIdentifierOptions): Promise<Identifier | null> {
    const { identifiers, authIdentifiers } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    // Auth's copy carries the verifier (RP ID, credential ID) the proof needs.
    const approved = identifiers.flatMap((enrolled) => {
      const authIdentifier = authIdentifiers.find((candidate) =>
        isSameIdentifier(candidate, enrolled),
      );
      return authIdentifier ? [authIdentifier] : [];
    });

    if (identifierType === 'passkey') {
      return (
        approved.map(withPasskeyVerifier).find(isProvablePasskeyIdentifier) ??
        null
      );
    }
    if (!canProveSocialIdentifier) {
      return null;
    }
    return approved.find((identifier) => identifier.type === 'social') ?? null;
  }

  /**
   * Prepares the unlocked social wallet for passwordless recovery: registers
   * one Recovery Secret for SIWE, Auth's social identifier, and any trusted
   * passkeys Auth approved, then seals the vault with it. An existing Cubist
   * registration is read with SIWE, never overwritten. The current password
   * still unlocks the wallet. Does nothing when the vault is already sealed.
   */
  async setUp({
    requirePasskey = false,
  }: MfaRecoverySetupOptions = {}): Promise<MfaRecoverySetupResult> {
    if (this.#seedlessState().envelope) {
      return 'already_enabled';
    }

    const address = await this.getSiweAddress();
    await this.verifyMfa();
    await this.#resumePendingOperation();

    const initial = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    const initialTrusted = await this.#filterTrusted(initial.authIdentifiers);

    if (
      requirePasskey &&
      !initialTrusted.some((identifier) => identifier.type === 'passkey')
    ) {
      throw new IdentifierNotApprovedError('passkey');
    }

    const { epoch, identifiers, authIdentifiers, trustedAuth } =
      await this.#ensureSocialIdentifier(initial, initialTrusted);

    // Auth only approves non-SIWE identifiers; SIWE is proven by the wallet
    // signature, so fall back to the SRP signing key's identifier.
    const siweIdentifier =
      trustedAuth.find((identifier) => identifier.type === 'siwe') ??
      createSiweIdentifier(address);
    const passkeys = trustedAuth.filter(
      (identifier) => identifier.type === 'passkey',
    );
    const registrationIdentifiers = getRegistrationIdentifiers(
      trustedAuth,
      siweIdentifier,
      passkeys,
      this.#seedlessState(),
    );

    let recoverySecret = new Uint8Array(0);
    try {
      if (epoch > 0) {
        // A previous attempt already stored the secret. Registering again asks
        // for version 1, which Cubist rejects. Reconcile any newly trusted
        // identifiers (such as a passkey enrolled since that attempt) before
        // sealing the vault.
        Logger.log('MfaRecovery setUp: reading existing secret', { epoch });
        await this.#syncMissingIdentifiers(
          identifiers,
          authIdentifiers,
          registrationIdentifiers,
          epoch,
        );
        ({ recoverySecret } = await this.readRecoverySecret(siweIdentifier));
      } else {
        recoverySecret = this.createRecoverySecret();
        await this.#messenger.call(
          'MfaRecoveryController:register',
          recoverySecret,
          registrationIdentifiers,
        );
      }

      await this.openRecoverySession();
      // migrateToEnvelope rejects vaults whose data types are not migrated yet.
      // runMigrations is a no-op once they are.
      await this.#messenger.call('SeedlessOnboardingController:runMigrations');
      await this.#messenger.call(
        'SeedlessOnboardingController:migrateToEnvelope',
        { recoverySecret },
      );
      return 'enabled';
    } finally {
      recoverySecret.fill(0);
    }
  }

  /**
   * Attaches the seedless social login to the Auth profile, so Auth lists it
   * as a recovery identifier. Verifies first: Auth needs an aal2 token to add
   * a login once the profile has a factor.
   *
   * @param verifierId - Email to link instead of the token's own.
   */
  async linkSocialLogin(verifierId?: string): Promise<void> {
    await this.verifyMfa();
    const messenger = this.#messenger;
    const seedlessState = this.#seedlessState();
    await linkSocialLogin({
      env: authEnv(),
      seedlessState,
      getSocialAccessToken: async () =>
        messenger.call('SeedlessOnboardingController:getAccessToken'),
      getVerifiedAccessToken: () =>
        messenger.call('AuthenticationController:getVerificationToken')
          ?.accessToken,
      verifierId,
    });
    setDevSocialLinkEmail(verifierId, seedlessState.socialLoginEmail);
  }

  /**
   * Adds an identifier to Cubist. Cubist may hold several passkeys but one
   * identifier of each other type. Rejects with `identifier_already_enrolled`
   * when the passkey is already enrolled, or for other types when one of the
   * type is.
   */
  async addIdentifier(
    identifier: Identifier,
  ): Promise<CubistIdentifierChangeResult> {
    const { identifiers, epoch, authIdentifiers } =
      await this.#loadForMutation();
    if (isIdentifierEnrolled(identifiers, identifier)) {
      throw new MfaRecoveryControllerError(
        `The ${identifier.type} identifier is already enrolled in Cubist`,
        'identifier_already_enrolled',
      );
    }

    const current = withAuthCopies(identifiers, authIdentifiers);
    const newEpoch = await this.#writeIdentifiers(
      pickAuthorizingIdentifier(current),
      [...current, identifier],
      epoch,
    );
    return {
      identifierType: identifier.type,
      change: 'added',
      epoch: newEpoch,
    };
  }

  /** Removes one enrolled identifier, keeping at least two in Cubist. */
  async removeIdentifier(
    target: Identifier,
  ): Promise<CubistIdentifierChangeResult> {
    const { identifiers, epoch, authIdentifiers } =
      await this.#loadForMutation();
    const current = withAuthCopies(identifiers, authIdentifiers);
    const remaining = current.filter(
      (identifier) => !isSameIdentifier(identifier, target),
    );
    if (remaining.length === current.length) {
      throw new MfaRecoveryControllerError(
        `The ${target.type} identifier is not enrolled in Cubist`,
        'identifier_not_enrolled',
      );
    }
    if (remaining.length < MIN_IDENTIFIERS) {
      throw new MfaRecoveryControllerError(
        `Cubist needs at least ${MIN_IDENTIFIERS} identifiers`,
        'too_few_identifiers',
      );
    }

    const newEpoch = await this.#writeIdentifiers(
      pickAuthorizingIdentifier(remaining),
      remaining,
      epoch,
    );
    return { identifierType: target.type, change: 'removed', epoch: newEpoch };
  }

  async #ensureSocialIdentifier(
    initial: RecoveryIdentifiers,
    trustedAuth: Identifier[],
  ): Promise<RecoveryIdentifiers & { trustedAuth: Identifier[] }> {
    if (findSocialIdentifier(trustedAuth, this.#seedlessState())) {
      return { ...initial, trustedAuth };
    }
    const socialLinkEmail = (
      await this.#options.getSocialLinkEmail?.()
    )?.trim();
    await this.linkSocialLogin(
      socialLinkEmail !== undefined && socialLinkEmail.length > 0
        ? socialLinkEmail
        : undefined,
    );
    const refreshed = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    return {
      ...refreshed,
      trustedAuth: await this.#filterTrusted(refreshed.authIdentifiers),
    };
  }

  async #syncMissingIdentifiers(
    enrolledIdentifiers: readonly Identifier[],
    authIdentifiers: readonly Identifier[],
    desiredIdentifiers: readonly Identifier[],
    epoch: number,
  ): Promise<void> {
    const missing = desiredIdentifiers.filter(
      (candidate) => !isIdentifierEnrolled(enrolledIdentifiers, candidate),
    );
    if (missing.length === 0) {
      return;
    }
    const current = withAuthCopies(enrolledIdentifiers, authIdentifiers);
    await this.#messenger.call(
      'MfaRecoveryController:updateIdentifiers',
      pickAuthorizingIdentifier(current),
      [...current, ...missing],
      epoch,
    );
  }

  async #filterTrusted(
    identifiers: readonly Identifier[],
  ): Promise<Identifier[]> {
    const checks = await Promise.all(
      identifiers.map(async (identifier) => ({
        identifier,
        trusted: await this.#messenger.call(
          'MfaRecoveryController:isTrusted',
          identifier,
        ),
      })),
    );
    return checks
      .filter(({ trusted }) => trusted)
      .map(({ identifier }) => identifier);
  }

  async #resumePendingOperation(): Promise<void> {
    if (
      (await this.#messenger.call('MfaRecoveryController:getPhase')) !== 'idle'
    ) {
      try {
        await this.#messenger.call('MfaRecoveryController:resume');
      } catch (error) {
        if (error instanceof MutationRejectedError) {
          Logger.log('MfaRecovery cleared unapplied pending operation', {
            message: error.message,
          });
          return;
        }
        throw error;
      }
    }
  }

  async #loadForMutation(): Promise<RecoveryIdentifiers> {
    await this.verifyMfa();
    await this.#resumePendingOperation();
    return await this.#messenger.call('MfaRecoveryController:getIdentifiers');
  }

  /** Writes the identifier list and returns the epoch it is stored at. */
  async #writeIdentifiers(
    authorizing: Identifier,
    next: Identifier[],
    epoch: number,
  ): Promise<number> {
    await this.#messenger.call(
      'MfaRecoveryController:updateIdentifiers',
      authorizing,
      next,
      epoch,
    );
    const { epoch: newEpoch } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    return newEpoch;
  }

  #seedlessState() {
    return this.#messenger.call('SeedlessOnboardingController:getState');
  }
}

function randomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function isIdentifierEnrolled(
  enrolledIdentifiers: readonly Identifier[],
  candidate: Identifier,
): boolean {
  return enrolledIdentifiers.some((enrolled) =>
    candidate.type === 'passkey'
      ? isSameIdentifier(enrolled, candidate)
      : enrolled.type === candidate.type,
  );
}

/** Reuses Auth's copy of an enrolled identifier, which keeps its verifier. */
function withAuthCopies(
  identifiers: readonly Identifier[],
  authIdentifiers: readonly Identifier[],
): Identifier[] {
  return identifiers.map(
    (identifier) =>
      authIdentifiers.find((authIdentifier) =>
        isSameIdentifier(authIdentifier, identifier),
      ) ?? identifier,
  );
}

/** SIWE authorizes without a platform sheet, so it is preferred. */
function pickAuthorizingIdentifier(
  identifiers: readonly Identifier[],
): Identifier {
  const authorizing =
    identifiers.find((identifier) => identifier.type === 'siwe') ??
    identifiers[0];
  if (authorizing === undefined) {
    throw new MfaRecoveryControllerError(
      'Cubist has no enrolled identifier to authorize with',
      'no_enrolled_identifier',
    );
  }
  return authorizing;
}
