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
  buildBatchTransactionsFromTempoTransactionCalls,
  checkIsValidTempoTransaction,
  getTempoConfig,
  isTempoTransactionType,
} from '../tempo/tempo-tx-utils';

async function addTempoTransaction(
  transaction: TransactionParams,
  opts: Parameters<BaseTransactionController['addTransaction']>[1],
): Promise<Result> {
  checkIsValidTempoTransaction(transaction);
  const tempoConfig = getTempoConfig();
  // There doesn't seem to be any alternative to chainId here.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const chainId = transaction.chainId!;
  const tempoConfigForChain = tempoConfig.perChainConfig[chainId];

  if (!tempoConfigForChain) {
    throw new Error(
      `Tempo transactions are not supported for chain: ${chainId}`,
    );
  }

  if (!tempoConfigForChain.enabled) {
    throw new Error(`Tempo transactions are disabled for chain: ${chainId}`);
  }

  const tempoBatchRequestParams = {
    from: transaction.from as Hex,
    transactions: buildBatchTransactionsFromTempoTransactionCalls(transaction),
    // If no token is provided, we force a default one so we don't fall in
    // fee preference algo: https://docs.tempo.xyz/protocol/fees/spec-fee#fee-token-preferences
    gasFeeToken: transaction.feeToken || tempoConfigForChain.defaultFeeToken,
    excludeNativeTokenForFee: true,
  };

  const { TransactionController } = Engine.context;

  const result = await TransactionController.addTransactionBatch({
    ...tempoBatchRequestParams,
    ...opts,
  });

  const { batchId } = result;
  const transactionMeta = TransactionController?.getTransactions({
    searchCriteria: { batchId },
  })?.[0];

  if (!transactionMeta) {
    throw new Error(
      `Batch submitted with id ${batchId} but no matching transaction found in transactionController.`,
    );
  }

  if (!transactionMeta.hash) {
    throw new Error(
      `Batch submitted with id ${batchId} but transaction found in transactionController does not have a hash.`,
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
  if (isTempoTransactionType(transaction)) {
    return await addTempoTransaction(transaction, opts);
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
