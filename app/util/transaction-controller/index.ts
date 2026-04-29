import { Hex } from '@metamask/utils';
import {
  GasFeeEstimateType,
  TransactionParams,
  TransactionEnvelopeType,
  TransactionController as BaseTransactionController,
  IsAtomicBatchSupportedRequest,
  IsAtomicBatchSupportedResult,
  Result,
} from '@metamask/transaction-controller';
import { NetworkClientId } from '@metamask/network-controller';

import Engine from '../../core/Engine';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import { store } from '../../store';
import {
  getTempoEvmTransactionOptions,
  getTempoTransactionBatchArgs,
  isTempoChain,
  isTempoTransactionType,
} from '../tempo/tempo-tx-utils';
import { accountSupports7702 } from '../transactions/account-supports-7702';
import Logger from '../Logger';

// Making the function graceful to avoid regression risks.
export function getChainIdFromNetworkClientId(
  networkClientId: string,
): Hex | undefined {
  try {
    const { NetworkController } = Engine.context;
    const networkConfig =
      NetworkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );
    if (!networkConfig) {
      return undefined;
    }
    const { chainId } = networkConfig;
    return chainId;
  } catch (err) {
    Logger.log('Unable to get chain id from neworkClientId', networkClientId);
    return undefined;
  }
}

async function addTempoTransaction({
  transaction,
  options,
  chainId,
}: {
  transaction: TransactionParams;
  options: Parameters<BaseTransactionController['addTransaction']>[1];
  chainId: Hex;
}): Promise<Result> {
  const { KeyringController, TransactionController } = Engine.context;
  const isEip7702SupportedByAccount = await accountSupports7702(
    transaction.from,
    KeyringController as Parameters<typeof accountSupports7702>[1],
  );
  // Classic transaction, we simply set pathUSD as default
  // and add excludeNativeTokenForFee to signal to ignore native.
  // We enter this flow is dApp non-0x76 txs as well as send flow.
  if (!isTempoTransactionType(transaction)) {
    // We use the `to` field to determine if the tx is a contract deployment.
    if (!transaction.to) {
      Logger.log(
        'addTransactionOnTempo: Smart-Contract deployment tx detected. Fallback to classic tx.',
      );
      return TransactionController.addTransaction(transaction, options);
    }
    if (!isEip7702SupportedByAccount) {
      Logger.log(
        'addTransactionOnTempo: Tempo chain but wallet does not support 7702. Falling back to legacy transactions',
      );
      return TransactionController.addTransaction(transaction, options);
    }
    return TransactionController.addTransaction(
      transaction,
      getTempoEvmTransactionOptions({
        options,
        chainId,
      }),
    );
  } else if (!isEip7702SupportedByAccount) {
    throw new Error('Wallet not supported for Tempo Transactions.');
  }

  const result = await TransactionController.addTransactionBatch(
    getTempoTransactionBatchArgs({
      transaction,
      options,
      chainId,
    }),
  );

  const { batchId } = result;
  const transactionMeta = TransactionController?.getTransactions({
    searchCriteria: { batchId },
  })?.[0];

  if (!transactionMeta) {
    Logger.log(
      `Batch submitted with id ${batchId} but no matching transaction found in transactionController.`,
    );
    throw new Error(
      'Tempo Transaction: Unable to determine if transaction was successful.',
    );
  }

  if (!transactionMeta.hash) {
    Logger.log(
      `Batch submitted with id ${batchId} but transaction found in transactionController does not have a hash.`,
    );
    throw new Error(
      'Tempo Transaction: Unable to determine if transaction was successful.',
    );
  }

  return {
    transactionMeta,
    result: Promise.resolve(transactionMeta.hash),
  };
}

export async function addTransaction(
  transaction: TransactionParams,
  opts: Parameters<BaseTransactionController['addTransaction']>[1],
) {
  const chainId = getChainIdFromNetworkClientId(opts.networkClientId);
  if (chainId && isTempoChain(chainId)) {
    return await addTempoTransaction({ transaction, options: opts, chainId });
  }

  const { TransactionController } = Engine.context;
  return await TransactionController.addTransaction(transaction, opts);
}

export async function updateAtomicBatchData(batchData: {
  transactionId: string;
  transactionData: Hex;
  transactionIndex: number;
}) {
  const { TransactionController } = Engine.context;

  return await TransactionController.updateAtomicBatchData(batchData);
}

export async function addTransactionBatch(
  ...args: Parameters<BaseTransactionController['addTransactionBatch']>
) {
  const { TransactionController } = Engine.context;

  return await TransactionController.addTransactionBatch(...args);
}

// Keeping this export as function to put more logic in the future
export async function estimateGas(
  transaction: TransactionParams,
  networkClientId: NetworkClientId,
) {
  const { TransactionController } = Engine.context;
  return await TransactionController.estimateGas(transaction, networkClientId);
}

export async function estimateGasFee({
  transactionParams,
  chainId,
}: {
  transactionParams: TransactionParams;
  chainId: Hex;
}) {
  const { TransactionController } = Engine.context;

  return await TransactionController.estimateGasFee({
    transactionParams,
    chainId,
  });
}

// Proxy methods
export function handleMethodData(
  ...args: Parameters<BaseTransactionController['handleMethodData']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.handleMethodData(...args);
}

export function getNonceLock(
  ...args: Parameters<BaseTransactionController['getNonceLock']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.getNonceLock(...args);
}

export function speedUpTransaction(
  ...args: Parameters<BaseTransactionController['speedUpTransaction']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.speedUpTransaction(...args);
}

