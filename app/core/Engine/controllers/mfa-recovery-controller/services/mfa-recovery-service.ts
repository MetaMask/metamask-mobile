import type {
  Identifier,
  MfaRecoveryController,
  RecoveryIdentifiers,
} from '@metamask/mfa-recovery-controller';
import type { MfaApproval } from '@metamask/profile-sync-controller/sdk';
import { bytesToHex } from '@metamask/utils';
import { authEnv } from '../../../../apiEnv';
import Engine from '../../../../Engine';
import { linkSocialLogin } from '../../../../MfaRecovery/linkSocialLogin';
import { createSiweIdentifier } from '../auth/identifiers';
import {
  isProvablePasskeyIdentifier,
  withPasskeyVerifier,
} from '../auth/passkey-identifier-auth-provider';
import { getCubistConfig, getToprfRecoveryConfig } from '../config';
import { RECOVERY_SECRET_LENGTH } from '../constants';
import { MfaRecoveryControllerError } from '../errors';
import {
  getCandidateIdentifiers,
  isSameIdentifier,
  MIN_CUBIST_IDENTIFIERS,
  type CubistIdentifierChangeResult,
  type CubistIdentifierType,
} from './recovery-identifiers';
import {
  findSocialIdentifier,
  getMfaRecoveryStatus,
  getRegistrationIdentifiers,
  type MfaRecoverySeedless,
  type MfaRecoveryStatus,
  type MfaRecoverySetupResult,
} from './recovery-setup';

const APPROVAL_REQUEST_HASH_LENGTH = 32;

export interface MfaRecoveryServiceOptions {
  /** Starts the verification session recovery approvals require. */
  verifyMfa: () => Promise<void>;
  /** The MFA reason the recovery approvals are requested for. */
  approvalOperation: string;
}

/** The identifiers a run reads and writes with. */
export interface MfaRecoveryRunIdentifiers {
  siweIdentifier: Identifier;
  /** The passkey Auth approved; proven with the platform passkey sheet. */
  passkeyIdentifier: Identifier;
}

export interface FindRecoveryIdentifierOptions {
  /** Whether the social provider can issue a nonce-bound ID token. */
  canProveSocialIdentifier: boolean;
}

/**
 * Runs MFA recovery flows against the escrow and the TOPRF nodes. One instance
 * serves one run of a flow: `verifyMfa` and `approvalOperation` tie it to how
 * that run proves the user, and its verification session lasts as long as the
 * instance.
 */
export class MfaRecoveryService {
  readonly #options: MfaRecoveryServiceOptions;

  #verification?: Promise<void>;

  constructor(options: MfaRecoveryServiceOptions) {
    this.#options = options;
  }

  get mfaRecoveryController(): MfaRecoveryController {
    return Engine.context.MfaRecoveryController;
  }

  get seedlessOnboardingController(): MfaRecoverySeedless {
    return Engine.context.SeedlessOnboardingController;
  }

  /** The primary account; recovery proves SIWE with it. */
  get address(): string {
    return (
      Engine.context.KeyringController.state.keyrings[0]?.accounts?.[0] ?? ''
    );
  }

