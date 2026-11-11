import type {
  Identifier,
  RecoveryIdentifiers,
} from '@metamask/mfa-recovery-controller';
import {
  createSiweIdentifier,
  createSocialIdentifier,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import { MfaRecoveryControllerError } from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import type { MfaRecoverySetupDependencies } from './runMfaRecoverySetup';

/** The identifier types the dev screen manages, in the order they are added. */
export const CUBIST_IDENTIFIER_TYPES = ['siwe', 'passkey', 'social'] as const;
export type CubistIdentifierType = (typeof CUBIST_IDENTIFIER_TYPES)[number];

/** Cubist rejects identifier sets smaller than this. */
export const MIN_CUBIST_IDENTIFIERS = 2;

export type CubistIdentifierStep =
  | 'verifying_mfa'
  | 'resuming_pending_operation'
  | 'loading_cubist_identifiers'
  | 'updating_identifiers'
  | 'completed';

export interface CubistIdentifierChangeResult {
  identifierType: string;
  change: 'added' | 'removed';
  epoch: number;
}

/** The next identifier type to add, and the identifier to add for it. */
export interface MissingCubistIdentifier {
  type: CubistIdentifierType;
  /** Undefined when nothing can supply this type, such as Auth having no passkey. */
  identifier: Identifier | undefined;
}

type CubistIdentifierDependencies = Pick<
  MfaRecoverySetupDependencies,
  'controller' | 'address' | 'verifyMfa'
> & {
  seedless: { state: { authConnection?: string; userId?: string } };
};

export function isSameIdentifier(a: Identifier, b: Identifier): boolean {
  return (
    a.type === b.type && a.namespace === b.namespace && a.value === b.value
  );
}

/**
 * Returns the identifier each type would be enrolled with. Auth's identifiers
 * win; SIWE falls back to the primary account and social to the seedless login,
 * since Auth does not always return them.
 */
export function getCandidateIdentifiers(
  authIdentifiers: readonly Identifier[],
  address: string,
  seedlessState: { authConnection?: string; userId?: string },
): Partial<Record<CubistIdentifierType, Identifier>> {
  const fromAuth = (type: CubistIdentifierType) =>
    authIdentifiers.find((identifier) => identifier.type === type);
  let socialIdentifier = fromAuth('social');
  if (socialIdentifier === undefined) {
    try {
      socialIdentifier = createSocialIdentifier(seedlessState);
    } catch {
      socialIdentifier = undefined;
    }
  }
  return {
    siwe:
      fromAuth('siwe') ?? (address ? createSiweIdentifier(address) : undefined),
    passkey: fromAuth('passkey'),
    social: socialIdentifier,
  };
}

/**
 * Picks the first identifier type not yet enrolled in Cubist, preferring one
 * that has an identifier to add.
 *
 * @returns The missing type, or undefined when every type is enrolled.
 */
export function findMissingCubistIdentifier(
  enrolled: readonly Identifier[],
  candidates: Partial<Record<CubistIdentifierType, Identifier>>,
): MissingCubistIdentifier | undefined {
  const missing = CUBIST_IDENTIFIER_TYPES.filter(
    (type) => !enrolled.some((identifier) => identifier.type === type),
  ).map((type) => ({ type, identifier: candidates[type] }));
  return (
    missing.find(({ identifier }) => identifier !== undefined) ?? missing[0]
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

async function loadForMutation(
  dependencies: CubistIdentifierDependencies,
  onStep: (step: CubistIdentifierStep) => void,
): Promise<RecoveryIdentifiers> {
  const { controller } = dependencies;
  onStep('verifying_mfa');
  await dependencies.verifyMfa();
  if ((await controller.getPhase()) !== 'idle') {
    onStep('resuming_pending_operation');
    await controller.resume();
  }
  onStep('loading_cubist_identifiers');
  return await controller.getIdentifiers();
}

/** Adds the first identifier type missing from Cubist. */
export async function runAddCubistIdentifier(
  dependencies: CubistIdentifierDependencies,
  onStep: (step: CubistIdentifierStep) => void = () => undefined,
): Promise<CubistIdentifierChangeResult> {
  const { controller } = dependencies;
  const { identifiers, epoch, authIdentifiers } = await loadForMutation(
    dependencies,
    onStep,
  );
  const missing = findMissingCubistIdentifier(
    identifiers,
    getCandidateIdentifiers(
      authIdentifiers,
      dependencies.address,
      dependencies.seedless.state,
    ),
  );
  if (missing === undefined) {
    throw new MfaRecoveryControllerError(
      'Every identifier type is already enrolled in Cubist',
      'all_identifiers_enrolled',
    );
  }
  if (missing.identifier === undefined) {
    throw new MfaRecoveryControllerError(
      `No ${missing.type} identifier is available to add`,
      'identifier_unavailable',
    );
  }

  onStep('updating_identifiers');
  const current = withAuthCopies(identifiers, authIdentifiers);
  await controller.updateIdentifiers(
    pickAuthorizingIdentifier(current),
    [...current, missing.identifier],
    epoch,
  );
  const { epoch: newEpoch } = await controller.getIdentifiers();
  onStep('completed');
  return { identifierType: missing.type, change: 'added', epoch: newEpoch };
}

/** Removes one enrolled identifier, keeping at least two in Cubist. */
export async function runRemoveCubistIdentifier(
  dependencies: CubistIdentifierDependencies,
  target: Identifier,
  onStep: (step: CubistIdentifierStep) => void = () => undefined,
): Promise<CubistIdentifierChangeResult> {
  const { controller } = dependencies;
  const { identifiers, epoch, authIdentifiers } = await loadForMutation(
    dependencies,
    onStep,
  );
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

  onStep('updating_identifiers');
  await controller.updateIdentifiers(
    pickAuthorizingIdentifier(remaining),
    remaining,
    epoch,
  );
  const { epoch: newEpoch } = await controller.getIdentifiers();
  onStep('completed');
  return { identifierType: target.type, change: 'removed', epoch: newEpoch };
}
