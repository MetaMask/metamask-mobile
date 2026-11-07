import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import type { RootState } from '../../../../../reducers';
import { selectTransactionPaymentTokenByTransactionId } from '../../../../../selectors/transactionPayController';
import Logger from '../../../../../util/Logger';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { getEvmPaymentToken } from '../../../../../util/transactions/payment-token';
import { getMoneyAccountWithdrawTransferUpdate } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Re-encodes the nested mUSD transfer of a funded Money Account withdrawal
 * when the receive token or the recipient changes who it must pay. A quoted
 * receive token keeps the mUSD on the money account, while mUSD on the vault
 * chain pays the recipient directly. The amount is kept.
 *
 * Reads the batch from TransactionController state rather than Redux, so a
 * newer amount commit that Redux has not received yet is never overwritten
 * with the previous amount.
 */
export function useMoneyAccountWithdrawTransferSync(): void {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const recipient = useTransactionAccountOverride();
  const paymentToken = useSelector((state: RootState) =>
    selectTransactionPaymentTokenByTransactionId(state, transactionId),
  );

  useEffect(() => {
    const currentTransaction =
      Engine.context.TransactionController.state.transactions.find(
        ({ id }) => id === transactionMeta?.id,
      );

    if (!currentTransaction || !recipient) {
      return;
    }

    const update = getMoneyAccountWithdrawTransferUpdate(
      currentTransaction,
      recipient,
      getEvmPaymentToken(paymentToken),
    );

    if (!update) {
      return;
    }

    updateAtomicBatchData({
      transactionId: currentTransaction.id,
      transactionIndex: update.nestedTransactionIndex,
      transactionData: update.transactionData,
    }).catch((error) => {
      Logger.error(error, 'Failed to sync Money Account withdraw transfer');
    });
  }, [paymentToken, recipient, transactionMeta]);
}