export function startIncomingTransactionPolling() {
  const isBasicFunctionalityToggleEnabled = selectBasicFunctionalityEnabled(
    store.getState(),
  );

  if (isBasicFunctionalityToggleEnabled) {
    const { TransactionController } = Engine.context;
    return TransactionController.startIncomingTransactionPolling();
  }
}

export function stopIncomingTransactionPolling() {
  const { TransactionController } = Engine.context;
  return TransactionController.stopIncomingTransactionPolling();
}

export function updateIncomingTransactions() {
  const isBasicFunctionalityToggleEnabled = selectBasicFunctionalityEnabled(
    store.getState(),
  );

  if (isBasicFunctionalityToggleEnabled) {
    const { TransactionController } = Engine.context;
    return TransactionController.updateIncomingTransactions();
  }
}

export function updateSecurityAlertResponse(
  ...args: Parameters<BaseTransactionController['updateSecurityAlertResponse']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateSecurityAlertResponse(...args);
}

export function updateTransaction(
  ...args: Parameters<BaseTransactionController['updateTransaction']>
) {
  const { TransactionController } = Engine.context;
  const { txParams, id } = args[0];

  // This is a temporary fix to ensure legacy transaction confirmations does not override expected gas properties
  // Once redesign is complete, this can be removed
  sanitizeTransactionParamsGasValues(id, txParams);

  return TransactionController.updateTransaction(...args);
}

export function wipeTransactions(
  ...args: Parameters<BaseTransactionController['wipeTransactions']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.wipeTransactions(...args);
}

export function updateEditableParams(
  ...args: Parameters<BaseTransactionController['updateEditableParams']>
) {
  const { TransactionController } = Engine.context;
  const id = args[0];
  const txParams = args[1];

  // This is a temporary fix to ensure legacy transaction confirmations does not override expected gas properties
  // Once redesign is complete, this can be removed
  sanitizeTransactionParamsGasValues(id, txParams);

  return TransactionController.updateEditableParams(...args);
}

export function updateTransactionGasFees(
  ...args: Parameters<BaseTransactionController['updateTransactionGasFees']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateTransactionGasFees(...args);
}

export function updatePreviousGasParams(
  ...args: Parameters<BaseTransactionController['updatePreviousGasParams']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updatePreviousGasParams(...args);
}

/**
 * Reads the latest `previousGas` for a transaction.
 */
export function getPreviousGasFromController(txId: string | null | undefined) {
  if (!txId) return undefined;
  const { TransactionController } = Engine.context;
  const tx = TransactionController.getTransactions({
    searchCriteria: { id: txId },
  })?.[0];
  return tx?.previousGas;
}

export const getNetworkNonce = async (
  { from }: { from: string },
  networkClientId: NetworkClientId,
) => {
  const { nextNonce, releaseLock } = await getNonceLock(from, networkClientId);

  releaseLock();

  return nextNonce;
};

export function updateSelectedGasFeeToken(
  transactionId: string,
  selectedGasFeeToken?: Hex,
) {
  const { TransactionController } = Engine.context;

  return TransactionController.updateSelectedGasFeeToken(
    transactionId,
    selectedGasFeeToken,
  );
}

export function updateRequiredTransactionIds(
  ...args: Parameters<BaseTransactionController['updateRequiredTransactionIds']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateRequiredTransactionIds(...args);
}

export async function isAtomicBatchSupported(
  request: IsAtomicBatchSupportedRequest,
): Promise<IsAtomicBatchSupportedResult> {
  const { TransactionController } = Engine.context;
  return TransactionController?.isAtomicBatchSupported(request);
}

function sanitizeTransactionParamsGasValues(
  transactionId: string,
  requestedTransactionParamsToUpdate: Partial<TransactionParams>,
) {
  const { TransactionController } = Engine.context;

  const transactionMeta = TransactionController?.getTransactions({
    searchCriteria: { id: transactionId },
  })?.[0];

  if (!transactionMeta || !requestedTransactionParamsToUpdate) {
    return;
  }

  const envelopeType = transactionMeta.txParams.type;

  if (envelopeType === TransactionEnvelopeType.legacy) {
    requestedTransactionParamsToUpdate.type = TransactionEnvelopeType.legacy;
    delete requestedTransactionParamsToUpdate.maxFeePerGas;
    delete requestedTransactionParamsToUpdate.maxPriorityFeePerGas;
  } else if (envelopeType === TransactionEnvelopeType.feeMarket) {
    requestedTransactionParamsToUpdate.type = TransactionEnvelopeType.feeMarket;
    if (
      transactionMeta?.gasFeeEstimates?.type === GasFeeEstimateType.GasPrice
    ) {
      // Try picking 1559 gas properties in order to ensure legacy transaction confirmations is setting expected gas properties
      // 1. Requested change
      // 2. Existing txParams
      // 3. Existing gasFeeEstimates
      requestedTransactionParamsToUpdate.maxFeePerGas =
        requestedTransactionParamsToUpdate?.maxFeePerGas ||
        transactionMeta?.txParams?.maxFeePerGas ||
        transactionMeta?.gasFeeEstimates?.gasPrice;
      requestedTransactionParamsToUpdate.maxPriorityFeePerGas =
        requestedTransactionParamsToUpdate?.maxPriorityFeePerGas ||
        transactionMeta?.txParams?.maxPriorityFeePerGas ||
        transactionMeta?.gasFeeEstimates?.gasPrice;
    }
    delete requestedTransactionParamsToUpdate.gasPrice;
  }
}
