import type { MetamaskPaySolanaExecution } from '@metamask/transaction-controller';
import { getSolanaPayOutcome } from './solana-pay';

function buildExecution(
  overrides: Partial<MetamaskPaySolanaExecution>,
): MetamaskPaySolanaExecution {
  return {
    atomicProductActionIncluded: true,
    atomicProductActionRequired: true,
    followUpStatus: 'not-required',
    notificationStatus: 'success',
    phase: 'submitted',
    relayStatus: 'success',
    requestId: 'relay-request-id',
    requiresNonAtomicFollowUp: false,
    sourceAmountRaw: '1',
    sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    sourceStatus: 'confirmed',
    sourceTransactionId: 'solana-signature',
    sourceWalletAccountId: 'wallet-account-id',
    targetChainId: '0xa4b1',
    targetTokenAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    ...overrides,
  } as MetamaskPaySolanaExecution;
}

describe('getSolanaPayOutcome', () => {
  it('returns succeeded once Relay settled and the source is confirmed', () => {
    expect(getSolanaPayOutcome(buildExecution({}))).toBe('succeeded');
  });

  it('returns unknown for an interrupted Money Account follow-up', () => {
    expect(
      getSolanaPayOutcome(
        buildExecution({
          followUpStatus: 'attempting',
          requiresNonAtomicFollowUp: true,
        }),
      ),
    ).toBe('unknown');
  });

  it('stays submitted while a required atomic product action is missing', () => {
    expect(
      getSolanaPayOutcome(
        buildExecution({ atomicProductActionIncluded: false }),
      ),
    ).toBe('submitted');
  });

  it('returns the phase before the source is submitted', () => {
    expect(getSolanaPayOutcome(buildExecution({ phase: 'attempting' }))).toBe(
      'attempting',
    );
  });
});
