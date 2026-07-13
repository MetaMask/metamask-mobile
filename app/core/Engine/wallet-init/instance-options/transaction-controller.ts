import {
  TransactionController,
  TransactionType,
  type TransactionMeta,
  type TransactionControllerOptions,
} from '@metamask/transaction-controller';
import type { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import type { WalletOptions } from '@metamask/wallet';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';

import {
  REDESIGNED_TRANSACTION_TYPES,
  RELAY_DEPOSIT_TYPES,
} from '../../../../components/Views/confirmations/constants/confirmations';
import { hasTransactionType } from '../../../../components/Views/confirmations/utils/transaction';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import type { RootState } from '../../../../reducers';
import AppConstants from '../../../../core/AppConstants';
import { trace } from '../../../../util/trace';
import { accountSupports7702 } from '../../../../util/transactions/account-supports-7702';
import { isSendBundleSupported } from '../../../../util/transactions/sentinel-api';
import { getTransactionControllerHooks } from '../../../../util/transactions/hooks';
import type { TransactionEventHandlerRequest } from '../../controllers/transaction-controller/types';
import {
  handleTransactionApprovedEventForMetrics,
  handleTransactionRejectedEventForMetrics,
  handleTransactionSubmittedEventForMetrics,
  handleTransactionAddedEventForMetrics,
  handleTransactionFinalizedEventForMetrics,
} from '../../controllers/transaction-controller/event-handlers/metrics';
import { handleShowNotification } from '../../controllers/transaction-controller/event-handlers/notification';
import { handleUnapprovedTransactionAddedForMoneyAccount } from '../../controllers/transaction-controller/event-handlers/money-account-override';
import { TransactionControllerInitMessenger } from '../messengers/transaction-controller-messenger';

type TransactionControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['transactionController']
>;

interface GetTransactionControllerInstanceOptionsRequest {
  getState: () => RootState;
  initMessenger: TransactionControllerInitMessenger;
}

interface SetupTransactionControllerListenersRequest {
  getState: () => RootState;
  messenger: TransactionControllerInitMessenger;
}

/**
 * Build the client-specific `TransactionController` options for the
 * `@metamask/wallet` `Wallet`. The wallet owns the controller messenger and
 * persisted state, so those are excluded here.
 *
 * @param request - The request bag.
 * @param request.getState - Returns the current Redux root state.
 * @param request.initMessenger - The TransactionController init messenger.
 * @returns The TransactionController instance options.
 */
export function getTransactionControllerInstanceOptions({
  getState,
  initMessenger,
}: GetTransactionControllerInstanceOptionsRequest): TransactionControllerInstanceOptions {
  const transactionController = getTransactionController(initMessenger);

  return {
    disableSwaps: true,
    hooks: getTransactionControllerHooks({
      getState,
      getTransactionController: () => transactionController,
      initMessenger,
    }),
    isAutomaticGasFeeUpdateEnabled,
    isEIP7702GasFeeTokensEnabled: isEIP7702GasFeeTokensEnabled.bind(null, {
      getState,
      messenger: initMessenger,
    }),
    isFirstTimeInteractionEnabled: () =>
      isFirstTimeInteractionEnabled(initMessenger),
    isSimulationEnabled: () =>
      initMessenger.call('PreferencesController:getState')
        .useTransactionSimulations,
    publicKeyEIP7702: AppConstants.EIP_7702_PUBLIC_KEY as Hex | undefined,
    // Expected type mismatch with TransactionControllerOptions['trace']
    trace: trace as unknown as TransactionControllerOptions['trace'],
  };
}

/**
 * Subscribe the mobile-specific metrics, notification, and money-account
 * listeners to the `TransactionController` events over the init messenger.
 *
 * @param request - The request bag.
 * @param request.getState - Returns the current Redux root state.
 * @param request.messenger - The TransactionController init messenger.
 */
export function setupTransactionControllerListeners({
  getState,
  messenger,
}: SetupTransactionControllerListenersRequest) {
  const transactionEventHandlerRequest: TransactionEventHandlerRequest = {
    getState,
    initMessenger: messenger,
    smartTransactionsController: getSmartTransactionsController(messenger),
  };

  messenger.subscribe(
    'TransactionController:transactionApproved',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleShowNotification(transactionMeta);
    },
  );

  messenger.subscribe(
    'TransactionController:transactionApproved',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionApprovedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  messenger.subscribe(
    'TransactionController:transactionConfirmed',
    (transactionMeta: TransactionMeta) => {
      handleTransactionFinalizedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  messenger.subscribe(
    'TransactionController:transactionDropped',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionFinalizedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  messenger.subscribe(
    'TransactionController:transactionFailed',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionFinalizedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  messenger.subscribe(
    'TransactionController:transactionRejected',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionRejectedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  messenger.subscribe(
    'TransactionController:transactionSubmitted',
    ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      handleTransactionSubmittedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  messenger.subscribe(
    'TransactionController:unapprovedTransactionAdded',
    (transactionMeta: TransactionMeta) => {
      handleTransactionAddedEventForMetrics(
        transactionMeta,
        transactionEventHandlerRequest,
      );
    },
  );

  messenger.subscribe(
    'TransactionController:unapprovedTransactionAdded',
    handleUnapprovedTransactionAddedForMoneyAccount,
  );
}

function isFirstTimeInteractionEnabled(
  initMessenger: TransactionControllerInitMessenger,
): boolean {
  return (
    initMessenger.call('PreferencesController:getState')
      ?.securityAlertsEnabled === true
  );
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

/**
 * Creates a messenger-based mock of `TransactionController` for use inside
 * the publish hooks.  All calls are routed through the init messenger so that
 * no real controller instance is passed around.
 *
 * Follows the same pattern as `getSmartTransactionsController` above.
 *
 * @param messenger - The TransactionController init messenger.
 * @returns A TransactionController-shaped object backed by messenger actions.
 */
function getTransactionController(
  messenger: TransactionControllerInitMessenger,
): TransactionController {
  return {
    get state() {
      return messenger.call('TransactionController:getState');
    },
    getNonceLock: (
      ...args: Parameters<TransactionController['getNonceLock']>
    ) => messenger.call('TransactionController:getNonceLock', ...args),
    isAtomicBatchSupported: (
      ...args: Parameters<TransactionController['isAtomicBatchSupported']>
    ) =>
      messenger.call('TransactionController:isAtomicBatchSupported', ...args),
    approveTransactionsWithSameNonce: (
      ...args: Parameters<
        TransactionController['approveTransactionsWithSameNonce']
      >
    ) =>
      messenger.call(
        'TransactionController:approveTransactionsWithSameNonce',
        ...args,
      ),
  } as unknown as TransactionController;
}

async function isEIP7702GasFeeTokensEnabled(
  {
    getState,
    messenger,
  }: {
    getState: () => RootState;
    messenger: TransactionControllerInitMessenger;
  },
  transactionMeta: TransactionMeta,
): Promise<boolean> {
  if (
    !(await accountSupports7702(
      transactionMeta.txParams?.from,
      getKeyringController(messenger),
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
  const isSendBundleSupportedChain = await isSendBundleSupported(chainId);

  // EIP7702 gas fee tokens are enabled when:
  // - Smart transactions are NOT enabled, OR
  // - Send bundle is NOT supported, OR
  // - Gas fee token was provided when creating transaction
  return (
    !isSmartTransactionEnabled ||
    !isSendBundleSupportedChain ||
    Boolean(isExternalSign)
  );
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
