import {
  TransactionController,
  TransactionType,
  type TransactionControllerMessenger,
  type TransactionMeta,
  type PublishBatchHookRequest,
  type PublishBatchHookTransaction,
  type PublishBatchHookResult,
  TransactionControllerOptions,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { ApprovalController } from '@metamask/approval-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  SmartTransactionsController,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller';

import { REDESIGNED_TRANSACTION_TYPES } from '../../../../components/Views/confirmations/constants/confirmations';
import { selectSwapsChainFeatureFlags } from '../../../../reducers/swaps';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import Logger from '../../../../util/Logger';
import {
  submitSmartTransactionHook,
  submitBatchSmartTransactionHook,
  type SubmitSmartTransactionRequest,
} from '../../../../util/smart-transactions/smart-publish-hook';
import { getTransactionById } from '../../../../util/transactions';
import type { RootState } from '../../../../reducers';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import type {
  ControllerInitFunction,
  ControllerInitRequest,
} from '../../types';
import AppConstants from '../../../../core/AppConstants';
import type { TransactionEventHandlerRequest } from './types';
import {
  handleTransactionApprovedEventForMetrics,
  handleTransactionRejectedEventForMetrics,
  handleTransactionSubmittedEventForMetrics,
  handleTransactionAddedEventForMetrics,
  handleTransactionFinalizedEventForMetrics,
} from './event-handlers/metrics';
import { handleShowNotification } from './event-handlers/notification';
import {
  TransactionPayControllerMessenger,
  TransactionPayPublishHook,
} from '@metamask/transaction-pay-controller';
import { trace } from '../../../../util/trace';
import { Delegation7702PublishHook } from '../../../../util/transactions/hooks/delegation-7702-publish';
import { isSendBundleSupported } from '../../../../util/transactions/sentinel-api';
import { NetworkClientId } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';

export const TransactionControllerInit: ControllerInitFunction<
  TransactionController,
  TransactionControllerMessenger,
  TransactionControllerInitMessenger
> = (request) => {
  const { controllerMessenger, getState, initMessenger, persistedState } =
    request;

  const {
    approvalController,
    gasFeeController,
    keyringController,
    networkController,
    preferencesController,
    smartTransactionsController,
  } = getControllers(request);

  addTransactionControllerListeners({
    initMessenger,
    getState,
    smartTransactionsController,
  });

  try {
    const transactionController: TransactionController =
      new TransactionController({
        isAutomaticGasFeeUpdateEnabled: ({ type }) =>
          REDESIGNED_TRANSACTION_TYPES.includes(type as TransactionType),
        disableHistory: true,
        disableSendFlowHistory: true,
        disableSwaps: true,
        getCurrentNetworkEIP1559Compatibility: (...args) =>
          // @ts-expect-error Controller type does not support undefined return value
          networkController.getEIP1559Compatibility(...args),
        // @ts-expect-error - TransactionController expects TransactionMeta[] but SmartTransactionsController returns SmartTransaction[]
        getExternalPendingTransactions: (address: string) =>
          smartTransactionsController.getTransactions({
            addressFrom: address,
            status: SmartTransactionStatuses.PENDING,
          }),
        getGasFeeEstimates: (...args) =>
          gasFeeController.fetchGasFeeEstimates(...args),
        getNetworkClientRegistry: (...args) =>
          networkController.getNetworkClientRegistry(...args),
        // @ts-expect-error Type mismatch due to @metamask/network-controller version mismatch.
        // The latest version (v27.0.0+) adds NetworkStatus.Degraded enum value
        // See: https://github.com/MetaMask/core/pull/7186
        getNetworkState: () => networkController.state,
        hooks: {
          // @ts-expect-error - TransactionController actually sends a signedTx as a second argument, but its type doesn't reflect that.
          publish: (
            transactionMeta: TransactionMeta,
            signedTransactionInHex: Hex,
          ) =>
            publishHook({
              transactionMeta,
              getState,
              transactionController,
              smartTransactionsController,
              approvalController,
              initMessenger,
              signedTransactionInHex,
            }),
          publishBatch: async (_request: PublishBatchHookRequest) =>
            await publishBatchSmartTransactionHook({
              transactionController,
              smartTransactionsController,
              initMessenger,
              getState,
              approvalController,
              transactions:
                _request.transactions as PublishBatchHookTransaction[],
            }),
          beforeSign: (_request: { transactionMeta: TransactionMeta }) =>
            beforeSign(_request, request),
        },
        incomingTransactions: {
          isEnabled: () => isIncomingTransactionsEnabled(preferencesController),
          updateTransactions: true,
        },
        isEIP7702GasFeeTokensEnabled: async (transactionMeta) => {
          const { chainId, isExternalSign } = transactionMeta;
          const state = getState();

          const isSmartTransactionEnabled = selectShouldUseSmartTransaction(
            state,
            chainId,
          );
          const isSendBundleSupportedChain =
            await isSendBundleSupported(chainId);

          // EIP7702 gas fee tokens are enabled when:
          // - Smart transactions are NOT enabled, OR
          // - Send bundle is NOT supported, OR
          // - Gas fee token was provided when creating transaction
          return (
            !isSmartTransactionEnabled ||
            !isSendBundleSupportedChain ||
            Boolean(isExternalSign)
          );
        },
        isSimulationEnabled: () =>
          preferencesController.state.useTransactionSimulations,
        messenger: controllerMessenger,
        pendingTransactions: {
          isResubmitEnabled: () => false,
        },
        // @ts-expect-error - TransactionMeta mismatch type with TypedTransaction from '@ethereumjs/tx'
        sign: (...args) => keyringController.signTransaction(...args),
        state: persistedState.TransactionController,
        // Expected type mismatch with TransactionControllerOptions['trace']
        trace: trace as unknown as TransactionControllerOptions['trace'],
        publicKeyEIP7702: AppConstants.EIP_7702_PUBLIC_KEY as Hex | undefined,
      });

    return { controller: transactionController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize TransactionController');
    throw error;
  }
};

async function getNextNonce(
  transactionController: TransactionController,
  address: string,
  networkClientId: NetworkClientId,
): Promise<Hex> {
  const nonceLock = await transactionController.getNonceLock(
    address,
    networkClientId,
  );
  nonceLock.releaseLock();
  return toHex(nonceLock.nextNonce);
}

async function publishHook({
  transactionMeta,
  getState,
  transactionController,
  smartTransactionsController,
  approvalController,
  initMessenger,
  signedTransactionInHex,
}: {
  transactionMeta: TransactionMeta;
  getState: () => RootState;
  transactionController: TransactionController;
  smartTransactionsController: SmartTransactionsController;
  approvalController: ApprovalController;
  initMessenger: TransactionControllerInitMessenger;
  signedTransactionInHex: Hex;
}): Promise<{ transactionHash?: string }> {
  const state = getState();

  const { shouldUseSmartTransaction, featureFlags } =
    getSmartTransactionCommonParams(state, transactionMeta.chainId);
  const sendBundleSupport = await isSendBundleSupported(
    transactionMeta.chainId,
  );

  const payResult = await new TransactionPayPublishHook({
    isSmartTransaction: () => shouldUseSmartTransaction,
    messenger: initMessenger as TransactionPayControllerMessenger,
  }).getHook()(transactionMeta, signedTransactionInHex);

  if (payResult?.transactionHash) {
    return payResult;
  }

  const { isExternalSign } = transactionMeta;

  if (!shouldUseSmartTransaction || !sendBundleSupport || isExternalSign) {
    const hook = new Delegation7702PublishHook({
      isAtomicBatchSupported: transactionController.isAtomicBatchSupported.bind(
        transactionController,
      ),
      messenger: initMessenger,
      getNextNonce: (address: string, networkClientId: NetworkClientId) =>
        getNextNonce(transactionController, address, networkClientId),
    }).getHook();

    const result = await hook(transactionMeta, signedTransactionInHex);
    if (result?.transactionHash) {
      return result;
    }
    // else, fall back to regular regular transaction submission
  }

  if (
    shouldUseSmartTransaction &&
    (sendBundleSupport || transactionMeta.selectedGasFeeToken === undefined)
  ) {
    const result = await submitSmartTransactionHook({
      transactionMeta,
      transactionController,
      smartTransactionsController,
      shouldUseSmartTransaction,
      approvalController,
      controllerMessenger:
        initMessenger as unknown as SubmitSmartTransactionRequest['controllerMessenger'],
      featureFlags,
      signedTransactionInHex,
    });

    if (result?.transactionHash) {
      return result;
    }
  }

  // Default: fall back to regular transaction submission
  return { transactionHash: undefined };
}

function getSmartTransactionCommonParams(state: RootState, chainId?: Hex) {
  const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
    state,
    chainId,
  );
  const featureFlags = selectSwapsChainFeatureFlags(state, chainId);

  return {
    shouldUseSmartTransaction,
    featureFlags,
  };
}

function publishBatchSmartTransactionHook({
  transactionController,
  smartTransactionsController,
  initMessenger,
  getState,
  approvalController,
  transactions,
}: {
  transactionController: TransactionController;
  smartTransactionsController: SmartTransactionsController;
  initMessenger: TransactionControllerInitMessenger;
  getState: () => RootState;
  approvalController: ApprovalController;
  transactions: PublishBatchHookTransaction[];
}): Promise<PublishBatchHookResult> {
  // Get transactionMeta based on the last transaction ID
  const lastTransaction = transactions[transactions.length - 1];
  const transactionMeta = getTransactionById(
    lastTransaction.id ?? '',
    transactionController,
  );
  const state = getState();

  if (!transactionMeta) {
    throw new Error(
      `publishBatchSmartTransactionHook: Could not find transaction with id ${lastTransaction.id}`,
    );
  }

  const { shouldUseSmartTransaction, featureFlags } =
    getSmartTransactionCommonParams(state, transactionMeta.chainId);

  if (!shouldUseSmartTransaction) {
    return Promise.resolve(undefined);
  }

  return submitBatchSmartTransactionHook({
    transactions,
    transactionController,
    smartTransactionsController,
    controllerMessenger:
      initMessenger as unknown as SubmitSmartTransactionRequest['controllerMessenger'],
    shouldUseSmartTransaction,
    approvalController,
    featureFlags,
    transactionMeta,
  });
}

function isIncomingTransactionsEnabled(
  preferencesController: PreferencesController,
): boolean {
  return preferencesController.state?.privacyMode !== true;
}

function getControllers(
  request: ControllerInitRequest<
    TransactionControllerMessenger,
    TransactionControllerInitMessenger
  >,
) {
  return {
    approvalController: request.getController('ApprovalController'),
    gasFeeController: request.getController('GasFeeController'),
    keyringController: request.getController('KeyringController'),
    networkController: request.getController('NetworkController'),
    preferencesController: request.getController('PreferencesController'),
    smartTransactionsController: request.getController(
      'SmartTransactionsController',
    ),
  };
}

function beforeSign(
  hookRequest: { transactionMeta: TransactionMeta },
  request: ControllerInitRequest<
    TransactionControllerMessenger,
    TransactionControllerInitMessenger
  >,
) {
  const predictController = request.getController('PredictController');
  return predictController.beforeSign(hookRequest);
}

function addTransactionControllerListeners(
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  const { initMessenger } = transactionEventHandlerRequest;

  initMessenger.subscribe(
    'TransactionController:transactionApproved',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleShowNotification(transactionMeta);
    },
  );

  initMessenger.subscribe(
    'TransactionController:transactionApproved',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionApprovedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  initMessenger.subscribe(
    'TransactionController:transactionConfirmed',
    (transactionMeta: TransactionMeta) => {
      handleTransactionFinalizedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  initMessenger.subscribe(
    'TransactionController:transactionDropped',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionFinalizedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  initMessenger.subscribe(
    'TransactionController:transactionFailed',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionFinalizedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  initMessenger.subscribe(
    'TransactionController:transactionRejected',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionRejectedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  initMessenger.subscribe(
    'TransactionController:transactionSubmitted',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionSubmittedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  initMessenger.subscribe(
    'TransactionController:unapprovedTransactionAdded',
    (transactionMeta: TransactionMeta) => {
      handleTransactionAddedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );
}
