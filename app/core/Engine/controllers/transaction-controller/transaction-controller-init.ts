import {
  TransactionController,
  type TransactionControllerOptions,
  type TransactionControllerMessenger,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { hasProperty } from '@metamask/utils';

import { selectSwapsChainFeatureFlags } from '../../../../reducers/swaps';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import Logger from '../../../../util/Logger';
import { getGlobalChainId } from '../../../../util/networks/global-network';
import {
  submitSmartTransactionHook,
  type SubmitSmartTransactionRequest,
} from '../../../../util/smart-transactions/smart-publish-hook';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import type {
  ControllerInitFunction,
  ControllerInitRequest,
} from '../../types';

export const TransactionControllerInit: ControllerInitFunction<
  TransactionController,
  // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
  TransactionControllerMessenger,
  TransactionControllerInitMessenger
> = (request) => {
  const {
    controllerMessenger,
    getRootState,
    getCurrentChainId,
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
    const transactionController = new TransactionController({
      disableHistory: true,
      disableSendFlowHistory: true,
      disableSwaps: true,
      // @ts-expect-error - TransactionController is missing networkClientId argument in type
      getCurrentNetworkEIP1559Compatibility:
        networkController.getEIP1559Compatibility.bind(networkController),
      // @ts-expect-error - TransactionController expects TransactionMeta[] but SmartTransactionsController returns SmartTransaction[]
      getExternalPendingTransactions: (address: string) =>
        smartTransactionsController.getTransactions({
          addressFrom: address,
          status: SmartTransactionStatuses.PENDING,
        }),
      getGasFeeEstimates:
        gasFeeController.fetchGasFeeEstimates.bind(gasFeeController),
      getNetworkClientRegistry:
        networkController.getNetworkClientRegistry.bind(networkController),
      getNetworkState: () => networkController.state,
      hooks: {
        publish: ((transactionMeta: TransactionMeta) => {
          const state = getRootState();
          const shouldUseSmartTransaction =
            selectShouldUseSmartTransaction(state);
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
        }) as unknown as TransactionControllerOptions['hooks']['publish'],
      },
      incomingTransactions: {
        isEnabled: () => {
          const currentHexChainId = getGlobalChainId(networkController);
          const showIncomingTransactions =
            preferencesController.state?.showIncomingTransactions;
          const currentChainId = getCurrentChainId();
          return Boolean(
            hasProperty(showIncomingTransactions, currentChainId) &&
              showIncomingTransactions?.[
                currentHexChainId as unknown as keyof typeof showIncomingTransactions
              ],
          );
        },
        updateTransactions: true,
      },
      isSimulationEnabled: () =>
        preferencesController.state.useTransactionSimulations,
      messenger: controllerMessenger,
      pendingTransactions: {
        isResubmitEnabled: () => false,
      },
      // @ts-expect-error - Keyring controller expects TxData returned but TransactionController expects TypedTransaction
      sign: keyringController.signTransaction.bind(keyringController),
      state: persistedState.TransactionController,
    });
    return { controller: transactionController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize TransactionController');
    throw error;
  }
};

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
