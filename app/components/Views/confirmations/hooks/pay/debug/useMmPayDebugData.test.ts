import { SolScope } from '@metamask/keyring-api';
import type {
  MetamaskPaySolanaExecution,
  MetamaskPaySource,
} from '@metamask/transaction-controller';
import type { SolanaPaySupportDiagnostics } from '@metamask/transaction-pay-controller';

import { getSolanaPaySupportDiagnosticsForTransaction } from './useMmPayDebugData';

const TRANSACTION_ID = 'transaction-id';
const SOLANA_SOURCE = {
  sourceAccountId: `${SolScope.Mainnet}:account`,
  sourceAssetId: `${SolScope.Mainnet}/slip44:501`,
} as MetamaskPaySource;
const SOLANA_EXECUTION: MetamaskPaySolanaExecution = {
  atomicProductActionIncluded: true,
  atomicProductActionRequired: true,
  followUpStatus: 'not-required',
  notificationStatus: 'success',
  phase: 'submitted',
  relayStatus: 'refund',
  requestId: 'relay-request-id',
  requiresNonAtomicFollowUp: false,
  sourceAmountRaw: '1',
  sourceChainId: SolScope.Mainnet,
  sourceStatus: 'confirmed',
  sourceTransactionId: 'solana-signature',
  sourceWalletAccountId: 'wallet-account-id',
};

describe('getSolanaPaySupportDiagnosticsForTransaction', () => {
  it('returns Core privacy-safe diagnostics for Solana execution metadata', () => {
    const diagnostics: SolanaPaySupportDiagnostics = {
      errorCode: 'settlement_refunded',
      followUpStatus: 'not-required',
      followUpTransactionIdPresent: false,
      notificationStatus: 'success',
      outcome: 'refunded',
      phase: 'submitted',
      provider: 'relay',
      relayStatus: 'refund',
      requestIdPresent: true,
      sourceAssetClass: 'native',
      sourceStatus: 'confirmed',
      sourceTransactionIdPresent: true,
      targetTransactionIdPresent: false,
    };
    const controller = {
      getSolanaPaySupportDiagnostics: jest.fn().mockReturnValue(diagnostics),
    };

    const result = getSolanaPaySupportDiagnosticsForTransaction(
      TRANSACTION_ID,
      SOLANA_SOURCE,
      SOLANA_EXECUTION,
      controller,
    );

    expect(controller.getSolanaPaySupportDiagnostics).toHaveBeenCalledWith(
      TRANSACTION_ID,
    );
    expect(result).toBe(diagnostics);
  });

  it('omits support diagnostics without Solana execution metadata', () => {
    const controller = {
      getSolanaPaySupportDiagnostics: jest.fn(),
    };

    const result = getSolanaPaySupportDiagnosticsForTransaction(
      TRANSACTION_ID,
      SOLANA_SOURCE,
      undefined,
      controller,
    );

    expect(controller.getSolanaPaySupportDiagnostics).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
