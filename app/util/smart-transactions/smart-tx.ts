import { ApprovalController } from '@metamask/approval-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { SmartTransaction } from '@metamask/smart-transactions-controller/dist/types';
import {
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import Logger from '../Logger';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import {
  createSignedTransactions,
  getShouldEndFlow,
  getShouldStartFlow,
  getShouldUpdateFlow,
  getTxType,
} from './utils';
import { TX_PENDING } from '../../constants/transaction';
import { InteractionManager } from 'react-native';

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

interface Request {
  transactionMeta: TransactionMeta;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  isSmartTransaction: boolean;
  approvalController: ApprovalController;
  featureFlags: {
    mobile_active: boolean;
    extension_active: boolean;
    fallback_to_v1: boolean;
    fallbackToV1: boolean;
    mobileActive: boolean;
    extensionActive: boolean;
    mobileActiveIOS: boolean;
    mobileActiveAndroid: boolean;
    smartTransactions:
      | {
          expectedDeadline: number;
          maxDeadline: number;
          returnTxHashAsap: boolean;
        }
      | Record<string, never>;
  };
}

const LOG_PREFIX = 'STX publishHook';

export async function publishHook(request: Request) {
  const {
    transactionMeta,
    smartTransactionsController,
    transactionController,
    isSmartTransaction,
    approvalController,
    featureFlags,
  } = request;
  // transaction field is used for TxController v8
  // will become txParams in TxController v11 https://github.com/MetaMask/core/blob/main/packages/transaction-controller/CHANGELOG.md#1100
  // TODO update once Mobile is on v11+, remove STX patch, and change all transaction to txParams
  const { chainId, transaction, origin } = transactionMeta;

  Logger.log('STX featureflags', featureFlags);

  if (!isSmartTransaction) {
    Logger.log(LOG_PREFIX, 'Skipping hook as not enabled for chain', chainId);

    // Will cause TransactionController to publish to the RPC provider as normal.
    return { transactionHash: undefined };
  }

  Logger.log(
    LOG_PREFIX,
    'Executing publish hook with transactionMeta:',
    transactionMeta,
  );

  if (!chainId) throw new Error('chainId is required');
  const {
    isDapp,
    isSend,
    isInSwapFlow,
    isSwapApproveTx,
    isSwapTransaction,
    isNativeTokenTransferred,
  } = getTxType(transactionMeta, chainId);

  let smartTransactionStatusApprovalId: string | undefined;

  // Looking for a pendingApproval that's a swap approve tx
  Logger.log(LOG_PREFIX, 'approvalController.state', approvalController.state);

  const pendingApprovalsForSwapApproveTx = Object.values(
    approvalController.state.pendingApprovals,
  ).filter(
    ({ origin: pendingApprovalOrigin, type, requestState }) =>
      // MM_FOX_CODE is the origin for MM Swaps
      pendingApprovalOrigin === process.env.MM_FOX_CODE &&
      type === ApprovalTypes.SMART_TRANSACTION_STATUS &&
      requestState?.isInSwapFlow &&
      requestState?.isSwapApproveTx,
  );
  smartTransactionStatusApprovalId = pendingApprovalsForSwapApproveTx[0]?.id;

  const shouldStartFlow = getShouldStartFlow(
    isDapp,
    isSend,
    isSwapApproveTx,
    Boolean(pendingApprovalsForSwapApproveTx[0]),
  );
  const shouldUpdateFlow = getShouldUpdateFlow(
    isDapp,
    isSend,
    isSwapTransaction,
  );
  const shouldEndFlow = getShouldEndFlow(isDapp, isSend, isSwapTransaction);

  Logger.log(LOG_PREFIX, {
    isDapp,
    isInSwapFlow,
    isSwapApproveTx,
    isSwapTransaction,
    isSend,
    isNativeTokenTransferred,
    shouldStartFlow,
    shouldUpdateFlow,
    shouldEndFlow,
  });

  if (shouldStartFlow) {
    InteractionManager.runAfterInteractions(() => {
      const { id } = approvalController.startFlow(); // this triggers a small loading spinner to pop up at bottom of page
      smartTransactionStatusApprovalId = id;

      Logger.log(LOG_PREFIX, 'Started approval flow', {
        smartTransactionStatusApprovalId,
      });
    });
  }

  try {
    const feesResponse = await smartTransactionsController.getFees(
      { ...transaction, chainId },
      undefined,
    );

    Logger.log(LOG_PREFIX, 'Retrieved fees', feesResponse);

    const [signedTransactions, signedCanceledTransactions] = (await Promise.all(
      [
        createSignedTransactions(
          transaction,
          feesResponse.tradeTxFees?.fees ?? [],
          false,
          transactionController,
        ),
        createSignedTransactions(
          transaction,
          feesResponse.tradeTxFees?.cancelFees || [],
          true,
          transactionController,
        ),
      ],
    )) as [string[], string[]];

    Logger.log(LOG_PREFIX, 'Generated signed transactions', {
      signedTransactions,
      signedCanceledTransactions,
    });

    Logger.log(LOG_PREFIX, 'Submitting signed transactions');

    const submitTransactionResponse =
      await smartTransactionsController.submitSignedTransactions({
        signedTransactions,
        signedCanceledTransactions,
        transaction,
        transactionMeta,
      });

    const uuid = submitTransactionResponse?.uuid;
    const returnTxHashAsap = featureFlags?.smartTransactions.returnTxHashAsap;

    // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
    if (isSwapTransaction) {
      const newSwapsTransactions =
        // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
        transactionController.state.swapsTransactions || {};

      newSwapsTransactions[uuid] = newSwapsTransactions[transactionMeta.id];
      // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
      transactionController.update({ swapsTransactions: newSwapsTransactions });
    }

    if (!uuid) {
      throw new Error(`${LOG_PREFIX} - No smart transaction UUID`);
    }

    Logger.log(LOG_PREFIX, 'Received UUID', uuid);
    Logger.log(
      LOG_PREFIX,
      'returnTxHashAsap',
      returnTxHashAsap,
      submitTransactionResponse.txHash,
    );

    // For MM Swaps, the user just confirms the ERC20 approval tx, then the actual swap tx is auto confirmed, so 2 stx's are sent through in quick succession
    if (!origin) throw new Error('Origin is required');
    if (shouldStartFlow) {
      // Do not await on this, since it will not progress any further if so
      approvalController.addAndShowApprovalRequest({
        id: smartTransactionStatusApprovalId,
        origin,
        type: ApprovalTypes.SMART_TRANSACTION_STATUS,
        // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
        // can also be read from approvalController.state.pendingApprovals[approvalId].requestState
        requestState: {
          smartTransaction: {
            status: TX_PENDING,
            creationTime: Date.now(),
          },
          isDapp,
          isInSwapFlow,
          isSwapApproveTx,
          isSwapTransaction,
        },
      });
      Logger.log(
        LOG_PREFIX,
        'Added approval',
        smartTransactionStatusApprovalId,
      );
    }

    // undefined for init state
    // null for error
    // string for success
    let transactionHash: string | null | undefined;
    if (returnTxHashAsap && submitTransactionResponse?.txHash) {
      transactionHash = submitTransactionResponse.txHash;
    }

    // All tx types must eventually return a transaction hash, TransactionController is expecting it
    if (smartTransactionStatusApprovalId) {
      smartTransactionsController.eventEmitter.on(
        `${uuid}:smartTransaction`,
        async (smartTransaction: SmartTransaction) => {
          Logger.log(LOG_PREFIX, 'smartTransaction event', smartTransaction);

          const { status, statusMetadata } = smartTransaction;
          if (!status || status === TX_PENDING) {
            return;
          }

          try {
            if (shouldUpdateFlow) {
              await approvalController.updateRequestState({
                id: smartTransactionStatusApprovalId as string,
                requestState: {
                  smartTransaction: smartTransaction as any,
                  isDapp,
                  isInSwapFlow,
                  isSwapApproveTx,
                  isSwapTransaction,
                },
              });
            }
          } catch (e) {
            // Could get here if user closes the status modal
            Logger.log(LOG_PREFIX, 'Error updating approval request state', e);
          }

          if (statusMetadata?.minedHash) {
            Logger.log(
              LOG_PREFIX,
              'Received tx hash',
              statusMetadata?.minedHash,
            );
            transactionHash = statusMetadata.minedHash;
          } else {
            transactionHash = null;
          }
        },
      );
    }

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
        `${LOG_PREFIX} - Transaction does not have a transaction hash, there was a problem`,
      );
    }

    Logger.log(LOG_PREFIX, 'Returning tx hash', transactionHash);
    // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
    // The original STX gets replaced by another tx, which has a different tx.id, so we need to associate the TxController.state.swapsTransactions somehow
    if (transactionHash) {
      const newSwapsTransactions =
        // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
        transactionController.state.swapsTransactions || {};

      newSwapsTransactions[transactionHash] =
        newSwapsTransactions[transactionMeta.id];
      // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
      transactionController.update({ swapsTransactions: newSwapsTransactions });
    }

    return { transactionHash };
  } catch (error) {
    Logger.log(LOG_PREFIX, 'publish hook error', error);
    Logger.error(error, '');

    throw error;
  } finally {
    try {
      // This removes the loading spinner, does not close modal
      if (shouldEndFlow && smartTransactionStatusApprovalId) {
        approvalController.endFlow({
          id: smartTransactionStatusApprovalId,
        });
        Logger.log(
          LOG_PREFIX,
          'Ended approval flow',
          smartTransactionStatusApprovalId,
        );
      }
    } catch (e) {
      Logger.log(LOG_PREFIX, 'publish hook error 2', e);
    }
  }
}
