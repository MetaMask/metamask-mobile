import {
  TransactionParams,
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { ApprovalController } from '@metamask/approval-controller';
import {
  getShouldStartApprovalRequest,
  getShouldUpdateApprovalRequest,
  getTransactionType,
} from './index';
import Logger from '../Logger';
import {
  Fee,
  Fees,
  SmartTransaction,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller/dist/types';
import { v1 as random } from 'uuid';
import { decimalToHex } from '../conversions';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import { RAMPS_SEND } from '../../components/UI/Ramp/constants';

export declare type Hex = `0x${string}`;

export interface SubmitSmartTransactionRequest {
  transactionMeta: TransactionMeta;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  shouldUseSmartTransaction: boolean;
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
// It has to be 21000 for cancel transactions, otherwise the API would reject it.
const CANCEL_GAS = 21000;
export const STX_NO_HASH_ERROR =
  'Smart Transaction does not have a transaction hash, there was a problem';

class SmartTransactionHook {
  #approvalEnded: boolean;
  #approvalId: string | undefined;
  #chainId: Hex;
  #featureFlags: {
    extensionActive: boolean;
    mobileActive: boolean;
    smartTransactions: {
      expectedDeadline?: number;
      maxDeadline?: number;
      returnTxHashAsap?: boolean;
    };
  };
  #shouldUseSmartTransaction: boolean;
  #smartTransactionsController: SmartTransactionsController;
  #transactionController: TransactionController;
  #approvalController: ApprovalController;
  #transactionMeta: TransactionMeta;
  #txParams: TransactionParams;

  #isDapp: boolean;
  #isSend: boolean;
  #isInSwapFlow: boolean;
  #isSwapApproveTx: boolean;
  #isSwapTransaction: boolean;
  #isNativeTokenTransferred: boolean;

  #shouldStartApprovalRequest: boolean;
  #shouldUpdateApprovalRequest: boolean;

  constructor(request: SubmitSmartTransactionRequest) {
    const {
      transactionMeta,
      smartTransactionsController,
      transactionController,
      shouldUseSmartTransaction,
      approvalController,
      featureFlags,
    } = request;
    this.#approvalId = undefined;
    this.#approvalEnded = false;
    this.#transactionMeta = transactionMeta;
    this.#smartTransactionsController = smartTransactionsController;
    this.#transactionController = transactionController;
    this.#approvalController = approvalController;
    this.#shouldUseSmartTransaction = shouldUseSmartTransaction;
    this.#featureFlags = featureFlags;
    this.#chainId = transactionMeta.chainId;
    this.#txParams = transactionMeta.txParams;

    const {
      isDapp,
      isSend,
      isInSwapFlow,
      isSwapApproveTx,
      isSwapTransaction,
      isNativeTokenTransferred,
    } = getTransactionType(this.#transactionMeta, this.#chainId);
    this.#isDapp = isDapp;
    this.#isSend = isSend;
    this.#isInSwapFlow = isInSwapFlow;
    this.#isSwapApproveTx = isSwapApproveTx;
    this.#isSwapTransaction = isSwapTransaction;
    this.#isNativeTokenTransferred = isNativeTokenTransferred;

    const approvalIdForPendingSwapApproveTx =
      this.#getApprovalIdForPendingSwapApproveTx();
    if (approvalIdForPendingSwapApproveTx) {
      this.#approvalId = approvalIdForPendingSwapApproveTx;
    }

    this.#shouldStartApprovalRequest = getShouldStartApprovalRequest(
      this.#isDapp,
      this.#isSend,
      this.#isSwapApproveTx,
      Boolean(approvalIdForPendingSwapApproveTx),
    );
    this.#shouldUpdateApprovalRequest = getShouldUpdateApprovalRequest(
      this.#isDapp,
      this.#isSend,
      this.#isSwapTransaction,
    );
  }

  async submit() {
    // Will cause TransactionController to publish to the RPC provider as normal.
    Logger.log(
      LOG_PREFIX,
      'shouldUseSmartTransaction',
      this.#shouldUseSmartTransaction,
    );
    const useRegularTransactionSubmit = { transactionHash: undefined };
    if (
      !this.#shouldUseSmartTransaction ||
      this.#transactionMeta.origin === RAMPS_SEND
    ) {
      return useRegularTransactionSubmit;
    }

    Logger.log(
      LOG_PREFIX,
      'Started submit hook',
      this.#transactionMeta.id,
      'transactionMeta.type',
      this.#transactionMeta.type,
    );

    try {
      const getFeesResponse = await this.#getFees();
      // In the event that STX health check passes, but for some reason /getFees fails, we fallback to a regular transaction
      if (!getFeesResponse) {
        return useRegularTransactionSubmit;
      }

      const submitTransactionResponse = await this.#signAndSubmitTransactions({
        getFeesResponse,
      });
      const uuid = submitTransactionResponse?.uuid;
      if (!uuid) {
        throw new Error('No smart transaction UUID');
      }

      // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
      if (this.#isSwapTransaction || this.#isSwapApproveTx) {
        this.#updateSwapsTransactions(uuid);
      }

      if (this.#shouldStartApprovalRequest) {
        this.#addApprovalRequest({
          uuid,
        });
      }

      if (this.#shouldUpdateApprovalRequest) {
        this.#addListenerToUpdateStatusPage({
          uuid,
        });
      }

      const transactionHash = await this.#getTransactionHash(
        submitTransactionResponse,
        uuid,
      );

      return { transactionHash };
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      Logger.error(
        error,
        `${LOG_PREFIX} Error in smart transaction publish hook`,
      );
      throw error;
    } finally {
      this.#cleanup();
    }
  }

  #getFees = async () => {
    try {
      return await this.#smartTransactionsController.getFees(
        { ...this.#txParams, chainId: this.#chainId },
        undefined,
      );
    } catch (error) {
      return undefined;
    }
  };

  #getApprovalIdForPendingSwapApproveTx = () => {
    const pendingApprovalsForSwapApproveTxs = Object.values(
      this.#approvalController.state.pendingApprovals,
    ).filter(
      ({ origin: pendingApprovalOrigin, type, requestState }) =>
        // MM_FOX_CODE is the origin for MM Swaps
        pendingApprovalOrigin === process.env.MM_FOX_CODE &&
        type === ApprovalTypes.SMART_TRANSACTION_STATUS &&
        requestState?.isInSwapFlow &&
        requestState?.isSwapApproveTx,
    );
    const pendingApprovalsForSwapApproveTx =
      pendingApprovalsForSwapApproveTxs[0];

    return pendingApprovalsForSwapApproveTx && this.#isSwapTransaction
      ? pendingApprovalsForSwapApproveTx.id
      : null;
  };

  #getTransactionHash = async (
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitTransactionResponse: any,
    uuid: string,
  ) => {
    let transactionHash: string | undefined | null;
    const returnTxHashAsap =
      this.#featureFlags?.smartTransactions?.returnTxHashAsap;

    if (returnTxHashAsap && submitTransactionResponse?.txHash) {
      transactionHash = submitTransactionResponse.txHash;
    } else {
      transactionHash = await this.#waitForTransactionHash({
        uuid,
      });
    }
    if (transactionHash === null) {
      throw new Error(STX_NO_HASH_ERROR);
    }

    return transactionHash;
  };

  #applyFeeToTransaction = (fee: Fee, isCancel: boolean): TransactionParams => {
    const unsignedTransactionWithFees = {
      ...this.#txParams,
      maxFeePerGas: `0x${decimalToHex(fee.maxFeePerGas)}`,
      maxPriorityFeePerGas: `0x${decimalToHex(fee.maxPriorityFeePerGas)}`,
      gas: isCancel
        ? `0x${decimalToHex(CANCEL_GAS)}`
        : this.#txParams.gas?.toString(),
      value: this.#txParams.value,
    };
    if (isCancel) {
      unsignedTransactionWithFees.to = unsignedTransactionWithFees.from;
      unsignedTransactionWithFees.data = '0x';
    }

    return unsignedTransactionWithFees;
  };

  #createSignedTransactions = async (
    fees: Fee[],
    isCancel: boolean,
  ): Promise<string[]> => {
    const unsignedTransactions = fees.map((fee) =>
      this.#applyFeeToTransaction(fee, isCancel),
    );
    const transactionsWithChainId = unsignedTransactions.map((tx) => ({
      ...tx,
      chainId: tx.chainId || this.#chainId,
    }));
    return (await this.#transactionController.approveTransactionsWithSameNonce(
      transactionsWithChainId,
      { hasNonce: true },
    )) as string[];
  };

  #signAndSubmitTransactions = async ({
    getFeesResponse,
  }: {
    getFeesResponse: Fees;
  }) => {
    const signedTransactions = await this.#createSignedTransactions(
      getFeesResponse.tradeTxFees?.fees ?? [],
      false,
    );
    const signedCanceledTransactions = await this.#createSignedTransactions(
      getFeesResponse.tradeTxFees?.cancelFees || [],
      true,
    );
    return await this.#smartTransactionsController.submitSignedTransactions({
      signedTransactions,
      signedCanceledTransactions,
      txParams: this.#txParams,
      transactionMeta: this.#transactionMeta,
    });
  };

  #addApprovalRequest = ({ uuid }: { uuid: string }) => {
    const origin = this.#transactionMeta.origin;

    if (!origin) throw new Error('Origin is required');

    this.#approvalId = random();

    // Do not await on this, since it will not progress any further if so
    this.#approvalController.addAndShowApprovalRequest({
      id: this.#approvalId,
      origin,
      type: ApprovalTypes.SMART_TRANSACTION_STATUS,
      // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
      // can also be read from approvalController.state.pendingApprovals[approvalId].requestState
      requestState: {
        smartTransaction: {
          status: SmartTransactionStatuses.PENDING,
          creationTime: Date.now(),
          uuid,
        },
        isDapp: this.#isDapp,
        isInSwapFlow: this.#isInSwapFlow,
        isSwapApproveTx: this.#isSwapApproveTx,
        isSwapTransaction: this.#isSwapTransaction,
      },
    });

    Logger.log(LOG_PREFIX, 'Added approval', this.#approvalId);
  };

  #updateApprovalRequest = async ({
    smartTransaction,
  }: {
    smartTransaction: SmartTransaction;
  }) => {
    if (this.#approvalId) {
      await this.#approvalController.updateRequestState({
        id: this.#approvalId,
        requestState: {
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          smartTransaction: smartTransaction as any,
          isDapp: this.#isDapp,
          isInSwapFlow: this.#isInSwapFlow,
          isSwapApproveTx: this.#isSwapApproveTx,
          isSwapTransaction: this.#isSwapTransaction,
        },
      });
    }
  };

  #addListenerToUpdateStatusPage = async ({ uuid }: { uuid: string }) => {
    this.#smartTransactionsController.eventEmitter.on(
      `${uuid}:smartTransaction`,
      async (smartTransaction: SmartTransaction) => {
        const { status } = smartTransaction;
        if (!status || status === SmartTransactionStatuses.PENDING) {
          return;
        }
        if (this.#shouldUpdateApprovalRequest && !this.#approvalEnded) {
          await this.#updateApprovalRequest({
            smartTransaction,
          });
        }
      },
    );
  };

  #waitForTransactionHash = ({
    uuid,
  }: {
    uuid: string;
  }): Promise<string | null> =>
    new Promise((resolve) => {
      this.#smartTransactionsController.eventEmitter.on(
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

  #cleanup = () => {
    if (this.#approvalEnded) {
      return;
    }
    this.#approvalEnded = true;
  };

  #updateSwapsTransactions = (id: string) => {
    // We do this so we can show the Swap data (e.g. ETH to USDC, fiat values) in the app/components/Views/TransactionsView/index.js
    const newSwapsTransactions =
      // @ts-expect-error This is not defined on the type, but is a field added in app/components/UI/Swaps/QuotesView.js
      this.#transactionController.state.swapsTransactions || {};

    newSwapsTransactions[id] = newSwapsTransactions[this.#transactionMeta.id];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.#transactionController as any).update((state: any) => {
      state.swapsTransactions = newSwapsTransactions;
    });
  };
}

export const submitSmartTransactionHook = (
  request: SubmitSmartTransactionRequest,
) => {
  const smartTransactionHook = new SmartTransactionHook(request);
  return smartTransactionHook.submit();
};
