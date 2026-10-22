import {
  TransactionMeta,
  type MetamaskPaySolanaExecution,
  type MetamaskPaySource,
} from '@metamask/transaction-controller';
import type { SolanaPaySupportDiagnostics } from '@metamask/transaction-pay-controller';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../../../../reducers';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { selectTransactionDataByTransactionId } from '../../../../../../selectors/transactionPayController';
import { selectConfirmationMetricsById } from '../../../../../../core/redux/slices/confirmationMetrics';
import { isSolanaPaySource } from '../../../../../../util/transactions/solana-pay';
import { useMmPayFlagsDebug } from './useMmPayFlagsDebug';
import Engine from '../../../../../../core/Engine';

export interface MmPayDebugSection {
  key: string;
  title: string;
  value: unknown;
}

export interface MmPayDebugCopyAllPayload {
  transactionMeta: TransactionMeta | undefined;
  transactionPay: unknown;
  mmPayFlags: unknown;
  transactionMetrics: unknown;
  solanaPaySupportDiagnostics: SolanaPaySupportDiagnostics | undefined;
}

export interface MmPayDebugData {
  sections: MmPayDebugSection[];
  copyAllPayload: MmPayDebugCopyAllPayload;
}

interface SolanaPayDiagnosticsController {
  getSolanaPaySupportDiagnostics: (
    transactionId: string,
  ) => SolanaPaySupportDiagnostics;
}

export function getSolanaPaySupportDiagnosticsForTransaction(
  transactionId: string,
  source: MetamaskPaySource | undefined,
  execution: MetamaskPaySolanaExecution | undefined,
  controller: SolanaPayDiagnosticsController,
): SolanaPaySupportDiagnostics | undefined {
  return isSolanaPaySource(source) && execution
    ? controller.getSolanaPaySupportDiagnostics(transactionId)
    : undefined;
}

export function useMmPayDebugData(): MmPayDebugData {
  const transactionMeta = useTransactionMetadataRequest();
  const txId = transactionMeta?.id ?? '';
  const transactionType = transactionMeta?.type;

  const transactionPay = useSelector((state: RootState) =>
    selectTransactionDataByTransactionId(state, txId),
  );
  const solanaPaySupportDiagnostics =
    getSolanaPaySupportDiagnosticsForTransaction(
      txId,
      transactionMeta?.metamaskPay?.source,
      transactionMeta?.metamaskPay?.solanaExecution,
      Engine.context.TransactionPayController,
    );

  const mmPayFlags = useMmPayFlagsDebug(transactionType);

  const transactionMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, txId),
  );

  const sections: MmPayDebugSection[] = [
    {
      key: 'solanaPaySupportDiagnostics',
      title: 'Solana Pay Support Diagnostics',
      value: solanaPaySupportDiagnostics,
    },
    {
      key: 'transactionPay',
      title: 'TransactionPay State',
      value: transactionPay,
    },
    {
      key: 'transactionMeta',
      title: 'Transaction Meta',
      value: transactionMeta,
    },
    { key: 'mmPayFlags', title: 'MMPay Feature Flags', value: mmPayFlags },
    {
      key: 'transactionMetrics',
      title: 'Available MMPay Metrics',
      value: transactionMetrics,
    },
  ];

  const copyAllPayload: MmPayDebugCopyAllPayload = {
    transactionMeta,
    transactionPay,
    mmPayFlags,
    transactionMetrics,
    solanaPaySupportDiagnostics,
  };

  return { sections, copyAllPayload };
}
