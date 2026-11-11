import type { MetamaskPaySolanaExecution } from '@metamask/transaction-controller';
import type { SolanaPayOutcome } from '@metamask/transaction-pay-controller';

export function getSolanaPayOutcome(
  execution: MetamaskPaySolanaExecution,
): SolanaPayOutcome {
  if (execution.phase !== 'submitted') {
    return execution.phase;
  }
  if (execution.sourceStatus === 'failed') {
    return 'source-failed';
  }
  if (execution.relayStatus === 'failure') {
    return 'relay-failed';
  }
  if (execution.relayStatus === 'refund') {
    return 'refunded';
  }
  if (execution.followUpStatus === 'failed') {
    return 'follow-up-failed';
  }
  // Core runs the follow-up inside a single reconcile call, so an observed
  // `attempting` follow-up was interrupted and its outcome cannot be resolved.
  if (
    execution.sourceStatus === 'unknown' ||
    execution.relayStatus === 'unknown' ||
    execution.followUpStatus === 'unknown' ||
    execution.followUpStatus === 'attempting'
  ) {
    return 'unknown';
  }
  if (
    execution.sourceStatus === 'confirmed' &&
    execution.relayStatus === 'success' &&
    (execution.followUpStatus === 'not-required' ||
      execution.followUpStatus === 'confirmed') &&
    (!execution.atomicProductActionRequired ||
      execution.atomicProductActionIncluded)
  ) {
    return 'succeeded';
  }
  return 'submitted';
}
