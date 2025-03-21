import {
  TransactionController,
  type TransactionControllerMessenger,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { hasProperty } from '@metamask/utils';
import { ApprovalController } from '@metamask/approval-controller';
import { NetworkController } from '@metamask/network-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';

import { selectSwapsChainFeatureFlags } from '../../../../reducers/swaps';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import Logger from '../../../../util/Logger';
import { getGlobalChainId as getGlobalChainIdSelector } from '../../../../util/networks/global-network';
import {
  submitSmartTransactionHook,
  type SubmitSmartTransactionRequest,
} from '../../../../util/smart-transactions/smart-publish-hook';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import type {
  ControllerInitFunction,
  ControllerInitRequest,
} from '../../types';
import type { RootState } from '../../../../reducers';

export const TransactionControllerInit: ControllerInitFunction<
  TransactionController,
  // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
  TransactionControllerMessenger,
  TransactionControllerInitMessenger
> = (request) => {
  const {
    controllerMessenger,
    getState,
    getGlobalChainId,
    initMessenger,
    persistedState,
  } = request;

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
          publish: (transactionMeta: TransactionMeta) =>
            publishHook({
              transactionMeta,
              getState,
              transactionController,
              smartTransactionsController,
              approvalController,
              initMessenger,
            }),
        },
        incomingTransactions: {
          isEnabled: () =>
            isIncomingTransactionsEnabled(
              preferencesController,
              networkController,
              getGlobalChainId,
            ),
          updateTransactions: true,
        },
        isSimulationEnabled: () =>
          preferencesController.state.useTransactionSimulations,
        messenger: controllerMessenger,
        pendingTransactions: {
          isResubmitEnabled: () => false,
        },
        // @ts-expect-error - Keyring controller expects TxData returned but TransactionController expects TypedTransaction
        sign: (...args) => keyringController.signTransaction(...args),
        state: persistedState.TransactionController,
      });
    return { controller: transactionController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize TransactionController');
    throw error;
  }
};

function publishHook({
  transactionMeta,
  getState,
  transactionController,
  smartTransactionsController,
  approvalController,
  initMessenger,
}: {
  transactionMeta: TransactionMeta;
  getState: () => RootState;
  transactionController: TransactionController;
  smartTransactionsController: SmartTransactionsController;
  approvalController: ApprovalController;
  initMessenger: TransactionControllerInitMessenger;
}): Promise<{ transactionHash: string }> {
  const state = getState();
  const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state);

  // @ts-expect-error - TransactionController expects transactionHash to be defined but submitSmartTransactionHook could return undefined
  return submitSmartTransactionHook({
    transactionMeta,
    transactionController,
    smartTransactionsController,
    shouldUseSmartTransaction,
    approvalController,
    controllerMessenger:
      initMessenger as unknown as SubmitSmartTransactionRequest['controllerMessenger'],
    featureFlags: selectSwapsChainFeatureFlags(state),
  });
}

function isIncomingTransactionsEnabled(
  preferencesController: PreferencesController,
  networkController: NetworkController,
  getGlobalChainId: () => string,
): boolean {
  const currentHexChainId = getGlobalChainIdSelector(networkController);
  const showIncomingTransactions =
    preferencesController.state?.showIncomingTransactions;
  const currentChainId = getGlobalChainId();
  return Boolean(
    hasProperty(showIncomingTransactions, currentChainId) &&
      showIncomingTransactions?.[
        currentHexChainId as unknown as keyof typeof showIncomingTransactions
      ],
  );
}

function getControllers(
  request: ControllerInitRequest<
    // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
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
