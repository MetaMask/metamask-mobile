import { useEffect, useRef } from 'react';
import { providerErrors } from '@metamask/rpc-errors';

import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { addTransaction } from '../../../../../util/transaction-controller';
import type { PerpsReceiveDestination } from '../../components/rows/perps-receive-to-row';
import type { PerpsWithdrawSource } from '../../components/rows/perps-withdraw-from-row';
import { perpsTransactionTypeForSelection } from '../../utils/perps-lighter-transaction-type';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

/**
 * Replaces the open Perps confirmation when the user changes From or To.
 *
 * Switching to Lighter and switching back to Hyperliquid both create a new
 * transaction with the matching type. The previous approval is rejected after
 * the new one exists, so the confirmation follows the new transaction.
 *
 * @param options - Current selector values from the amount screen.
 * @param options.destination - Receive-to choice.
 * @param options.source - Withdraw-from choice.
 */
export function useSyncPerpsLighterTransactionType({
  destination,
  source,
}: {
  destination: PerpsReceiveDestination;
  source: PerpsWithdrawSource;
}): void {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;
  const currentType = transactionMeta?.type;
  const networkClientId = transactionMeta?.networkClientId;
  const submittedKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!transactionId || !currentType || !networkClientId) {
      return;
    }

    const nextType = perpsTransactionTypeForSelection({
      currentType,
      destination,
      source,
    });

    if (!nextType || nextType === currentType) {
      return;
    }

    const requestKey = `${transactionId}:${nextType}`;
    if (submittedKeyRef.current === requestKey) {
      return;
    }
    submittedKeyRef.current = requestKey;

    void addTransaction(
      { ...transactionMeta?.txParams },
      {
        nestedTransactions: transactionMeta?.nestedTransactions,
        networkClientId,
        origin: transactionMeta?.origin,
        requireApproval: true,
        type: nextType,
      },
    )
      .then(() => {
        Engine.context.ApprovalController.rejectRequest(
          transactionId,
          providerErrors.userRejectedRequest(),
        );
      })
      .catch((error: unknown) => {
        if (submittedKeyRef.current === requestKey) {
          submittedKeyRef.current = undefined;
        }
        Logger.error(
          error as Error,
          'Failed to recreate the Perps transaction for the selected provider',
        );
      });
  }, [
    currentType,
    destination,
    networkClientId,
    source,
    transactionId,
    transactionMeta?.nestedTransactions,
    transactionMeta?.origin,
    transactionMeta?.txParams,
  ]);
}
