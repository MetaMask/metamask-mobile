import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const STANDALONE_TRANSACTION_CONFIRMATIONS: TransactionType[] = [
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
  TransactionType.stakingClaim,
];

export const useStandaloneConfirmation = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const isStandaloneConfirmation =
    STANDALONE_TRANSACTION_CONFIRMATIONS.includes(
      transactionMetadata?.type as TransactionType,
    );

  return { isStandaloneConfirmation };
};
