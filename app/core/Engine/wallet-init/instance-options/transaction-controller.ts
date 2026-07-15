import {
  GasFeeEstimateLevel,
  TransactionController,
  TransactionType,
  UserFeeLevel,
  type SavedGasFees,
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
import AppConstants from '../../../../core/AppConstants';
import { store } from '../../../../store';
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
import type { PreferencesStateWithSavedGasFees } from '../../controllers/preferences-controller-types';

type TransactionControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['transactionController']
>;

interface GetTransactionControllerInstanceOptionsRequest {
  initMessenger: TransactionControllerInitMessenger;
}

interface SetupTransactionControllerListenersRequest {
  messenger: TransactionControllerInitMessenger;
}

/**
 * Build the client-specific `TransactionController` options for the
 * `@metamask/wallet` `Wallet`. The wallet owns the controller messenger and
 * persisted state, so those are excluded here.
 *
 * @param request - The request bag.
 * @param request.initMessenger - The TransactionController init messenger.
 * @returns The TransactionController instance options.
 */
export function getTransactionControllerInstanceOptions({
  initMessenger,
}: GetTransactionControllerInstanceOptionsRequest): TransactionControllerInstanceOptions {
  const transactionController = getTransactionController(initMessenger);

  return {
    disableSwaps: true,
    hooks: getTransactionControllerHooks({
      getState: store.getState,
      getTransactionController: () => transactionController,
      initMessenger,
    }),
    isAutomaticGasFeeUpdateEnabled,
    isEIP7702GasFeeTokensEnabled: isEIP7702GasFeeTokensEnabled.bind(null, {
      messenger: initMessenger,
    }),
    isFirstTimeInteractionEnabled: () =>
      isFirstTimeInteractionEnabled(initMessenger),
    isSimulationEnabled: () =>
      initMessenger.call('PreferencesController:getState')
        .useTransactionSimulations,
    getSavedGasFees: (chainIdOrTransactionMeta) =>
      getSavedGasFees(chainIdOrTransactionMeta, initMessenger),
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
 * @param request.messenger - The TransactionController init messenger.
 */
export function setupTransactionControllerListeners({
  messenger,
}: SetupTransactionControllerListenersRequest) {
  const transactionEventHandlerRequest: TransactionEventHandlerRequest = {
    getState: store.getState,
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
    messenger,
  }: {
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
  const state = store.getState();

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