  /** Recovery is set up once the vault is envelope-managed. */
  getStatus(): MfaRecoveryStatus {
    return getMfaRecoveryStatus(this.seedlessOnboardingController.state);
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
    const { approval } = await this.#requestApproval(
      [getToprfRecoveryConfig().aal2Audience],
      false,
    );
    return approval;
  }

  /** Returns the recovery identifiers Auth holds for the canonical profile. */
  async getAuthIdentifiers(): Promise<Identifier[]> {
    const { identifiers = [] } = await this.#requestApproval(
      [getCubistConfig().authAudience],
      true,
    );
    return identifiers;
  }

  /**
   * Verifies the user, resumes any pending escrow operation, and resolves the
   * identifiers a recovery run uses.
   */
  async prepareRun(): Promise<MfaRecoveryRunIdentifiers> {
    const { address, authIdentifiers } = await this.#prepare();
    return toRunIdentifiers(authIdentifiers, address);
  }

  /**
   * Authenticates the identifier and reads the Recovery Secret from the
   * escrow. The caller owns the returned secret and must zero it.
   */
  async readRecoverySecret(
    identifier: Identifier,
  ): Promise<{ epoch: number; recoverySecret: Uint8Array }> {
    const identifierSession =
      await this.mfaRecoveryController.authenticateIdentifier(identifier);
    const { epoch, recoverySecret } =
      await this.mfaRecoveryController.getRecoverySecret(identifierSession);
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
    await this.seedlessOnboardingController.authenticateForRecovery({
      aal2Token,
      authConnectionId,
      groupedAuthConnectionId,
    });
  }

  /**
   * Picks the identifier to read the Recovery Secret with: an enrolled passkey
   * Auth approved, else the enrolled social login when it can be proven. Runs
   * while the wallet is locked, so it does not verify the user.
   *
   * @returns The identifier, or `null` when recovery is not set up for one.
   */
  async findRecoveryIdentifier({
    canProveSocialIdentifier,
  }: FindRecoveryIdentifierOptions): Promise<Identifier | null> {
    const { identifiers, authIdentifiers } =
      await this.mfaRecoveryController.getIdentifiers();
    // Auth's copy carries the verifier (RP ID, credential ID) the proof needs.
    const approved = identifiers.flatMap((enrolled) => {
      const authIdentifier = authIdentifiers.find((candidate) =>
        isSameIdentifier(candidate, enrolled),
      );
      return authIdentifier ? [authIdentifier] : [];
    });

    const passkey = approved
      .map(withPasskeyVerifier)
      .find(isProvablePasskeyIdentifier);
    if (passkey) {
      return passkey;
    }
    if (canProveSocialIdentifier) {
      return (
        approved.find((identifier) => identifier.type === 'social') ?? null
      );
    }
    return null;
  }

  /**
   * Prepares the unlocked social wallet for passwordless recovery: registers
   * one Recovery Secret for SIWE, Auth's social identifier, and `identifiers`,
   * then seals the vault with it. The current password still unlocks the
   * wallet. Does nothing when the vault is already sealed.
   */
  async setUp(
    identifiers: readonly Identifier[] = [],
  ): Promise<MfaRecoverySetupResult> {
    const { seedlessOnboardingController, mfaRecoveryController } = this;
    if (seedlessOnboardingController.state.envelope) {
      return 'already_enabled';
    }

    const { address, authIdentifiers: approved } = await this.#prepare();
    let authIdentifiers = approved;
    if (
      !findSocialIdentifier(authIdentifiers, seedlessOnboardingController.state)
    ) {
      await this.#linkSocialLogin();
      authIdentifiers = await this.getAuthIdentifiers();
    }
    const { siweIdentifier } = toRunIdentifiers(authIdentifiers, address);
    const registrationIdentifiers = getRegistrationIdentifiers(
      authIdentifiers,
      siweIdentifier,
      identifiers,
      seedlessOnboardingController.state,
    );

    // A failed attempt leaves an authorizing mutation. Drop it before retrying.
    await mfaRecoveryController.abort();

    let recoverySecret = new Uint8Array(0);
    try {
      const { epoch } = await mfaRecoveryController.getIdentifiers();
      if (epoch > 0) {
        // A previous attempt already stored the secret. Registering again asks
        // for version 1, which Cubist rejects.
        const passkey = identifiers.find(
          (identifier) => identifier.type === 'passkey',
        );
        if (!passkey) {
          throw new MfaRecoveryControllerError(
            'No passkey was given to read the registered Recovery Secret with',
            'passkey_not_enrolled',
          );
        }
        ({ recoverySecret } = await this.readRecoverySecret(
          withPasskeyVerifier(passkey),
        ));
      } else {
        recoverySecret = this.createRecoverySecret();
        await mfaRecoveryController.register(
          recoverySecret,
          registrationIdentifiers,
        );
      }

      await this.openRecoverySession();
      // migrateToEnvelope rejects vaults whose data types are not migrated yet.
      // runMigrations is a no-op once they are.
      await seedlessOnboardingController.runMigrations();
      await seedlessOnboardingController.migrateToEnvelope({ recoverySecret });
      return 'enabled';
    } finally {
      recoverySecret.fill(0);
    }
  }

  /**
   * Returns the identifier each type would be added with. Auth's identifiers
   * win, with fallbacks to the primary account and the seedless login.
   */
  async getCandidateIdentifiers(): Promise<
    Partial<Record<CubistIdentifierType, Identifier>>
  > {
    const { authIdentifiers } =
      await this.mfaRecoveryController.getIdentifiers();
    return getCandidateIdentifiers(
      authIdentifiers,
      this.address,
      this.seedlessOnboardingController.state,
    );
  }

  /**
   * Adds an identifier to Cubist. Rejects with `identifier_already_enrolled`
   * when Cubist already has an identifier of its type.
   */
  async addIdentifier(
    identifier: Identifier,
  ): Promise<CubistIdentifierChangeResult> {
    const { identifiers, epoch, authIdentifiers } =
      await this.#loadForMutation();
    if (identifiers.some((enrolled) => enrolled.type === identifier.type)) {
      throw new MfaRecoveryControllerError(
        `The ${identifier.type} identifier is already enrolled in Cubist`,
        'identifier_already_enrolled',
      );
    }

    const current = withAuthCopies(identifiers, authIdentifiers);
    await this.mfaRecoveryController.updateIdentifiers(
      pickAuthorizingIdentifier(current),
      [...current, identifier],
      epoch,
    );
    const { epoch: newEpoch } =
      await this.mfaRecoveryController.getIdentifiers();
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
    if (remaining.length < MIN_CUBIST_IDENTIFIERS) {
      throw new MfaRecoveryControllerError(
        `Cubist needs at least ${MIN_CUBIST_IDENTIFIERS} identifiers`,
        'too_few_identifiers',
      );
    }

    await this.mfaRecoveryController.updateIdentifiers(
      pickAuthorizingIdentifier(remaining),
      remaining,
      epoch,
    );
    const { epoch: newEpoch } =
      await this.mfaRecoveryController.getIdentifiers();
    return { identifierType: target.type, change: 'removed', epoch: newEpoch };
  }

  async #prepare(): Promise<{
    address: string;
    authIdentifiers: Identifier[];
  }> {
    const { address } = this;
    if (!address) {
      throw new MfaRecoveryControllerError(
        'The primary account is unavailable',
        'primary_account_unavailable',
      );
    }
    await this.verifyMfa();
    await this.#resumePendingOperation();
    return { address, authIdentifiers: await this.getAuthIdentifiers() };
  }

  /** Runs after `verifyMfa`, which provides the token linking needs. */
  async #linkSocialLogin(): Promise<void> {
    const { seedlessOnboardingController } = this;
    await linkSocialLogin({
      env: authEnv(),
      seedlessState: seedlessOnboardingController.state,
      getSocialAccessToken: () => seedlessOnboardingController.getAccessToken(),
      getVerifiedAccessToken: () =>
        Engine.context.AuthenticationController.getVerificationToken()
          ?.accessToken,
    });
  }

  async #requestApproval(
    audiences: string[],
    includeIdentifiers: boolean,
  ): Promise<MfaApproval> {
    return await Engine.context.AuthenticationController.requestMfaApproval({
      requestHash: bytesToHex(randomBytes(APPROVAL_REQUEST_HASH_LENGTH)),
      audiences,
      requireVerification: true,
      includeIdentifiers,
      reason: { operation: this.#options.approvalOperation },
    });
  }

  async #resumePendingOperation(): Promise<void> {
    if ((await this.mfaRecoveryController.getPhase()) !== 'idle') {
      await this.mfaRecoveryController.resume();
    }
  }

  async #loadForMutation(): Promise<RecoveryIdentifiers> {
    await this.verifyMfa();
    await this.#resumePendingOperation();
    return await this.mfaRecoveryController.getIdentifiers();
  }
}

function randomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function toRunIdentifiers(
  authIdentifiers: readonly Identifier[],
  address: string,
): MfaRecoveryRunIdentifiers {
  return {
    // Auth only approves non-SIWE identifiers; SIWE is proven by the wallet
    // signature, so fall back to the primary account's identifier.
    siweIdentifier:
      authIdentifiers.find((identifier) => identifier.type === 'siwe') ??
      createSiweIdentifier(address),
    // Lazy: a run that uses SIWE must not fail when no passkey is approved.
    get passkeyIdentifier(): Identifier {
      return findAuthIdentifier(authIdentifiers, 'passkey');
    },
  };
}

/** Picks the identifier of the given type that Auth approved for this profile. */
function findAuthIdentifier(
  identifiers: readonly Identifier[],
  type: Identifier['type'],
): Identifier {
  const identifier = identifiers.find((candidate) => candidate.type === type);
  if (identifier === undefined) {
    throw new MfaRecoveryControllerError(
      `Auth has no approved ${type} identifier for this profile`,
      'identifier_not_approved',
    );
  }
  return identifier;
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
