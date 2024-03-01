import { ApprovalController } from '@metamask/approval-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import {
  Fee,
  SmartTransaction,
} from '@metamask/smart-transactions-controller/dist/types';
import { TransactionController } from '@metamask/transaction-controller';
import Logger from '../Logger';
import { decimalToHex } from '../conversions';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import TransactionTypes from '../../core/TransactionTypes';
import { isSwapTransaction } from '../transactions';

// TODO import these from tx controller
export declare type Hex = `0x${string}`;
export interface TransactionParams {
  chainId?: Hex;
  data?: string;
  from: string;
  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
  nonce?: string;
  to?: string;
  value?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedBaseFee?: string;
  estimateGasError?: string;
  type?: string;
}

export const createSignedTransactions = async (
  unsignedTransaction: TransactionParams,
  fees: Fee[],
  areCancelTransactions: boolean,
  transactionController: TransactionController,
) => {
  const unsignedTransactionsWithFees = fees.map((fee) => {
    const unsignedTransactionWithFees = {
      ...unsignedTransaction,
      maxFeePerGas: decimalToHex(fee.maxFeePerGas).toString(),
      maxPriorityFeePerGas: decimalToHex(fee.maxPriorityFeePerGas).toString(),
      gas: areCancelTransactions
        ? decimalToHex(21000).toString() // It has to be 21000 for cancel transactions, otherwise the API would reject it.
        : unsignedTransaction.gas?.toString(),
      value: unsignedTransaction.value,
    };
    if (areCancelTransactions) {
      unsignedTransactionWithFees.to = unsignedTransactionWithFees.from;
      unsignedTransactionWithFees.data = '0x';
    }

    return unsignedTransactionWithFees;
  });

  Logger.log(
    'STX createSignedTransactions, unsignedTransactionsWithFees',
    unsignedTransactionsWithFees,
  );

  const signedTransactions =
    await transactionController.approveTransactionsWithSameNonce(
      unsignedTransactionsWithFees,
      { hasNonce: true },
    );

  Logger.log(
    'STX createSignedTransactions signedTransactions',
    signedTransactions,
  );

  return signedTransactions;
};

interface Request {
  transactionMeta: {
    chainId: string;
    transaction: TransactionParams;
    origin: string;
  };
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  isSmartTransaction: boolean;
  approvalController: ApprovalController;
}

export async function publishHook(request: Request) {
  const {
    transactionMeta,
    smartTransactionsController,
    transactionController,
    isSmartTransaction,
    approvalController,
  } = request;
  Logger.log('STX - Executing publish hook', transactionMeta);

  const { chainId, transaction: txParams, origin } = transactionMeta;

  if (!isSmartTransaction) {
    Logger.log('STX - Skipping hook as not enabled for chain', chainId);

    // Will cause TransactionController to publish to the RPC provider as normal.
    return { transactionHash: undefined };
  }

  const { id } = approvalController.startFlow(); // this triggers a small loading spinner to pop up at bottom of page
  const smartTransactionStatusApprovalId = id;
  Logger.log('STX - Started approval flow', smartTransactionStatusApprovalId);

  try {
    Logger.log('STX - Fetching fees', txParams, chainId);
    const feesResponse = await smartTransactionsController.getFees(
      { ...txParams, chainId },
      undefined,
    );

    Logger.log('STX - Retrieved fees', feesResponse);

    const signedTransactions = (await createSignedTransactions(
      txParams,
      feesResponse.tradeTxFees?.fees ?? [],
      false,
      transactionController,
    )) as string[];

    const signedCanceledTransactions = (await createSignedTransactions(
      txParams,
      feesResponse.tradeTxFees?.cancelFees || [],
      true,
      transactionController,
    )) as string[];

    Logger.log('STX - Generated signed transactions', {
      signedTransactions,
      signedCanceledTransactions,
    });

    Logger.log('STX - Submitting signed transactions');

    const response = await smartTransactionsController.submitSignedTransactions(
      {
        signedTransactions,
        signedCanceledTransactions,
        txParams,
        // Patched into controller to skip unnecessary call to confirmExternalTransaction.
        skipConfirm: true,
      },
    );

    const uuid = response?.uuid;

    if (!uuid) {
      throw new Error('No smart transaction UUID');
    }

    Logger.log('STX - Received UUID', uuid);

    // If it isn't a dapp tx, check if it's MM Swap or Send
    const isDapp = transactionMeta?.origin !== TransactionTypes.MMM;

    const to = transactionMeta.transaction.to?.toLowerCase();
    const { data } = transactionMeta.transaction;
    const isMetamaskSwap = isSwapTransaction(
      data,
      transactionMeta.origin,
      to,
      chainId,
    );

    // Do not await on this, since it will not progress any further if so
    approvalController.addAndShowApprovalRequest({
      id: smartTransactionStatusApprovalId,
      origin,
      type: ApprovalTypes.SMART_TRANSACTION_STATUS,
      // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
      requestState: {
        smartTransaction: {
          status: 'pending',
        },
        creationTime: Date.now(),
        isDapp,
        isMetamaskSwap,
      },
    });
    Logger.log('STX - Added approval', smartTransactionStatusApprovalId);

    // undefined for init state
    // null for error
    // string for success
    let transactionHash: string | null | undefined;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-next-line
    smartTransactionsController.eventEmitter.on(
      `${uuid}:smartTransaction`,
      async (smartTransaction: SmartTransaction) => {
        Logger.log('STX - smartTransaction event', smartTransaction);

        const { status, statusMetadata } = smartTransaction;
        if (!status || status === 'pending') {
          return;
        }

        try {
          await approvalController.updateRequestState({
            id: smartTransactionStatusApprovalId,
            requestState: {
              smartTransaction: smartTransaction as any,
              isDapp,
              isMetamaskSwap,
            },
          });
        } catch (e) {
          Logger.log('STX - Error updating approval request state', e);
        }

        if (statusMetadata?.minedHash) {
          Logger.log('STX - Received tx hash: ', statusMetadata?.minedHash);
          transactionHash = statusMetadata.minedHash;
        } else {
          transactionHash = null;
        }
      },
    );

    const waitForTransactionHashChange = () =>
      new Promise((resolve) => {
        const checkVariable = () => {
          if (transactionHash === undefined) {
            setTimeout(checkVariable, 100); // Check again after 100ms
          } else {
            resolve(`transactionHash has changed to: ${transactionHash}`);
          }
        };

        checkVariable();
      });

    await waitForTransactionHashChange();

    if (transactionHash === null) {
      throw new Error(
        'Transaction does not have a transaction hash, there was a problem',
      );
    }

    Logger.log('STX - Received hash', transactionHash);

    return { transactionHash };
  } catch (error) {
    Logger.log('STX - publish hook Error', error);
    Logger.error(error, '');
    throw error;
  } finally {
    try {
      // This removes the loading spinner, does not close modal
      approvalController.endFlow({
        id: smartTransactionStatusApprovalId,
      });
      Logger.log('STX - Ended approval flow', smartTransactionStatusApprovalId);
    } catch (e) {
      Logger.log('STX - publish hook Error 2', e);
    }
  }
}
