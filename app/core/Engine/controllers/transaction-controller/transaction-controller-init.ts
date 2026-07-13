import {
  GasFeeEstimateLevel,
  TransactionController,
  TransactionType,
  UserFeeLevel,
  type SavedGasFees,
  type TransactionControllerMessenger,
  type TransactionMeta,
  TransactionControllerOptions,
} from '@metamask/transaction-controller';
import type { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import { Hex } from '@metamask/utils';

import {
  REDESIGNED_TRANSACTION_TYPES,
  RELAY_DEPOSIT_TYPES,
} from '../../../../components/Views/confirmations/constants/confirmations';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import Logger from '../../../../util/Logger';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import type { MessengerClientInitFunction } from '../../types';
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
import { handleUnapprovedTransactionAddedForMoneyAccount } from './event-handlers/money-account-override';
import { trace } from '../../../../util/trace';
import { accountSupports7702 } from '../../../../util/transactions/account-supports-7702';
import { isSendBundleSupported } from '../../../../util/transactions/sentinel-api';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { hasTransactionType } from '../../../../components/Views/confirmations/utils/transaction';
import { getTransactionControllerHooks } from '../../../../util/transactions/hooks';
import type { PreferencesStateWithSavedGasFees } from '../preferences-controller-types';

export const TransactionControllerInit: MessengerClientInitFunction<
  TransactionController,
  TransactionControllerMessenger,
  TransactionControllerInitMessenger
> = (request) => {
  const { controllerMessenger, getState, initMessenger, persistedState } =
    request;

  addTransactionControllerListeners({
    initMessenger,
    getState,
    smartTransactionsController: getSmartTransactionsController(initMessenger),
  });

  try {
    const transactionController: TransactionController =
      new TransactionController({
        disableSwaps: true,
        hooks: getTransactionControllerHooks({
          getState,
          getTransactionController: () => transactionController,
          initMessenger,
        }),
        isAutomaticGasFeeUpdateEnabled,
        isEIP7702GasFeeTokensEnabled: async (transactionMeta) => {
          if (
            !(await accountSupports7702(
              transactionMeta.txParams?.from,
              getKeyringController(initMessenger),
            ))
          ) {
            return false;
          }

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
        isFirstTimeInteractionEnabled: () =>
          isFirstTimeInteractionEnabled(initMessenger),
        isSimulationEnabled: () =>
          initMessenger.call('PreferencesController:getState')
            .useTransactionSimulations,
        getSavedGasFees: (chainIdOrTransactionMeta) =>
          getSavedGasFees(chainIdOrTransactionMeta, initMessenger),
        messenger: controllerMessenger,
        publicKeyEIP7702: AppConstants.EIP_7702_PUBLIC_KEY as Hex | undefined,
        state: persistedState.TransactionController,
        // Expected type mismatch with TransactionControllerOptions['trace']
        trace: trace as unknown as TransactionControllerOptions['trace'],
      });

    return { controller: transactionController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize TransactionController');
    throw error;
  }
};

function isFirstTimeInteractionEnabled(
  initMessenger: TransactionControllerInitMessenger,
): boolean {
  return (
    initMessenger.call('PreferencesController:getState')
      ?.securityAlertsEnabled === true
  );
}

/**
 * Retrieve saved gas fee preferences for the transaction account and chain.
 */
function getSavedGasFees(
  chainIdOrTransactionMeta: Hex | TransactionMeta,
  initMessenger: TransactionControllerInitMessenger,
): SavedGasFees | undefined {
  const selectedAccount = initMessenger.call(
    'AccountsController:getSelectedAccount',
  )?.address;
  const isTransactionMeta = typeof chainIdOrTransactionMeta !== 'string';
  const transactionMeta = isTransactionMeta
    ? chainIdOrTransactionMeta
    : undefined;
  const account = transactionMeta?.txParams.from ?? selectedAccount;

  if (!account) {
    return undefined;
  }

  const normalizedAccount = account.toLowerCase();
  const chainId = isTransactionMeta
    ? chainIdOrTransactionMeta.chainId
    : chainIdOrTransactionMeta;

  const preferencesState = initMessenger.call(
    'PreferencesController:getState',
  ) as PreferencesStateWithSavedGasFees;

  const savedGasFeePreference =
    preferencesState.advancedGasFee?.[chainId]?.[normalizedAccount];

  if (!savedGasFeePreference) {
    return undefined;
  }

  const { gasPrice, maxBaseFee, priorityFee, userFeeLevel } =
    savedGasFeePreference;

  if (userFeeLevel !== UserFeeLevel.CUSTOM) {
    return {
      level: userFeeLevel as UserFeeLevel | GasFeeEstimateLevel,
    } as unknown as SavedGasFees;
  }

  if (gasPrice) {
    return { gasPrice, level: UserFeeLevel.CUSTOM } as unknown as SavedGasFees;
  }

  if (!maxBaseFee || !priorityFee) {
    return undefined;
  }

  return {
    maxBaseFee,
    priorityFee,
    level: UserFeeLevel.CUSTOM,
  } as unknown as SavedGasFees;
}

function getKeyringController(messenger: TransactionControllerInitMessenger) {
  return {
    getKeyringForAccount: (address: string) =>
      messenger.call('KeyringController:getKeyringForAccount', address),
  };
}

function getSmartTransactionsController(
  messenger: TransactionControllerInitMessenger,
): SmartTransactionsController {
  return {
    getSmartTransactionByMinedTxHash: (
      ...args: Parameters<
        SmartTransactionsController['getSmartTransactionByMinedTxHash']
      >
    ) =>
      messenger.call(
        'SmartTransactionsController:getSmartTransactionByMinedTxHash',
        ...args,
      ),
  } as unknown as SmartTransactionsController;
}

function isAutomaticGasFeeUpdateEnabled(transaction: TransactionMeta) {
  if (hasTransactionType(transaction, RELAY_DEPOSIT_TYPES)) {
    return false;
  }

  if (
    transaction.origin === ORIGIN_METAMASK &&
    transaction.type === TransactionType.tokenMethodApprove
  ) {
    return false;
  }

  return REDESIGNED_TRANSACTION_TYPES.includes(
    transaction.type as TransactionType,
  );
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

  initMessenger.subscribe(
    'TransactionController:unapprovedTransactionAdded',
    handleUnapprovedTransactionAddedForMoneyAccount,
  );
}
