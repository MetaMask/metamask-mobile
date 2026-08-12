import { TransactionMeta } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../../../../reducers';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { selectTransactionDataByTransactionId } from '../../../../../../selectors/transactionPayController';
import { selectConfirmationMetricsById } from '../../../../../../core/redux/slices/confirmationMetrics';
import { useMmPayFlagsDebug } from './useMmPayFlagsDebug';

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
}

export interface MmPayDebugData {
  sections: MmPayDebugSection[];
  copyAllPayload: MmPayDebugCopyAllPayload;
}

export function useMmPayDebugData(): MmPayDebugData {
  const transactionMeta = useTransactionMetadataRequest();
  const txId = transactionMeta?.id ?? '';
  const transactionType = transactionMeta?.type;

  const transactionPay = useSelector((state: RootState) =>
    selectTransactionDataByTransactionId(state, txId),
  );

  const mmPayFlags = useMmPayFlagsDebug(transactionType);

  const transactionMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, txId),
  );

  const sections: MmPayDebugSection[] = [
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
  };

  return { sections, copyAllPayload };
}
