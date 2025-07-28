import { useEffect } from 'react';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { trace, endTrace, TraceName } from '../../../../util/trace';
import { isStakingConfirmation } from '../../../Views/confirmations/utils/confirm';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { EARN_EXPERIENCES } from '../../Earn/constants/experiences';

/**
 * Maps pooled staking transaction types to their corresponding Earn trace names
 */
const STAKING_TRACE_MAP: Record<string, TraceName> = {
  [TransactionType.stakingDeposit]:
    TraceName.EarnPooledStakingDepositTxConfirmed,
  [TransactionType.stakingUnstake]:
    TraceName.EarnPooledStakingWithdrawTxConfirmed,
  [TransactionType.stakingClaim]: TraceName.EarnPooledStakingClaimTxConfirmed,
};

/**
 * Hook that adds tracing for pooled staking transactions (submitted and confirmed)
 */
export const useStakingTransactionTracing = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  useEffect(() => {
    const transactionType = transactionMetadata?.type;
    const transactionId = transactionMetadata?.id;

    if (
      !transactionType ||
      !transactionId ||
      !isStakingConfirmation(transactionType as string)
    ) {
      return;
    }

    const traceName = STAKING_TRACE_MAP[transactionType as string];
    if (!traceName) {
      return;
    }

    // Start the trace on submission
    Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionSubmitted',
      ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
        trace({
          name: traceName,
          id: transactionMeta.id,
          data: {
            chainId: transactionMeta.chainId,
            experience: EARN_EXPERIENCES.POOLED_STAKING,
          },
        });
      },
      ({ transactionMeta }: { transactionMeta: TransactionMeta }) =>
        transactionMeta.id === transactionId,
    );

    // End the trace on confirmation
    Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionConfirmed',
      (transactionMeta: TransactionMeta) => {
        endTrace({
          name: traceName,
          id: transactionMeta.id,
        });
      },
      (transactionMeta: TransactionMeta) =>
        transactionMeta.id === transactionId,
    );
  }, [transactionMetadata?.type, transactionMetadata?.id]);
};
