import type {
  KeyringControllerGetStateAction,
  KeyringControllerWithKeyringV2UnsafeAction,
} from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import type {
  Identifier,
  MfaRecoveryControllerAbortAction,
  MfaRecoveryControllerAuthenticateIdentifierAction,
  MfaRecoveryControllerGetIdentifiersAction,
  MfaRecoveryControllerGetPhaseAction,
  MfaRecoveryControllerGetRecoverySecretAction,
  MfaRecoveryControllerRegisterAction,
  MfaRecoveryControllerResumeAction,
  MfaRecoveryControllerUpdateIdentifiersAction,
  RecoveryIdentifiers,
} from '@metamask/mfa-recovery-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { MfaApproval } from '@metamask/profile-sync-controller/sdk';
import type {
  SecretMetadata,
  SeedlessOnboardingControllerAuthenticateForRecoveryAction,
  SeedlessOnboardingControllerGetAccessTokenAction,
  SeedlessOnboardingControllerGetStateAction,
  SeedlessOnboardingControllerMigrateToEnvelopeAction,
  SeedlessOnboardingControllerRecoverWithRecoverySecretAction,
  SeedlessOnboardingControllerResetPasswordWithVaultKeysAction,
  SeedlessOnboardingControllerRunMigrationsAction,
  SeedlessOnboardingControllerSetLocalPasswordAction,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex } from '@metamask/utils';
import { authEnv } from '../../apiEnv';
import { createSiweIdentifier } from '../../Engine/controllers/mfa-recovery-controller/auth/identifiers';
import {
  isProvablePasskeyIdentifier,
  withPasskeyVerifier,
} from '../../Engine/controllers/mfa-recovery-controller/auth/passkey-identifier-auth-provider';
import {
  getCubistConfig,
  getToprfRecoveryConfig,
} from '../../Engine/controllers/mfa-recovery-controller/config';
import { RECOVERY_SECRET_LENGTH } from '../../Engine/controllers/mfa-recovery-controller/constants';
import {
  createSrpSiweSigner,
  getPrimarySrpSeed,
  type SiweSigner,
} from '../../Engine/controllers/mfa-recovery-controller/auth/srp-siwe-signer';
import { MfaRecoveryControllerError } from '../../Engine/controllers/mfa-recovery-controller/errors';
import { linkSocialLogin } from '../social-login/link-social-login';
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
  type MfaRecoveryStatus,
  type MfaRecoverySetupResult,
} from './recovery-setup';

const SERVICE_NAME = 'MfaRecoveryService';

const APPROVAL_REQUEST_HASH_LENGTH = 32;

