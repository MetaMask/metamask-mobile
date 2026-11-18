import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  createSiweIdentifier,
  createSocialIdentifier,
} from '../../Engine/controllers/mfa-recovery-controller/auth/identifiers';

/** The identifier types recovery manages, in the order they are added. */
export const CUBIST_IDENTIFIER_TYPES = ['siwe', 'passkey', 'social'] as const;
export type CubistIdentifierType = (typeof CUBIST_IDENTIFIER_TYPES)[number];

/** Cubist rejects identifier sets smaller than this. */
export const MIN_CUBIST_IDENTIFIERS = 2;

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
