/**
 * Re-exports identifier-auth types from `@metamask/mfa-recovery-controller`
 * (local tarball from `cw/test-mfa-controller` / MetaMask/core#10022).
 *
 * `KeyBoundIdentifierToken` is not a public package export, so it is derived
 * from {@link RecoveryIdentifierAuthProvider}.
 */
import type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';

export type { Identifier, RecoveryIdentifierAuthProvider };

export type KeyBoundIdentifierToken = Awaited<
  ReturnType<RecoveryIdentifierAuthProvider['getKeyBoundIdentifierToken']>
>;
