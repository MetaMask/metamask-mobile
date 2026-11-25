import { useMemo } from 'react';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { AlertKeys } from '../../constants/alerts';
import { NO_ALERTS, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

import { useSelector } from 'react-redux';
import { selectTransactions } from '../../../../../selectors/transactionController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayIsPostQuote } from '../pay/useTransactionPayData';
import { useIsMMPayHardwareEnabled } from '../pay/useIsMMPayHardwareEnabled';
import { isHardwareAccount } from '../../../../../util/address';
import { decodePaymentTokenAssetId } from '../../../../../util/transactions/payment-token';

const INCOMPLETE_STATUSES = [
  TransactionStatus.signed,
  TransactionStatus.approved,
];
const PENDING_STATUSES = [...INCOMPLETE_STATUSES, TransactionStatus.submitted];

/**
 * Blocks a confirmation while a previous transaction from the same account
 * could conflict with its nonce.
 *
 * Any transaction blocks the confirmation's own chain while it is still being
 * signed. MetaMask Pay also submits from the account on the source chain, so a
 * submitted transaction blocks that chain as well. The target chain is
 * executed by the provider, so it is not blocked by submitted transactions.
 *
 * @returns The blocking alert, if any.
 */
export const useSignedOrSubmittedAlert = () => {
  const transactions = useSelector(selectTransactions);
  const isHardwarePayEnabled = useIsMMPayHardwareEnabled();
  const isPostQuote = useTransactionPayIsPostQuote();
  const transactionMetadata = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();

  const { chainId, id: transactionId, txParams } = transactionMetadata || {};
  const { from } = txParams ?? {};

  // Post-quote flows pay from the transaction chain and receive the payment
  // token on the target chain.
  const sourceChainId = isPostQuote
    ? chainId
    : decodePaymentTokenAssetId(payToken)?.chainId;

  const accountTransactions = transactions.filter(
    (transaction) =>
      transaction.id !== transactionId &&
      transaction.txParams.from.toLowerCase() === from?.toLowerCase(),
  );

  const incompleteTransaction = chainId
    ? accountTransactions.find(
        (transaction) =>
          getBlockingChainId(transaction, INCOMPLETE_STATUSES) === chainId,
      )
    : undefined;

  const sourceTransaction = sourceChainId
    ? accountTransactions.find(
        (transaction) =>
          getBlockingChainId(transaction, PENDING_STATUSES) === sourceChainId,
      )
    : undefined;

  const isPayChainTransaction =
    !incompleteTransaction &&
    Boolean(sourceTransaction) &&
    sourceChainId !== chainId;

  const showAlert = Boolean(incompleteTransaction ?? sourceTransaction);
  const isHardwareWallet = isHardwareAccount(from ?? '');

  return useMemo(() => {
    if (!showAlert || (isHardwarePayEnabled && isHardwareWallet)) {
      return NO_ALERTS;
    }

    return [
      {
        isBlocking: true,
        key: AlertKeys.SignedOrSubmitted,
        message: isPayChainTransaction
          ? strings('alert_system.signed_or_submitted_pay_token.message')
          : strings('alert_system.signed_or_submitted.message'),
        title: isPayChainTransaction
          ? strings('alert_system.signed_or_submitted_pay_token.title')
          : strings('alert_system.signed_or_submitted.title'),
        severity: Severity.Danger,
      },
    ];
  }, [
    isHardwarePayEnabled,
    isHardwareWallet,
    isPayChainTransaction,
    showAlert,
  ]);
};

/**
 * Get the chain on which a transaction could still conflict with a new nonce.
 *
 * A MetaMask Pay transaction with quotes holds no nonce of its own while its
 * publish hook runs, so it only blocks the chain it pays from, and only until
 * the source transaction is known. Source transactions submitted through the
 * transaction controller are also checked using their own status.
 *
 * @param transaction - Transaction to check.
 * @param statuses - Statuses considered in progress.
 * @returns The blocked chain ID, if any.
 */
function getBlockingChainId(
  transaction: TransactionMeta,
  statuses: TransactionStatus[],
): Hex | undefined {
  if (!statuses.includes(transaction.status)) {
    return undefined;
  }

  const { chainId, metamaskPay } = transaction;

  if (!metamaskPay?.strategy) {
    return chainId;
  }

  if (metamaskPay.sourceHash) {
    return undefined;
  }

  return metamaskPay.isPostQuote ? chainId : metamaskPay.chainId;
}
