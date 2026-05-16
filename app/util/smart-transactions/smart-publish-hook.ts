import {
  TransactionParams,
  TransactionController,
  TransactionMeta,
  type PublishBatchHookTransaction,
} from '@metamask/transaction-controller';
import {
  SignedTransactionWithMetadata,
  SmartTransactionsController,
  SmartTransactionsControllerSmartTransactionEvent,
  SmartTransactionsNetworkConfig,
  SmartTransactionStatuses,
  type Fee,
  type Fees,
  type SmartTransaction,
} from '@metamask/smart-transactions-controller';
import Logger from '../Logger';
import { decimalToHex } from '../conversions';
import { RAMPS_SEND } from '../../components/UI/Ramp/Aggregator/constants';
import { Messenger } from '@metamask/messenger';
import { Hex } from '@metamask/utils';
import { getTransactionById, isLegacyTransaction } from '../transactions';
import {
  getClientForTransactionMetadata,
  sanitizeOrigin,
} from '../../constants/smartTransactions';

type AllowedActions = never;

type AllowedEvents = SmartTransactionsControllerSmartTransactionEvent;

export interface SubmitSmartTransactionRequest {
  transactionMeta: TransactionMeta;
  signedTransactionInHex?: Hex;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  controllerMessenger: Messenger<
    'SmartPublishHook',
    AllowedActions,
    AllowedEvents
  >;
  shouldUseSmartTransaction: boolean;
  featureFlags: SmartTransactionsNetworkConfig;
  transactions?: PublishBatchHookTransaction[];
}

const DEFAULT_BATCH_STATUS_POLLING_INTERVAL = 1000;
const LOG_PREFIX = 'STX publishHook';
// It has to be 21000 for cancel transactions, otherwise the API would reject it.
const CANCEL_GAS = 21000;
export const STX_NO_HASH_ERROR =
  'Smart Transaction does not have a transaction hash, there was a problem';

class SmartTransactionHook {
  #chainId: Hex;
  #featureFlags: SmartTransactionsNetworkConfig;
  #shouldUseSmartTransaction: boolean;
  #smartTransactionsController: SmartTransactionsController;
  #transactionController: TransactionController;
  #transactionMeta: TransactionMeta;
  #signedTransactionInHex?: Hex;
  #txParams: TransactionParams;
  #controllerMessenger: SubmitSmartTransactionRequest['controllerMessenger'];

  #mobileReturnTxHashAsap: boolean;
  #transactions?: PublishBatchHookTransaction[];

