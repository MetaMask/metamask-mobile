import { toHex } from '@metamask/controller-utils';
import { NetworkClientId } from '@metamask/network-controller';
import type { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import {
  type PublishBatchHookRequest,
  type PublishBatchHookResult,
  type PublishBatchHookTransaction,
  type PublishHookResult,
  type ShouldSignHook,
  type TransactionController,
  type TransactionControllerOptions,
  type TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  TransactionPayControllerMessenger,
  TransactionPayPublishHook,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';

import type { RootState } from '../../../reducers';
import {
  getSmartTransactionsFeatureFlagsForChain,
  selectShouldUseSmartTransaction,
} from '../../../selectors/smartTransactionsController';
import {
  isNoOpQuote,
  isPayTokenSubmitReady,
} from '../../../selectors/transactionPayController';
import {
  selectMetaMaskPayFlags,
  selectPayQuoteConfig,
} from '../../../selectors/featureFlagController/confirmations';
import { store } from '../../../store';
import type { TransactionControllerInitMessenger } from '../../../core/Engine/wallet-init/messengers/transaction-controller-messenger';
import { updateConfirmationMetric } from '../../../core/redux/slices/confirmationMetrics';
import {
  submitBatchSmartTransactionHook,
  submitSmartTransactionHook,
  type SubmitSmartTransactionRequest,
} from '../../smart-transactions/smart-publish-hook';
import { getTransactionById } from '..';
import { isSendBundleSupported } from '../sentinel-api';
import {
  type GasFeeSponsorshipRequest,
  isDelegationRelaySupported,
  isGasFeeSponsored,
  isSenderEIP7702Supported,
  isSmartTransactionBundleSupported,
} from '../gas-sponsorship';
import { Delegation7702PublishHook } from './delegation-7702-publish';
import {
  PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  QUOTE_REQUIRED_TRANSACTION_TYPES,
} from '../../../components/Views/confirmations/constants/confirmations';
import {
  getPostQuoteTransactionType,
  isGasFeeSponsorshipRequested,
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
): NonNullable<TransactionControllerOptions['hooks']> {
  return {
    beforePublish: beforePublishHook(request),
    beforeSign: beforeSignHook(request),
    // @ts-expect-error - TransactionController actually sends a signedTx as a second argument, but its type doesn't reflect that.
    publish: publishHook(request),
    publishBatch: publishBatchHook(request),
    shouldSign: shouldSignHook(request),
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

function getSponsorshipRequest(
  { getState, initMessenger }: TransactionControllerHookRequest,
  transaction: TransactionMeta,
): GasFeeSponsorshipRequest {
  return {
    getKeyringForAccount: (address: string) =>
      initMessenger.call('KeyringController:getKeyringForAccount', address),
    getState,
    transaction,
  };
}

function hasExecutablePayQuotes(
  transactionMeta: TransactionMeta,
  initMessenger: TransactionControllerInitMessenger,
): boolean {
  const { transactionData } = initMessenger.call(
    'TransactionPayController:getState',
  );
  const quotes = transactionData?.[transactionMeta.id]?.quotes ?? [];

  return quotes.some((quote) => !isNoOpQuote(quote));
}

/**
 * Whether a selected gas fee token is paid through the EIP-7702 relay rather
 * than a Smart Transactions batch. Forced gas fee tokens (for example MetaMask
 * Pay source transactions) always use the relay.
 *
 * @param transactionMeta - The transaction metadata.
 * @param isSmartTransactionBundle - Whether Smart Transactions sendBundle is used.
 * @returns Whether the gas fee token is paid through the EIP-7702 relay.
 */
function isGasFeeTokenPaidByDelegation(
  transactionMeta: TransactionMeta,
  isSmartTransactionBundle: boolean,
): boolean {
  if (!transactionMeta.selectedGasFeeToken) {
    return false;
  }

  return (
    !isSmartTransactionBundle ||
    Boolean(transactionMeta.isGasFeeTokenIgnoredIfBalance) ||
    Boolean(transactionMeta.excludeNativeTokenForFee)
  );
}

function shouldSignHook(
  request: TransactionControllerHookRequest,
): ShouldSignHook {
  const { getState, initMessenger } = request;

  return async ({ transactionMeta }) => {
    const { shouldSign: predictShouldSign } = await initMessenger.call(
      'PredictController:shouldSign',
      { transactionMeta },
    );

    if (!predictShouldSign) {
      return { shouldSign: false };
    }

    if (hasExecutablePayQuotes(transactionMeta, initMessenger)) {
      return { shouldSign: false };
    }

    const isSmartTransactionBundle = await isSmartTransactionBundleSupported(
      getState(),
      transactionMeta.chainId,
    );

    const isDelegationRequested =
      (isGasFeeSponsorshipRequested(transactionMeta) &&
        !isSmartTransactionBundle) ||
      isGasFeeTokenPaidByDelegation(transactionMeta, isSmartTransactionBundle);

    if (!isDelegationRequested) {
      return { shouldSign: true };
    }

    const isDelegationSupported = await isDelegationRelaySupported(
      getSponsorshipRequest(request, transactionMeta),
    );

    return { shouldSign: !isDelegationSupported };
  };
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

function recordSubmissionMethod(
  transactionId: string,
  method: (typeof TRANSACTION_SUBMISSION_METHOD)[keyof typeof TRANSACTION_SUBMISSION_METHOD],
) {
  try {
    store.dispatch(
      updateConfirmationMetric({
        id: transactionId,
        params: {
          properties: {
            [TRANSACTION_SUBMISSION_METHOD_METRIC_NAME]: method,
          },
        },
      }),
    );
  } catch (e) {
    console.error(`Failed to record ${method} metrics fragment`, e);
  }
}

function publishHook(request: TransactionControllerHookRequest) {
  const { getState, getTransactionController, initMessenger } = request;

  return async (
    transactionMeta: TransactionMeta,
    signedTransactionInHex: Hex,
  ): Promise<PublishHookResult> => {
    const { transactionHash: predictTransactionHash } =
      await initMessenger.call('PredictController:publish', {
        transactionMeta,
      });

    if (predictTransactionHash) {
      return { transactionHash: predictTransactionHash };
    }

    const state = getState();

    const { featureFlags, shouldUseSmartTransaction } =
      getSmartTransactionCommonParams(state, transactionMeta.chainId);

    const { stxDisabled } = selectMetaMaskPayFlags(state);

    const payResult = await new TransactionPayPublishHook({
      isSmartTransaction: () => shouldUseSmartTransaction && !stxDisabled,
      messenger: initMessenger as TransactionPayControllerMessenger,
    }).getHook()(transactionMeta, signedTransactionInHex);

    if (payResult?.transactionHash) {
      return payResult;
    }

    validateRequiredQuote(transactionMeta, initMessenger, state);

    const sponsorshipRequest = getSponsorshipRequest(request, transactionMeta);
    const isSponsored = await isGasFeeSponsored(sponsorshipRequest);
    const sendBundleSupport = await isSendBundleSupported(
      transactionMeta.chainId,
    );
    const keyringSupports7702 =
      await isSenderEIP7702Supported(sponsorshipRequest);

    const isRevokeDelegation =
      transactionMeta.type === TransactionType.revokeDelegation;
    const isSwapGasIncluded7702 = Boolean(transactionMeta.isGasFeeIncluded);
    const isSignedExternally =
      !signedTransactionInHex || signedTransactionInHex === '0x';

    if (
      keyringSupports7702 &&
      !isRevokeDelegation &&
      (isSwapGasIncluded7702 ||
        !shouldUseSmartTransaction ||
        !sendBundleSupport ||
        isSignedExternally)
    ) {
      const transactionController = getTransactionController();
      const hook = new Delegation7702PublishHook({
        getNextNonce: (address: string, networkClientId: NetworkClientId) =>
          getNextNonce(transactionController, address, networkClientId),
        isAtomicBatchSupported:
          transactionController.isAtomicBatchSupported.bind(
            transactionController,
          ),
        isSponsored: () => isSponsored,
        messenger: initMessenger,
      }).getHook();

      const result = await hook(transactionMeta, signedTransactionInHex);

      if (result?.transactionHash) {
        recordSubmissionMethod(
          transactionMeta.id,
          TRANSACTION_SUBMISSION_METHOD.SENTINEL_RELAY,
        );

        return { ...result, isGasFeeSponsored: isSponsored };
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
        signedTransactionInHex: isSignedExternally
          ? undefined
          : signedTransactionInHex,
        smartTransactionsController:
          getSmartTransactionsController(initMessenger),
        transactionController: getTransactionController(),
        transactionMeta,
      });

      if (result?.transactionHash) {
        recordSubmissionMethod(
          transactionMeta.id,
          TRANSACTION_SUBMISSION_METHOD.SENTINEL_STX,
        );

        return {
          ...result,
          isGasFeeSponsored: isSponsored && sendBundleSupport,
        };
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
    if (isPayTokenSubmitReady(data)) {
      return;
    }

    throw new Error('MetaMask Pay: Cannot submit without quote');
  }

  // Quotes can be empty for a direct route in the window before the
  // controller stores the no-op quote. Allow that only when the pay config
  // is set and no conversion is pending. A destination token is not
  // required: withdraws with no preferred or last-used token intentionally
  // leave paymentToken unset and default to a direct, same-token transfer
  // (see getBestToken in useAutomaticTransactionPayToken), which never
  // populates sourceAmounts either. A withdraw that lost its quotes or
  // never initialised isPostQuote still cannot submit without the
  // conversion.
  const isValidatedDirectRoute =
    !isQuoteRequiredType &&
    data?.isPostQuote === true &&
    !data.sourceAmounts?.length;

  if (isValidatedDirectRoute) {
    return;
  }

  throw new Error('MetaMask Pay: Cannot submit without quote');
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
