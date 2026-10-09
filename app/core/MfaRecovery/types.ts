/**
 * Re-exports identifier-auth types from `@metamask/mfa-recovery-controller`
 * (MetaMask/core#10022).
 *
 * `KeyBoundIdentifierToken` is not a public package export, so it is derived
 * from {@link RecoveryIdentifierAuthProvider}.
 */
export type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';

import type { RecoveryIdentifierAuthProvider } from '@metamask/mfa-recovery-controller';

export type KeyBoundIdentifierToken = Awaited<
  ReturnType<RecoveryIdentifierAuthProvider['getKeyBoundIdentifierToken']>
>;
