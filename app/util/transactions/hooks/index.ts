import { toHex } from '@metamask/controller-utils';
import { NetworkClientId } from '@metamask/network-controller';
import type { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import {
  type IsGasSponsoredHook,
  type PublishBatchHookRequest,
  type PublishBatchHookResult,
  type PublishBatchHookTransaction,
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
import { isRelaySupported } from '../transaction-relay';
import { accountSupports7702 } from '../account-supports-7702';
import { isSendBundleSupported } from '../sentinel-api';
import { Delegation7702PublishHook } from './delegation-7702-publish';
import {
  PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  QUOTE_REQUIRED_TRANSACTION_TYPES,
} from '../../../components/Views/confirmations/constants/confirmations';
import { getPostQuoteTransactionType } from '../../../components/Views/confirmations/utils/transaction';

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
  const approvalDecisions = createTransactionApprovalDecisionCache(request);

  return {
    beforePublish: beforePublishHook(request, approvalDecisions),
    beforeSign: beforeSignHook(request, approvalDecisions),
    isSponsored: isSponsoredHook(approvalDecisions),
    // @ts-expect-error - TransactionController actually sends a signedTx as a second argument, but its type doesn't reflect that.
    publish: publishHook(request, approvalDecisions),
    publishBatch: publishBatchHook(request),
    shouldSign: shouldSignHook(approvalDecisions),
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

interface TransactionApprovalDecision {
  keyringSupports7702: boolean;
  sendBundleSupport: boolean;
  shouldUseSmartTransaction: boolean;
  signingMode: 'local' | 'external';
  sponsorshipEnabled: boolean;
}

interface TransactionApprovalDecisionCache {
  clear: (transactionId: string) => void;
  get: (
    transactionMeta: TransactionMeta,
  ) => Promise<TransactionApprovalDecision>;
}

function createTransactionApprovalDecisionCache(
  request: TransactionControllerHookRequest,
): TransactionApprovalDecisionCache {
  const decisions = new Map<string, Promise<TransactionApprovalDecision>>();

  return {
    clear: (transactionId) => decisions.delete(transactionId),
    get: (transactionMeta) => {
      const existingDecision = decisions.get(transactionMeta.id);

      if (existingDecision) {
        return existingDecision;
      }

      const decision = getTransactionApprovalDecision(request, transactionMeta);
      decisions.set(transactionMeta.id, decision);
      return decision;
    },
  };
}

async function getTransactionApprovalDecision(
  { getState, initMessenger }: TransactionControllerHookRequest,
  transactionMeta: TransactionMeta,
): Promise<TransactionApprovalDecision> {
  const state = getState();
  const { chainId, txParams } = transactionMeta;

  const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
    state,
    chainId,
  );
  const sendBundleSupport = await isSendBundleSupported(chainId);
  const isSmartTransactionAndBundleSupported = Boolean(
    shouldUseSmartTransaction && sendBundleSupport,
  );
  const keyringSupports7702 = await accountSupports7702(
    txParams?.from,
    getKeyringController(initMessenger),
    false,
  );

  const is7702Supported = Boolean(
    !isSmartTransactionAndBundleSupported &&
      keyringSupports7702 &&
      (await isRelaySupported(chainId)) &&
      txParams?.to !== undefined,
  );

  // Predict still uses this compatibility marker to hand external signing
  // policy from its beforeSign hook to the shared shouldSign hook.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const isPreparedForExternalSigning = Boolean(transactionMeta.isExternalSign);
  const requiresExternalSigning = Boolean(
    isPreparedForExternalSigning ||
      (transactionMeta.selectedGasFeeToken && is7702Supported),
  );

  // Explicit sponsorship metadata remains the migration fallback when Core
  // does not refresh availability because simulation is disabled.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const legacySponsorshipEnabled = Boolean(transactionMeta.isGasFeeSponsored);
  const isSponsorshipAvailable =
    transactionMeta.isGasFeeSponsoredAvailable ?? legacySponsorshipEnabled;
  const sponsorshipEnabled =
    isSponsorshipAvailable &&
    transactionMeta.type !== TransactionType.revokeDelegation &&
    (isSmartTransactionAndBundleSupported || is7702Supported);

  const signingMode: 'local' | 'external' = requiresExternalSigning
    ? 'external'
    : 'local';

  return {
    keyringSupports7702,
    sendBundleSupport,
    shouldUseSmartTransaction,
    signingMode,
    sponsorshipEnabled,
  };
}

function isSponsoredHook(
  approvalDecisions: TransactionApprovalDecisionCache,
): IsGasSponsoredHook {
  return async ({ transactionMeta }) => {
    const { sponsorshipEnabled } = await approvalDecisions.get(transactionMeta);

    return { isSponsored: sponsorshipEnabled };
  };
}

function shouldSignHook(
  approvalDecisions: TransactionApprovalDecisionCache,
): ShouldSignHook {
  return async ({ transactionMeta }) => {
    const { signingMode } = await approvalDecisions.get(transactionMeta);

    return { shouldSign: signingMode === 'local' };
  };
}

function beforePublishHook(
  { initMessenger }: TransactionControllerHookRequest,
  approvalDecisions: TransactionApprovalDecisionCache,
) {
  return async (transactionMeta: TransactionMeta) => {
    const canPublish = await initMessenger.call(
      'PredictController:beforePublish',
      { transactionMeta },
    );

    if (!canPublish) {
      approvalDecisions.clear(transactionMeta.id);
    }

    return canPublish;
  };
}

function beforeSignHook(
  { initMessenger }: TransactionControllerHookRequest,
  approvalDecisions: TransactionApprovalDecisionCache,
) {
  return (hookRequest: { transactionMeta: TransactionMeta }) => {
    approvalDecisions.clear(hookRequest.transactionMeta.id);
    return initMessenger.call('PredictController:beforeSign', hookRequest);
  };
}

function publishHook(
  request: TransactionControllerHookRequest,
  approvalDecisions: TransactionApprovalDecisionCache,
) {
  const { getState, getTransactionController, initMessenger } = request;

  return async (
    transactionMeta: TransactionMeta,
    signedTransactionInHex: Hex,
  ): Promise<{ transactionHash?: string }> => {
    const approvalDecision = await approvalDecisions.get(transactionMeta);
    approvalDecisions.clear(transactionMeta.id);

    const { transactionHash: predictTransactionHash } =
      await initMessenger.call('PredictController:publish', {
        transactionMeta,
      });

    if (predictTransactionHash) {
      return { transactionHash: predictTransactionHash };
    }

    const state = getState();

    const { featureFlags } = getSmartTransactionCommonParams(
      state,
      transactionMeta.chainId,
    );
    const {
      keyringSupports7702,
      sendBundleSupport,
      shouldUseSmartTransaction,
      signingMode,
      sponsorshipEnabled,
    } = approvalDecision;

    const { stxDisabled } = selectMetaMaskPayFlags(state);

    const payResult = await new TransactionPayPublishHook({
      isSmartTransaction: () => shouldUseSmartTransaction && !stxDisabled,
      messenger: initMessenger as TransactionPayControllerMessenger,
    }).getHook()(transactionMeta, signedTransactionInHex);

    if (payResult?.transactionHash) {
      return payResult;
    }

    validateRequiredQuote(transactionMeta, initMessenger, state);

    const isRevokeDelegation =
      transactionMeta.type === TransactionType.revokeDelegation;
    const isSwapGasIncluded7702 = Boolean(transactionMeta.isGasFeeIncluded);

    if (
      keyringSupports7702 &&
      !isRevokeDelegation &&
      (isSwapGasIncluded7702 ||
        !shouldUseSmartTransaction ||
        !sendBundleSupport ||
        signingMode === 'external')
    ) {
      const transactionController = getTransactionController();
      const hook = new Delegation7702PublishHook({
        getNextNonce: (address: string, networkClientId: NetworkClientId) =>
          getNextNonce(transactionController, address, networkClientId),
        isAtomicBatchSupported:
          transactionController.isAtomicBatchSupported.bind(
            transactionController,
          ),
        isSponsored: () => sponsorshipEnabled,
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
        signedTransactionInHex:
          signedTransactionInHex === '0x' ? undefined : signedTransactionInHex,
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