type AllowedActions =
  | AuthenticationController.AuthenticationControllerGetVerificationTokenAction
  | AuthenticationController.AuthenticationControllerRequestMfaApprovalAction
  | KeyringControllerGetStateAction
  | KeyringControllerWithKeyringV2UnsafeAction
  | MfaRecoveryControllerAuthenticateIdentifierAction
  | MfaRecoveryControllerGetIdentifiersAction
  | MfaRecoveryControllerGetPhaseAction
  | MfaRecoveryControllerGetRecoverySecretAction
  | MfaRecoveryControllerRegisterAction
  | MfaRecoveryControllerResumeAction
  | MfaRecoveryControllerUpdateIdentifiersAction
  | SeedlessOnboardingControllerAuthenticateForRecoveryAction
  | SeedlessOnboardingControllerGetAccessTokenAction
  | SeedlessOnboardingControllerGetStateAction
  | SeedlessOnboardingControllerMigrateToEnvelopeAction
  | SeedlessOnboardingControllerRecoverWithRecoverySecretAction
  | SeedlessOnboardingControllerResetPasswordWithVaultKeysAction
  | SeedlessOnboardingControllerRunMigrationsAction
  | SeedlessOnboardingControllerSetLocalPasswordAction;

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
  readonly #messenger: MfaRecoveryServiceMessenger;

  readonly #options: MfaRecoveryServiceOptions;

  #verification?: Promise<void>;

  readonly #siweSigner: SiweSigner;

  #prepared?: Promise<PreparedRun>;

  constructor(options: MfaRecoveryServiceOptions) {
    this.#messenger = options.messenger;
    this.#options = options;
    this.#siweSigner = createSrpSiweSigner({
      getSeed: async () =>
        await getPrimarySrpSeed({
          getState: () => this.#messenger.call('KeyringController:getState'),
          withKeyringV2Unsafe: (selector, operation) =>
            this.#messenger.call(
              'KeyringController:withKeyringV2Unsafe',
              selector,
              operation,
            ),
        }),
    });
  }

  /**
   * The address of the primary SRP's message-signing key, which SIWE
   * identifiers use.
   */
  async getSiweAddress(): Promise<string> {
    return await this.#siweSigner.getAddress();
  }

  /** EIP-191 `personal_sign` of `message` with the SIWE signing key. */
  async signSiweMessage(message: string): Promise<string> {
    return await this.#siweSigner.signMessage(message);
  }

  /** Recovery is set up once the vault is envelope-managed. */
  getStatus(): MfaRecoveryStatus {
    return getMfaRecoveryStatus(this.#seedlessState());
  }

  /** Whether Cubist already has an identifier of `type` enrolled. */
  async hasEnrolledIdentifier(type: Identifier['type']): Promise<boolean> {
    const { identifiers } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    return identifiers.some((identifier) => identifier.type === type);
  }

  /** Decrypts the seed phrases with the Recovery Secret. */
  async recoverWithRecoverySecret(
    recoverySecret: Uint8Array,
  ): Promise<SecretMetadata[]> {
    return await this.#messenger.call(
      'SeedlessOnboardingController:recoverWithRecoverySecret',
      { recoverySecret },
    );
  }

  /** Sets the password that unlocks the wallet on this device. */
  async setLocalPassword(password: string): Promise<void> {
    await this.#messenger.call(
      'SeedlessOnboardingController:setLocalPassword',
      {
        password,
      },
    );
  }

  /** Makes `newPassword` the global password, using the recovered vault keys. */
  async resetGlobalPassword(newPassword: string): Promise<void> {
    await this.#messenger.call(
      'SeedlessOnboardingController:resetPasswordWithVaultKeys',
      { newPassword },
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
   * Picks the identifier to read the Recovery Secret with: an enrolled passkey
   * Auth approved, else the enrolled social login when it can be proven. Runs
   * while the wallet is locked, so it does not verify the user.
   *
   * @returns The identifier, or `null` when recovery is not set up for one.
   */
  async findRecoveryIdentifier({
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
    const messenger = this.#messenger;
    if (this.#seedlessState().envelope) {
      return 'already_enabled';
    }

    const { address, authIdentifiers: approved } = await this.#prepare();
    let authIdentifiers = approved;
    if (!findSocialIdentifier(authIdentifiers, this.#seedlessState())) {
      await this.#linkSocialLogin();
      authIdentifiers = await this.getAuthIdentifiers();
    }
    const { siweIdentifier } = toRunIdentifiers(authIdentifiers, address);
    const registrationIdentifiers = getRegistrationIdentifiers(
      authIdentifiers,
      siweIdentifier,
      identifiers,
      this.#seedlessState(),
    );

    let recoverySecret = new Uint8Array(0);
    try {
      const { epoch } = await messenger.call(
        'MfaRecoveryController:getIdentifiers',
      );
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
        await messenger.call(
          'MfaRecoveryController:register',
          recoverySecret,
          registrationIdentifiers,
        );
      }

      await this.openRecoverySession();
      // migrateToEnvelope rejects vaults whose data types are not migrated yet.
      // runMigrations is a no-op once they are.
      await messenger.call('SeedlessOnboardingController:runMigrations');
      await messenger.call('SeedlessOnboardingController:migrateToEnvelope', {
        recoverySecret,
      });
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
    await linkSocialLogin({
      env: authEnv(),
      seedlessState: this.#seedlessState(),
      getSocialAccessToken: () =>
        messenger.call('SeedlessOnboardingController:getAccessToken'),
      getVerifiedAccessToken: () =>
        messenger.call('AuthenticationController:getVerificationToken')
          ?.accessToken,
      verifierId,
    });
  }

  /**
   * Returns the identifier each type would be added with. Auth's identifiers
   * win, with fallbacks to the SRP signing key and the seedless login.
   */
  async getCandidateIdentifiers(): Promise<
    Partial<Record<CubistIdentifierType, Identifier>>
  > {
    const { authIdentifiers } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    return getCandidateIdentifiers(
      authIdentifiers,
      await this.getSiweAddress(),
      this.#seedlessState(),
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
    await this.#messenger.call(
      'MfaRecoveryController:updateIdentifiers',
      pickAuthorizingIdentifier(current),
      [...current, identifier],
      epoch,
    );
    const { epoch: newEpoch } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
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
    if (remaining.length < MIN_CUBIST_IDENTIFIERS) {
      throw new MfaRecoveryControllerError(
        `Cubist needs at least ${MIN_CUBIST_IDENTIFIERS} identifiers`,
        'too_few_identifiers',
      );
    }

    await this.#messenger.call(
      'MfaRecoveryController:updateIdentifiers',
      pickAuthorizingIdentifier(remaining),
      remaining,
      epoch,
    );
    const { epoch: newEpoch } = await this.#messenger.call(
      'MfaRecoveryController:getIdentifiers',
    );
    return { identifierType: target.type, change: 'removed', epoch: newEpoch };
  }

  /**
   * Resolves the run's SIWE address and Auth identifiers once per instance, so
   * `prepareRun` followed by `setUp` resumes and reads only once. A failed
   * attempt is not cached, so a retry runs again.
   */
  #prepare(): Promise<PreparedRun> {
    this.#prepared ??= this.#runPrepare().catch((error: unknown) => {
      this.#prepared = undefined;
      throw error;
    });
    return this.#prepared;
  }

  async #runPrepare(): Promise<PreparedRun> {
    const address = await this.getSiweAddress();
    await this.verifyMfa();
    await this.#resumePendingOperation();
    return { address, authIdentifiers: await this.getAuthIdentifiers() };
  }

  async #linkSocialLogin(): Promise<void> {
    const email =
      (await this.#options.getSocialLinkEmail?.())?.trim() || undefined;
    await this.linkSocialLogin(email);
  }

  async #requestApproval(
    audiences: string[],
    includeIdentifiers: boolean,
  ): Promise<MfaApproval> {
    return await this.#messenger.call(
      'AuthenticationController:requestMfaApproval',
      {
        requestHash: bytesToHex(randomBytes(APPROVAL_REQUEST_HASH_LENGTH)),
        audiences,
        requireVerification: true,
        includeIdentifiers,
        reason: { operation: this.#options.approvalOperation },
      },
    );
  }

  async #resumePendingOperation(): Promise<void> {
    if (
      (await this.#messenger.call('MfaRecoveryController:getPhase')) !== 'idle'
    ) {
      await this.#messenger.call('MfaRecoveryController:resume');
    }
  }

  async #loadForMutation(): Promise<RecoveryIdentifiers> {
    await this.verifyMfa();
    await this.#resumePendingOperation();
    return await this.#messenger.call('MfaRecoveryController:getIdentifiers');
  }

  #seedlessState() {
    return this.#messenger.call('SeedlessOnboardingController:getState');
  }
}

function randomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function toRunIdentifiers(
  authIdentifiers: readonly Identifier[],
  siweAddress: string,
): MfaRecoveryRunIdentifiers {
  return {
    // Auth only approves non-SIWE identifiers; SIWE is proven by the wallet
    // signature, so fall back to the SRP signing key's identifier.
    siweIdentifier:
      authIdentifiers.find((identifier) => identifier.type === 'siwe') ??
      createSiweIdentifier(siweAddress),
    // Lazy: a run that uses SIWE must not fail when no passkey is approved.
    get passkeyIdentifier(): Identifier {
      return findAuthIdentifier(authIdentifiers, 'passkey');
    },
  };
}

/** The run's SIWE address and the identifiers Auth approved for it. */
interface PreparedRun {
  address: string;
  authIdentifiers: Identifier[];
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

/** Picks the identifier of the given type that Auth approved for this profile. */
function findAuthIdentifier(
  identifiers: readonly Identifier[],
  type: Identifier['type'],
): Identifier {
  const identifier = identifiers.find((candidate) => candidate.type === type);
  if (identifier === undefined) {
    throw new IdentifierNotApprovedError(type);
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
