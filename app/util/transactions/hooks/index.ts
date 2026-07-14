import { toHex } from '@metamask/controller-utils';
import { NetworkClientId } from '@metamask/network-controller';
import type { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import {
  type PublishBatchHookRequest,
  type PublishBatchHookResult,
  type PublishBatchHookTransaction,
  type TransactionController,
  type TransactionControllerOptions,
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  type TransactionData,
  TransactionPayControllerMessenger,
  TransactionPayPublishHook,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';

import type { RootState } from '../../../reducers';
import {
  getSmartTransactionsFeatureFlagsForChain,
  selectShouldUseSmartTransaction,
} from '../../../selectors/smartTransactionsController';
import { isNoOpQuote } from '../../../selectors/transactionPayController';
import {
  selectMetaMaskPayFlags,
  selectPayQuoteConfig,
} from '../../../selectors/featureFlagController/confirmations';
import { store } from '../../../store';
import type { TransactionControllerInitMessenger } from '../../../core/Engine/messengers/transaction-controller-messenger';
import { updateConfirmationMetric } from '../../../core/redux/slices/confirmationMetrics';
import {
  submitBatchSmartTransactionHook,
  submitSmartTransactionHook,
  type SubmitSmartTransactionRequest,
} from '../../smart-transactions/smart-publish-hook';
import { getTransactionById } from '..';
import { accountSupports7702 } from '../account-supports-7702';
import { isSendBundleSupported } from '../sentinel-api';
import { Delegation7702PublishHook } from './delegation-7702-publish';
import {
  PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  QUOTE_REQUIRED_TRANSACTION_TYPES,
} from '../../../components/Views/confirmations/constants/confirmations';
import {
  getPostQuoteTransactionType,
  hasTransactionType,
} from '../../../components/Views/confirmations/utils/transaction';

const TRANSACTION_SUBMISSION_METHOD_METRIC_NAME =
  'transaction_submission_method';

const TRANSACTION_SUBMISSION_METHOD = {
  SENTINEL_RELAY: 'sentinel_relay',
  SENTINEL_STX: 'sentinel_stx',
} as const;

export interface TransactionControllerHookRequest {
  getState: () => RootState;
  getTransactionController: () => TransactionController;
  initMessenger: TransactionControllerInitMessenger;
}

export function getTransactionControllerHooks(
  request: TransactionControllerHookRequest,
): TransactionControllerOptions['hooks'] {
  return {
    beforePublish: beforePublishHook(request),
    beforeSign: beforeSignHook(request),
    // @ts-expect-error - TransactionController actually sends a signedTx as a second argument, but its type doesn't reflect that.
    publish: publishHook(request),
    publishBatch: publishBatchHook(request),
  };
}

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

function beforePublishHook({
  initMessenger,
}: TransactionControllerHookRequest) {
  return (transactionMeta: TransactionMeta) =>
    initMessenger.call('PredictController:beforePublish', {
      transactionMeta,
    });
}

function beforeSignHook({ initMessenger }: TransactionControllerHookRequest) {
  return (hookRequest: { transactionMeta: TransactionMeta }) =>
    initMessenger.call('PredictController:beforeSign', hookRequest);
}

function publishHook({
  getState,
  getTransactionController,
  initMessenger,
}: TransactionControllerHookRequest) {
  return async (
    transactionMeta: TransactionMeta,
    signedTransactionInHex: Hex,
  ): Promise<{ transactionHash?: string }> => {
    const { transactionHash: predictTransactionHash } =
      await initMessenger.call('PredictController:publish', {
        transactionMeta,
      });

    if (predictTransactionHash) {
      return { transactionHash: predictTransactionHash };
    }

    const state = getState();

    const { shouldUseSmartTransaction, featureFlags } =
      getSmartTransactionCommonParams(state, transactionMeta.chainId);
    const sendBundleSupport = await isSendBundleSupported(
      transactionMeta.chainId,
    );

    const { stxDisabled } = selectMetaMaskPayFlags(state);

    const payResult = await new TransactionPayPublishHook({
      isSmartTransaction: () => shouldUseSmartTransaction && !stxDisabled,
      messenger: initMessenger as TransactionPayControllerMessenger,
    }).getHook()(transactionMeta, signedTransactionInHex);

    if (payResult?.transactionHash) {
      return payResult;
    }

    validateRequiredQuote(transactionMeta, initMessenger, state);

    const { isExternalSign } = transactionMeta;
    const isRevokeDelegation =
      transactionMeta.type === TransactionType.revokeDelegation;

    const keyringSupports7702 = await accountSupports7702(
      transactionMeta.txParams?.from,
      getKeyringController(initMessenger),
    );

    const isSwapGasIncluded7702 = Boolean(transactionMeta.isGasFeeIncluded);

    if (
      keyringSupports7702 &&
      !isRevokeDelegation &&
      (isSwapGasIncluded7702 ||
        !shouldUseSmartTransaction ||
        !sendBundleSupport ||
        isExternalSign)
    ) {
      const transactionController = getTransactionController();
      const hook = new Delegation7702PublishHook({
        getNextNonce: (address: string, networkClientId: NetworkClientId) =>
          getNextNonce(transactionController, address, networkClientId),
        isAtomicBatchSupported:
          transactionController.isAtomicBatchSupported.bind(
            transactionController,
          ),
        messenger: initMessenger,
      }).getHook();

      const result = await hook(transactionMeta, signedTransactionInHex);
      if (result?.transactionHash) {
        try {
          store.dispatch(
            updateConfirmationMetric({
              id: transactionMeta.id,
              params: {
                properties: {
                  [TRANSACTION_SUBMISSION_METHOD_METRIC_NAME]:
                    TRANSACTION_SUBMISSION_METHOD.SENTINEL_RELAY,
                },
              },
            }),
          );
        } catch (e) {
          console.error('Failed to record sentinel_relay metrics fragment', e);
        }
        return result;
      }
    }

    if (
      shouldUseSmartTransaction &&
      (sendBundleSupport || transactionMeta.selectedGasFeeToken === undefined)
    ) {
      const result = await submitSmartTransactionHook({
        controllerMessenger:
          initMessenger as unknown as SubmitSmartTransactionRequest['controllerMessenger'],
        featureFlags,
        shouldUseSmartTransaction,
        signedTransactionInHex,
        smartTransactionsController:
          getSmartTransactionsController(initMessenger),
        transactionController: getTransactionController(),
        transactionMeta,
      });

      if (result?.transactionHash) {
        try {
          store.dispatch(
            updateConfirmationMetric({
              id: transactionMeta.id,
              params: {
                properties: {
                  [TRANSACTION_SUBMISSION_METHOD_METRIC_NAME]:
                    TRANSACTION_SUBMISSION_METHOD.SENTINEL_STX,
                },
              },
            }),
          );
        } catch (e) {
          console.error('Failed to record sentinel_stx metrics fragment', e);
        }
        return result;
      }
    }

    return { transactionHash: undefined };
  };
}

function validateRequiredQuote(
  transactionMeta: TransactionMeta,
  messenger: TransactionControllerInitMessenger,
  state: RootState,
) {
  const isQuoteRequiredType = hasTransactionType(
    transactionMeta,
    QUOTE_REQUIRED_TRANSACTION_TYPES,
  );

  const isPayTokenRequiredType = hasTransactionType(
    transactionMeta,
    PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  );

  const postQuoteType = getPostQuoteTransactionType(transactionMeta);

  const isPostQuoteWithdraw =
    Boolean(postQuoteType) &&
    selectPayQuoteConfig(state, postQuoteType).enabled === true;

  if (!isQuoteRequiredType && !isPostQuoteWithdraw && !isPayTokenRequiredType) {
    return;
  }

  const { transactionData } = messenger.call(
    'TransactionPayController:getState',
  );

  const data = transactionData?.[transactionMeta.id];
  const quotes = data?.quotes ?? [];

  // No-op quotes mark a direct route but cannot be executed, so they are not
  // sufficient on their own. Ignoring them keeps this guard consistent with
  // the confirmation alerts, which read quotes through the same filter, and
  // lets the direct-route checks below decide instead.
  const executableQuotes = quotes.filter((quote) => !isNoOpQuote(quote));

  if (executableQuotes.length) {
    return;
  }

  if (isPayTokenRequiredType) {
    if (isValidatedDirectDeposit(data)) {
      return;
    }

    throw new Error('MetaMask Pay: Cannot submit without quote');
  }

  // Quotes can be empty for a direct route in the window before the
  // controller stores the no-op quote. Allow that only when the pay config
  // and destination token are set and no conversion is pending, so a withdraw
  // that lost its quotes or was never initialised cannot submit without the
  // conversion.
  const isValidatedDirectRoute =
    !isQuoteRequiredType &&
    data?.isPostQuote === true &&
    Boolean(data.paymentToken) &&
    !data.sourceAmounts?.length;

  if (isValidatedDirectRoute) {
    return;
  }

  throw new Error('MetaMask Pay: Cannot submit without quote');
}

/**
 * A pay-type deposit or conversion may submit without quotes only when the
 * user pays with the required token itself and the controller recorded no
 * pending conversion. Anything else (payment token missing or different, or
 * a required conversion without a quote) means the transaction would land
 * without funds, so it must not submit.
 *
 * @param data - Pay state for the transaction.
 * @returns Whether direct submission is safe.
 */
function isValidatedDirectDeposit(data: TransactionData | undefined): boolean {
  const paymentToken = data?.paymentToken;

  if (!paymentToken) {
    return false;
  }

  const tokens = data?.tokens ?? [];
  const requiredToken = tokens.find((token) => !token.skipIfBalance);

  const isPayingWithRequiredToken =
    Boolean(requiredToken) &&
    requiredToken?.chainId === paymentToken.chainId &&
    requiredToken?.address.toLowerCase() === paymentToken.address.toLowerCase();

  if (!isPayingWithRequiredToken) {
    return false;
  }

  const hasRequiredConversion = (data?.sourceAmounts ?? []).some(
    (sourceAmount) =>
      !tokens.find((token) => token.address === sourceAmount.targetTokenAddress)
        ?.skipIfBalance,
  );

  return !hasRequiredConversion;
}

function getSmartTransactionCommonParams(state: RootState, chainId: Hex) {
  const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
    state,
    chainId,
  );
  const featureFlags = getSmartTransactionsFeatureFlagsForChain(state, chainId);

  return {
    featureFlags,
    shouldUseSmartTransaction,
  };
}

function publishBatchHook({
  getState,
  getTransactionController,
  initMessenger,
}: TransactionControllerHookRequest) {
  return async (
    request: PublishBatchHookRequest,
  ): Promise<PublishBatchHookResult> => {
    const transactionController = getTransactionController();
    const transactions = request.transactions as PublishBatchHookTransaction[];

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
      return undefined;
    }

    const result = await submitBatchSmartTransactionHook({
      controllerMessenger:
        initMessenger as unknown as SubmitSmartTransactionRequest['controllerMessenger'],
      featureFlags,
      shouldUseSmartTransaction,
      smartTransactionsController:
        getSmartTransactionsController(initMessenger),
      transactionController,
      transactionMeta,
      transactions,
    });

    if (result) {
      for (const tx of transactions) {
        if (tx.id) {
          try {
            store.dispatch(
              updateConfirmationMetric({
                id: tx.id,
                params: {
                  properties: {
                    [TRANSACTION_SUBMISSION_METHOD_METRIC_NAME]:
                      TRANSACTION_SUBMISSION_METHOD.SENTINEL_STX,
                  },
                },
              }),
            );
          } catch (e) {
            console.error(
              'Failed to record sentinel_stx metrics fragment for batch tx',
              e,
            );
          }
        }
      }
    }

    return result;
  };
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
    getFees: (...args: Parameters<SmartTransactionsController['getFees']>) =>
      messenger.call('SmartTransactionsController:getFees', ...args),
    setStatusRefreshInterval: (
      ...args: Parameters<
        SmartTransactionsController['setStatusRefreshInterval']
      >
    ) =>
      messenger.call(
        'SmartTransactionsController:setStatusRefreshInterval',
        ...args,
      ),
    submitSignedTransactions: (
      ...args: Parameters<
        SmartTransactionsController['submitSignedTransactions']
      >
    ) =>
      messenger.call(
        'SmartTransactionsController:submitSignedTransactions',
        ...args,
      ),
  } as unknown as SmartTransactionsController;
}
