import {
  TransactionController,
  TransactionType,
  type TransactionControllerMessenger,
  type TransactionMeta,
  type PublishBatchHookRequest,
  type PublishBatchHookTransaction,
  type PublishBatchHookResult,
} from '@metamask/transaction-controller';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { Hex } from '@metamask/utils';
import { ApprovalController } from '@metamask/approval-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';

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
import { PayHook } from '../../../../util/transactions/hooks/pay-hook';

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
        },
        incomingTransactions: {
          isEnabled: () => isIncomingTransactionsEnabled(preferencesController),
          updateTransactions: true,
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
        publicKeyEIP7702: AppConstants.EIP_7702_PUBLIC_KEY as Hex | undefined,
      });

    addTransactionControllerListeners({
      initMessenger,
      getState,
      smartTransactionsController,
    });

    return { controller: transactionController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize TransactionController');
    throw error;
  }
};

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
}): Promise<{ transactionHash: string }> {
  const state = getState();

  const { shouldUseSmartTransaction, featureFlags } =
    getSmartTransactionCommonParams(state, transactionMeta.chainId);

  await new PayHook({
    messenger: initMessenger,
  }).getHook()(transactionMeta, signedTransactionInHex);

  // @ts-expect-error - TransactionController expects transactionHash to be defined but submitSmartTransactionHook could return undefined
  return submitSmartTransactionHook({
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
    throw new Error(
      'publishBatchSmartTransactionHook: Smart Transaction is required for batch submissions',
    );
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
