/* eslint-disable import/prefer-default-export */
import {
  Transaction,
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { ApprovalController } from '@metamask/approval-controller';
import { InteractionManager } from 'react-native';
import {
  getShouldEndFlow,
  getShouldStartFlow,
  getShouldUpdateFlow,
  getTxType,
} from './utils';
import Logger from '../Logger';
import {
  Fee,
  Fees,
  SmartTransaction,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller/dist/types';
import { decimalToHex } from '../conversions';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';

export declare type Hex = `0x${string}`;

const LOG_PREFIX = 'STX publishHook';
// It has to be 21000 for cancel transactions, otherwise the API would reject it.
const CANCEL_GAS = 21000;

class SmartTransactionHook {
  approvalFlowEnded: boolean;
  approvalFlowId: string;
  chainId: Hex;
  featureFlags: {
    extensionActive: boolean;
    mobileActive: boolean;
    smartTransactions: {
      expectedDeadline?: number;
      maxDeadline?: number;
      returnTxHashAsap?: boolean;
    };
  };
  isSmartTransaction: boolean;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  approvalController: ApprovalController;
  transactionMeta: TransactionMeta;
  transaction: Transaction;

  isDapp: boolean;
  isSend: boolean;
  isInSwapFlow: boolean;
  isSwapApproveTx: boolean;
  isSwapTransaction: boolean;
  isNativeTokenTransferred: boolean;

  shouldStartFlow: boolean;
  shouldUpdateFlow: boolean;
  shouldEndFlow: boolean;

  constructor(request: SubmitSmartTransactionRequest) {
    const {
      transactionMeta,
      smartTransactionsController,
      transactionController,
      isSmartTransaction,
      approvalController,
      featureFlags,
    } = request;
    this.approvalFlowId = '';
    this.approvalFlowEnded = false;
    this.transactionMeta = transactionMeta;
    this.smartTransactionsController = smartTransactionsController;
    this.transactionController = transactionController;
    this.approvalController = approvalController;
    this.isSmartTransaction = isSmartTransaction;
    this.featureFlags = featureFlags;
    this.chainId = transactionMeta.chainId;
    this.transaction = transactionMeta.transaction;

    const {
      isDapp,
      isSend,
      isInSwapFlow,
      isSwapApproveTx,
      isSwapTransaction,
      isNativeTokenTransferred,
    } = getTxType(this.transactionMeta, this.chainId);
    this.isDapp = isDapp;
    this.isSend = isSend;
    this.isInSwapFlow = isInSwapFlow;
    this.isSwapApproveTx = isSwapApproveTx;
    this.isSwapTransaction = isSwapTransaction;
    this.isNativeTokenTransferred = isNativeTokenTransferred;

    const pendingApprovalsForSwapApproveTx = Object.values(
      this.approvalController.state.pendingApprovals,
    ).filter(
      ({ origin: pendingApprovalOrigin, type, requestState }) =>
        // MM_FOX_CODE is the origin for MM Swaps
        pendingApprovalOrigin === process.env.MM_FOX_CODE &&
        type === ApprovalTypes.SMART_TRANSACTION_STATUS &&
        requestState?.isInSwapFlow &&
        requestState?.isSwapApproveTx,
    );

    this.shouldStartFlow = getShouldStartFlow(
      this.isDapp,
      this.isSend,
      this.isSwapApproveTx,
      Boolean(pendingApprovalsForSwapApproveTx[0]),
    );
    this.shouldUpdateFlow = getShouldUpdateFlow(
      this.isDapp,
      this.isSend,
      this.isSwapTransaction,
    );
    this.shouldEndFlow = getShouldEndFlow(
      this.isDapp,
      this.isSend,
      this.isSwapTransaction,
    );
  }

  applyFeeToTransaction(fee: Fee, isCancel: boolean): Transaction {
    const unsignedTransactionWithFees = {
      ...this.transaction,
      maxFeePerGas: `0x${decimalToHex(fee.maxFeePerGas)}`,
      maxPriorityFeePerGas: `0x${decimalToHex(fee.maxPriorityFeePerGas)}`,
      gas: isCancel
        ? `0x${decimalToHex(CANCEL_GAS)}`
        : this.transaction.gas?.toString(),
      value: this.transaction.value,
    };
    if (isCancel) {
      unsignedTransactionWithFees.to = unsignedTransactionWithFees.from;
      unsignedTransactionWithFees.data = '0x';
    }

    return unsignedTransactionWithFees;
  }

  async createSignedTransactions(
    fees: Fee[],
    isCancel: boolean,
  ): Promise<string[]> {
    const unsignedTransactions = fees.map((fee) =>
      this.applyFeeToTransaction(fee, isCancel),
    );
    const transactionsWithChainId = unsignedTransactions.map((tx) => ({
      ...tx,
      chainId: tx.chainId || this.chainId,
    }));
    return (await this.transactionController.approveTransactionsWithSameNonce(
      transactionsWithChainId,
      { hasNonce: true },
    )) as string[];
  }

  async signAndSubmitTransactions({
    getFeesResponse,
  }: {
    getFeesResponse: Fees;
  }) {
    const signedTransactions = await this.createSignedTransactions(
      getFeesResponse.tradeTxFees?.fees ?? [],
      false,
    );
    const signedCanceledTransactions = await this.createSignedTransactions(
      getFeesResponse.tradeTxFees?.cancelFees || [],
      true,
    );
    return await this.smartTransactionsController.submitSignedTransactions({
      signedTransactions,
      signedCanceledTransactions,
      transaction: this.transaction,
      transactionMeta: this.transactionMeta,
    });
  }

  addApprovalRequest({ uuid }: { uuid: string }) {
    const onApproveOrRejectWrapper = () => {
      this.onApproveOrReject();
    };

    if (!this.transactionMeta.origin) throw new Error('Origin is required');

    // Do not await on this, since it will not progress any further if so
    this.approvalController
      .addAndShowApprovalRequest({
        id: this.approvalFlowId,
        origin: this.transactionMeta.origin,
        type: ApprovalTypes.SMART_TRANSACTION_STATUS,
        // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
        // can also be read from approvalController.state.pendingApprovals[approvalId].requestState
        requestState: {
          smartTransaction: {
            status: SmartTransactionStatuses.PENDING,
            creationTime: Date.now(),
            uuid,
          },
          isDapp: this.isDapp,
          isInSwapFlow: this.isInSwapFlow,
          isSwapApproveTx: this.isSwapApproveTx,
          isSwapTransaction: this.isSwapTransaction,
        },
      })
      .then(onApproveOrRejectWrapper, onApproveOrRejectWrapper);
    Logger.log(LOG_PREFIX, 'Added approval', this.approvalFlowId);
  }

  async updateApprovalRequest({
    smartTransaction,
  }: {
    smartTransaction: SmartTransaction;
  }) {
    await this.approvalController.updateRequestState({
      id: this.approvalFlowId,
      requestState: {
        smartTransaction: smartTransaction as any,
        isDapp: this.isDapp,
        isInSwapFlow: this.isInSwapFlow,
        isSwapApproveTx: this.isSwapApproveTx,
        isSwapTransaction: this.isSwapTransaction,
      },
    });
  }

  async addListenerToUpdateStatusPage({ uuid }: { uuid: string }) {
    this.smartTransactionsController.eventEmitter.on(
      `${uuid}:smartTransaction`,
      async (smartTransaction: SmartTransaction) => {
        const { status } = smartTransaction;
        if (!status || status === SmartTransactionStatuses.PENDING) {
          return;
        }
        if (this.shouldUpdateFlow && !this.approvalFlowEnded) {
          await this.updateApprovalRequest({
            smartTransaction,
          });
        }
      },
    );
  }

  waitForTransactionHash({ uuid }: { uuid: string }): Promise<string | null> {
    return new Promise((resolve) => {
      this.smartTransactionsController.eventEmitter.on(
        `${uuid}:smartTransaction`,
        async (smartTransaction: SmartTransaction) => {
          const { status, statusMetadata } = smartTransaction;
          Logger.log(LOG_PREFIX, 'Smart Transaction: ', smartTransaction);
          if (!status || status === SmartTransactionStatuses.PENDING) {
            return;
          }
          if (statusMetadata?.minedHash) {
            Logger.log(
              LOG_PREFIX,
              'Smart Transaction - Received tx hash: ',
              statusMetadata?.minedHash,
            );
            resolve(statusMetadata.minedHash);
          } else {
            // cancelled status will have statusMetadata?.minedHash === ''
            resolve(null);
          }
        },
      );
    });
  }

  onApproveOrReject() {
    if (this.approvalFlowEnded) {
      return;
    }
    this.approvalFlowEnded = true;

    // This removes the loading spinner, does not close modal
    if (this.shouldEndFlow && this.approvalFlowId) {
      try {
        this.approvalController.endFlow({
          id: this.approvalFlowId,
        });
        Logger.log(LOG_PREFIX, 'Ended approval flow id', this.approvalFlowId);
      } catch (e) {
        Logger.log(LOG_PREFIX, 'End approval flow error', e);
      }
    }
  }

  updateSwapsTransactions(id: string) {
    // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
    const newSwapsTransactions =
      // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
      this.transactionController.state.swapsTransactions || {};

    newSwapsTransactions[id] = newSwapsTransactions[this.transactionMeta.id];
    this.transactionController.update({
      // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
      swapsTransactions: newSwapsTransactions,
    });
  }

  async submit() {
    // Will cause TransactionController to publish to the RPC provider as normal.
    const useRegularTransactionSubmit = { transactionHash: undefined };
    if (!this.isSmartTransaction) {
      return useRegularTransactionSubmit;
    }

    if (this.shouldStartFlow) {
      const { id } = this.approvalController.startFlow(); // this triggers a small loading spinner to pop up at bottom of page
      this.approvalFlowId = id;

      Logger.log(LOG_PREFIX, 'Started approval flow id', this.approvalFlowId);
    }

    try {
      const getFeesResponse = await this.smartTransactionsController.getFees(
        { ...this.transaction, chainId: this.chainId },
        undefined,
      );
      const submitTransactionResponse = await this.signAndSubmitTransactions({
        getFeesResponse,
      });
      const uuid = submitTransactionResponse?.uuid;
      if (!uuid) {
        throw new Error('No smart transaction UUID');
      }

      // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
      if (this.isSwapTransaction) {
        this.updateSwapsTransactions(uuid);
      }

      if (this.shouldStartFlow) {
        this.addApprovalRequest({
          uuid,
        });
      }

      if (this.shouldUpdateFlow) {
        this.addListenerToUpdateStatusPage({
          uuid,
        });
      }

      let transactionHash: string | undefined | null;
      const returnTxHashAsap =
        this.featureFlags?.smartTransactions?.returnTxHashAsap;

      if (returnTxHashAsap && submitTransactionResponse?.txHash) {
        transactionHash = submitTransactionResponse.txHash;
      } else {
        transactionHash = await this.waitForTransactionHash({
          uuid,
        });
      }
      if (transactionHash === null) {
        throw new Error(
          'Transaction does not have a transaction hash, there was a problem',
        );
      }

      if (transactionHash && this.isSwapTransaction) {
        // The original STX gets replaced by another tx, which has a different tx.id, so we need to associate the TxController.state.swapsTransactions somehow
        this.updateSwapsTransactions(transactionHash);
      }

      return { transactionHash };
    } catch (error) {
      Logger.error(
        `${LOG_PREFIX} Error in smart transaction publish hook`,
        error,
      );
      this.onApproveOrReject();
      throw error;
    }
  }
}

export interface SubmitSmartTransactionRequest {
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

export const submitSmartTransactionHook = (
  request: SubmitSmartTransactionRequest,
) => {
  const smartTransactionHook = new SmartTransactionHook(request);
  return smartTransactionHook.submit();
};
