import type { MetamaskPaySolanaExecution } from '@metamask/transaction-controller';
import { strings } from '../../../../locales/i18n';
import { getSolanaPayStatusLabel } from './solana-pay-status';

function buildExecution(
  overrides: Partial<MetamaskPaySolanaExecution>,
): MetamaskPaySolanaExecution {
  return {
    atomicProductActionIncluded: true,
    atomicProductActionRequired: true,
    followUpStatus: 'not-required',
    notificationStatus: 'success',
    phase: 'submitted',
    relayStatus: 'pending',
    requestId: 'relay-request-id',
    requiresNonAtomicFollowUp: false,
    sourceAmountRaw: '1',
    sourceChainId: 'solana:mainnet',
    sourceStatus: 'pending',
    sourceTransactionId: 'solana-signature',
    sourceWalletAccountId: 'wallet-account-id',
    ...overrides,
  } as MetamaskPaySolanaExecution;
}

describe('getSolanaPayStatusLabel', () => {
  it('labels ambiguous source observation as status unavailable', () => {
    const result = getSolanaPayStatusLabel(
      buildExecution({ phase: 'unknown', sourceStatus: 'unknown' }),
    );

    expect(result).toBe(strings('confirm.solana_pay.status_unavailable'));
  });

  it('labels a Relay refund distinctly from failure', () => {
    const result = getSolanaPayStatusLabel(
      buildExecution({ relayStatus: 'refund' }),
    );

    expect(result).toBe(strings('confirm.solana_pay.refunded'));
  });

  it('uses the parent lifecycle label for successful settlement', () => {
    const result = getSolanaPayStatusLabel(
      buildExecution({ relayStatus: 'success', sourceStatus: 'confirmed' }),
    );

    expect(result).toBeUndefined();
  });
});
