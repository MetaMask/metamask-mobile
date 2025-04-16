import { TransactionType } from '@metamask/transaction-controller';

import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const FLAT_TRANSACTION_CONFIRMATIONS: TransactionType[] = [
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.stakingClaim,
];

export const useFlatConfirmation = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const isFlatConfirmation = FLAT_TRANSACTION_CONFIRMATIONS.includes(
    transactionMetadata?.type as TransactionType,
  );

  return { isFlatConfirmation };
};
