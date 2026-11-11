import type { CubistEscrowProvider } from '@metamask/mfa-recovery-controller';

// TEMPORARY DIAGNOSTIC: the controller drops applyMutation errors and only
// reports incomplete_mutation. Never log the arguments; they carry tokens.
let lastApplyMutationFailure: string | undefined;

/**
 * TEMPORARY DIAGNOSTIC: the last escrow applyMutation error, which the
 * controller otherwise collapses into incomplete_mutation.
 *
 * @returns The error summary, or undefined if the last call succeeded.
 */
export function getLastApplyMutationFailure(): string | undefined {
  return lastApplyMutationFailure;
}

/**
 * Wraps the escrow's applyMutation to record and log its failure. Escrows
 * without applyMutation (for example test doubles) are left unchanged.
 *
 * @param escrow - The escrow to wrap, in place.
 */
export function withApplyMutationDiagnostics(escrow: CubistEscrowProvider) {
  if (typeof escrow.applyMutation !== 'function') {
    return;
  }
  const applyMutation = escrow.applyMutation.bind(escrow);
  escrow.applyMutation = async (...args: Parameters<typeof applyMutation>) => {
    lastApplyMutationFailure = undefined;
    try {
      return await applyMutation(...args);
    } catch (error) {
      const details = error as Error & { code?: unknown; status?: unknown };
      lastApplyMutationFailure = [
        details?.name,
        details?.code,
        details?.status,
        details?.message,
      ]
        .filter((part) => part !== undefined && part !== '')
        .map(String)
        .join(': ');
      console.warn('MFA recovery escrow applyMutation failed', {
        name: details?.name,
        code: details?.code,
        status: details?.status,
        message: details?.message,
      });
      throw error;
    }
  };
}
