import { TransactionType } from '@metamask/transaction-controller';

import { useTransactionMetadataRequest } from '../hooks/useTransactionMetadataRequest';

// todo: if possible derive way to dynamically check if confirmation should be rendered flat
const FLAT_TRANSACTION_CONFIRMATIONS: TransactionType[] = [
  TransactionType.stakingDeposit,
];

export const useFlatConfirmation = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const isFlatConfirmation = FLAT_TRANSACTION_CONFIRMATIONS.includes(
    transactionMetadata?.type as TransactionType,
  );

  return { isFlatConfirmation };
};