  constructor(request: SubmitSmartTransactionRequest) {
    const {
      transactionMeta,
      signedTransactionInHex,
      smartTransactionsController,
      controllerMessenger,
      transactionController,
      shouldUseSmartTransaction,
      featureFlags,
      transactions,
    } = request;
    this.#transactionMeta = transactionMeta;
    this.#signedTransactionInHex = signedTransactionInHex;
    this.#smartTransactionsController = smartTransactionsController;
    this.#transactionController = transactionController;
    this.#shouldUseSmartTransaction = shouldUseSmartTransaction;
    this.#featureFlags = featureFlags;
    this.#chainId = transactionMeta.chainId;
    this.#txParams = transactionMeta.txParams;
    this.#controllerMessenger = controllerMessenger;
    this.#mobileReturnTxHashAsap =
      this.#featureFlags?.mobileReturnTxHashAsap ?? false;
    this.#transactions = transactions;
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
      this.#transactionMeta.origin === RAMPS_SEND ||
      isLegacyTransaction(this.#transactionMeta)
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

      const batchStatusPollingInterval =
        this.#featureFlags?.batchStatusPollingInterval ??
        DEFAULT_BATCH_STATUS_POLLING_INTERVAL;
      if (batchStatusPollingInterval) {
        // if the interval if undefined, the controller will set 5 seconds by default.
        // Better to make sure it's set to something lower.
        this.#smartTransactionsController.setStatusRefreshInterval(
          batchStatusPollingInterval,
        );
      }

      const submitTransactionResponse = await this.#signAndSubmitTransactions({
        getFeesResponse,
      });
      const uuid = submitTransactionResponse?.uuid;
      if (!uuid) {
        throw new Error('No smart transaction UUID');
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
    }
  }

  #validateSubmitBatch = () => {
    if (!this.#shouldUseSmartTransaction) {
      throw new Error(
        `${LOG_PREFIX}: Smart Transaction is required for batch submissions`,
      );
    }
    if (!this.#transactions || this.#transactions.length === 0) {
      throw new Error(
        `${LOG_PREFIX}: A list of transactions are required for batch submissions`,
      );
    }
  };

  async submitBatch() {
    this.#validateSubmitBatch();
    const txIds = this.#transactions?.map((tx) => tx.id) ?? [];
    console.log(
      LOG_PREFIX,
      'submitBatch START — txIds:',
      txIds,
      'signedTx count:',
      this.#transactions?.filter((tx) => tx.signedTx).length ?? 0,
      'chainId:',
      this.#chainId,
    );

    try {
      const batchStatusPollingInterval =
        this.#featureFlags?.batchStatusPollingInterval ??
        DEFAULT_BATCH_STATUS_POLLING_INTERVAL;
      if (batchStatusPollingInterval) {
        this.#smartTransactionsController.setStatusRefreshInterval(
          batchStatusPollingInterval,
        );
      }

      console.log(
        LOG_PREFIX,
        'submitBatch — calling #signAndSubmitTransactions...',
      );
      const submitTransactionResponse = await this.#signAndSubmitTransactions();
      const uuid = submitTransactionResponse?.uuid;
      console.log(
        LOG_PREFIX,
        'submitBatch — #signAndSubmitTransactions returned, uuid:',
        uuid,
        'txHashes:',
        submitTransactionResponse?.txHashes,
      );
      if (!uuid) {
        throw new Error('No smart transaction UUID');
      }

      let stxStatusResolved = false;
      this.#controllerMessenger.subscribe(
        'SmartTransactionsController:smartTransaction',
        (stx: any) => {
          if (stxStatusResolved) return;
          if (stx.uuid === uuid) {
            console.log(
              LOG_PREFIX,
              'submitBatch — STX STATUS UPDATE for uuid:',
              uuid,
              'status:', stx.status,
              'minedTx:', stx.statusMetadata?.minedTx,
              'cancellationReason:', stx.statusMetadata?.cancellationReason,
              'isSettled:', stx.statusMetadata?.isSettled,
              'minedHash:', stx.statusMetadata?.minedHash,
              'originalTransactionStatus:', stx.statusMetadata?.originalTransactionStatus,
            );
            if (stx.status && stx.status !== 'pending') {
              stxStatusResolved = true;
            }
          }
        },
      );

      const transactionHash = await this.#getTransactionHash(
        submitTransactionResponse,
        uuid,
      );
      console.log(
        LOG_PREFIX,
        'submitBatch — got transactionHash:',
        transactionHash,
      );
      if (transactionHash === null) {
        throw new Error(
          'Transaction does not have a transaction hash in the publish batch hook, there was a problem',
        );
      }

      let submitBatchResponse;
      if (submitTransactionResponse?.txHashes) {
        submitBatchResponse = {
          results: submitTransactionResponse.txHashes.map((txHash: Hex) => ({
            transactionHash: txHash,
          })),
        };
      } else {
        submitBatchResponse = {
          results: [],
        };
      }

      console.log(
        LOG_PREFIX,
        'submitBatch SUCCESS — returning',
        submitBatchResponse.results.length,
        'results',
      );
      return submitBatchResponse;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(
        LOG_PREFIX,
        'submitBatch FAILED — error:',
        error?.message ?? error,
        'txIds:',
        txIds,
      );
      Logger.error(
        error,
        `${LOG_PREFIX} Error in smart transaction publish batch hook`,
      );
      throw error;
    }
  }

  #getFees = async () => {
    try {
      return await this.#smartTransactionsController.getFees(
        { ...this.#txParams, chainId: this.#chainId },
        undefined,
        { networkClientId: this.#transactionMeta.networkClientId },
      );
    } catch (error) {
      return undefined;
    }
  };

  #getTransactionHash = async (
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitTransactionResponse: any,
    uuid: string,
  ) => {
    let transactionHash: string | undefined | null;

    if (this.#mobileReturnTxHashAsap && submitTransactionResponse?.txHash) {
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
    getFeesResponse?: Fees;
  } = {}) => {
    let signedTransactionsWithMetadata: SignedTransactionWithMetadata[] = [];
    let signedTransactions: string[] = [];
    if (
      this.#transactions &&
      Array.isArray(this.#transactions) &&
      this.#transactions.length > 0
    ) {
      console.log(
        LOG_PREFIX,
        '#signAndSubmitTransactions — BATCH MODE, tx count:',
        this.#transactions.length,
        'txIds:',
        this.#transactions.map((t) => t.id),
        'with signedTx:',
        this.#transactions.filter((t) => t.signedTx).length,
      );
      signedTransactionsWithMetadata = this.#transactions
        .filter((tx) => tx?.signedTx)
        .map((tx) => {
          const transactionMeta = getTransactionById(
            tx.id ?? '',
            this.#transactionController,
          );
          if (!transactionMeta) {
            console.warn(
              LOG_PREFIX,
              '#signAndSubmitTransactions — txMeta NOT FOUND for id:',
              tx.id,
              '(metadata will be missing)',
            );
          }
          const signedTx: SignedTransactionWithMetadata = { tx: tx.signedTx };
          if (transactionMeta) {
            signedTx.metadata = {
              txType: transactionMeta.type,
              client: getClientForTransactionMetadata(),
              origin: sanitizeOrigin(transactionMeta.origin),
            };
          }
          return signedTx;
        });
    } else if (this.#signedTransactionInHex) {
      console.log(
        LOG_PREFIX,
        '#signAndSubmitTransactions — SINGLE TX MODE (signedTransactionInHex)',
      );
      signedTransactionsWithMetadata = [
        {
          tx: this.#signedTransactionInHex,
          metadata: {
            txType: this.#transactionMeta.type,
            client: getClientForTransactionMetadata(),
            origin: sanitizeOrigin(this.#transactionMeta.origin),
          },
        },
      ];
    } else if (getFeesResponse) {
      console.log(
        LOG_PREFIX,
        '#signAndSubmitTransactions — FEES MODE (creating signed txs from getFeesResponse)',
      );
      const signed = await this.#createSignedTransactions(
        getFeesResponse.tradeTxFees?.fees ?? [],
        false,
      );
      signedTransactionsWithMetadata = signed.map((signedTx) => ({
        tx: signedTx,
        metadata: {
          txType: this.#transactionMeta.type,
          client: getClientForTransactionMetadata(),
          origin: sanitizeOrigin(this.#transactionMeta.origin),
        },
      }));
    }
    signedTransactions = signedTransactionsWithMetadata.map((tx) => tx.tx);
    console.log(
      LOG_PREFIX,
      '#signAndSubmitTransactions — submitting',
      signedTransactions.length,
      'signed txs to STX controller, hasMetadata:',
      signedTransactionsWithMetadata.filter((t) => t.metadata).length,
    );
    for (const [i, stx] of this.#transactions?.entries() ?? []) {
      const meta = stx?.id
        ? getTransactionById(stx.id, this.#transactionController)
        : undefined;
      if (meta) {
        console.log(
          LOG_PREFIX,
          `#signAndSubmitTransactions — txMeta[${i}]`,
          'id:', meta.id,
          'type:', meta.type,
          'nonce:', meta.txParams.nonce,
          'maxFeePerGas:', meta.txParams.maxFeePerGas,
          'maxPriorityFeePerGas:', meta.txParams.maxPriorityFeePerGas,
          'gas:', meta.txParams.gas,
          'to:', meta.txParams.to,
          'value:', meta.txParams.value,
          'chainId:', meta.chainId,
          'status:', meta.status,
        );
      }
    }
    try {
      console.log(
        LOG_PREFIX,
        '#signAndSubmitTransactions — txParams passed to submitSignedTransactions:',
        'nonce:', this.#txParams.nonce,
        'from:', this.#txParams.from,
        'maxFeePerGas:', this.#txParams.maxFeePerGas,
        'maxPriorityFeePerGas:', this.#txParams.maxPriorityFeePerGas,
        'gas:', this.#txParams.gas,
        'to:', this.#txParams.to,
        'value:', this.#txParams.value,
        'chainId:', this.#chainId,
        'requiresNonceCheck:', !this.#txParams.nonce ? 'YES - STX controller will acquire nonce lock' : 'NO - nonce already set',
      );
      const response = await this.#smartTransactionsController.submitSignedTransactions({
        signedTransactions,
        signedTransactionsWithMetadata,
        signedCanceledTransactions: [],
        txParams: this.#txParams,
        transactionMeta: this.#transactionMeta,
        networkClientId: this.#transactionMeta.networkClientId,
      });
      console.log(
        LOG_PREFIX,
        '#signAndSubmitTransactions — submitSignedTransactions returned, uuid:',
        response?.uuid,
        'txHashes:',
        response?.txHashes,
      );
      return response;
    } catch (error) {
      console.error(
        LOG_PREFIX,
        '#signAndSubmitTransactions — submitSignedTransactions THREW:',
        error,
      );
      throw error;
    }
  };

  #waitForTransactionHash = ({
    uuid,
  }: {
    uuid: string;
  }): Promise<string | null> =>
    new Promise((resolve) => {
      this.#controllerMessenger.subscribe(
        'SmartTransactionsController:smartTransaction',
        async (smartTransaction: SmartTransaction) => {
          if (uuid === smartTransaction.uuid) {
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
          }
        },
      );
    });
}

export const submitSmartTransactionHook = (
  request: SubmitSmartTransactionRequest,
) => {
  const smartTransactionHook = new SmartTransactionHook(request);
  return smartTransactionHook.submit();
};

export const submitBatchSmartTransactionHook = (
  request: SubmitSmartTransactionRequest,
) => {
  const smartTransactionHook = new SmartTransactionHook(request);
  return smartTransactionHook.submitBatch();
};
