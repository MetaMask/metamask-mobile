import {
  PublishHook,
  PublishHookResult,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { createProjectLogger } from '@metamask/utils';
import { StatusTypes } from '@metamask/bridge-controller';
import {
  BridgeHistoryItem,
  BridgeStatusControllerEvents,
} from '@metamask/bridge-status-controller';
import { TransactionControllerInitMessenger } from '../../../core/Engine/messengers/transaction-controller-messenger';
import { store } from '../../../store';
import { ExtractEventHandler } from '@metamask/base-controller';
import {
  TransactionBridgeQuote,
  refreshQuote,
} from '../../../components/Views/confirmations/utils/bridge';
import { cloneDeep } from 'lodash';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { toHex } from '@metamask/controller-utils';
import { updateRequiredTransactionIds } from '../../transaction-controller';

const log = createProjectLogger('pay-publish-hook');

const EMPTY_RESULT = {
  transactionHash: undefined,
};
export class PayHook {
  #messenger: TransactionControllerInitMessenger;

  constructor({
    messenger,
  }: {
    messenger: TransactionControllerInitMessenger;
  }) {
    this.#messenger = messenger;
  }

  getHook(): PublishHook {
    return this.#hookWrapper.bind(this);
  }

  async #hookWrapper(
    transactionMeta: TransactionMeta,
    _signedTx: string,
  ): Promise<PublishHookResult> {
    try {
      return await this.#publishHook(transactionMeta, _signedTx);
    } catch (error) {
      log('Error', error);
      throw error;
    }
  }

  async #publishHook(
    transactionMeta: TransactionMeta,
    _signedTx: string,
  ): Promise<PublishHookResult> {
    const { id: transactionId } = transactionMeta;
    const state = store.getState();

    const quotes =
      state.confirmationMetrics.transactionBridgeQuotesById?.[transactionId];

    if (!quotes?.length) {
      log('No quotes found for transaction', transactionId);
      return EMPTY_RESULT;
    }

    // Currently we only support a single source meaning we only check the first quote.
    const isSameChain =
      quotes[0].quote.srcChainId === quotes[0].quote.destChainId;

    if (isSameChain) {
      log(
        'Ignoring quotes as source is same chain',
        quotes[0].quote.srcChainId,
      );
      return EMPTY_RESULT;
    }

    let index = 0;

    for (const quote of quotes) {
      log('Submitting bridge', index, quote);

      const finalQuote = index > 0 ? await refreshQuote(quote) : quote;
      await this.#submitBridgeTransaction(transactionId, finalQuote);

      index += 1;
    }

    return EMPTY_RESULT;
  }

  async #submitBridgeTransaction(
    transactionId: string,
    originalQuote: TransactionBridgeQuote,
  ): Promise<void> {
    const quote = cloneDeep(originalQuote);
    const sourceChainId = toHex(quote.quote.srcChainId);

    const isSmartTransaction = selectShouldUseSmartTransaction(
      store.getState(),
      sourceChainId,
    );

    const result = await this.#messenger.call(
      'BridgeStatusController:submitTx',
      quote,
      isSmartTransaction,
    );

    log('Bridge transaction submitted', result);

    const { id: bridgeTransactionId } = result;

    updateRequiredTransactionIds({
      transactionId,
      requiredTransactionIds: [bridgeTransactionId],
    });

    log('Waiting for bridge completion', bridgeTransactionId);

    await this.#waitForBridgeCompletion(bridgeTransactionId);
  }

  async #waitForBridgeCompletion(transactionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = (bridgeHistory: BridgeHistoryItem) => {
        const unsubscribe = () =>
          this.#messenger.unsubscribe(
            'BridgeStatusController:stateChange',
            handler as unknown as ExtractEventHandler<
              BridgeStatusControllerEvents,
              'BridgeStatusController:stateChange'
            >,
          );

        try {
          const status = bridgeHistory?.status?.status;

          log('Checking bridge status', status);

          if (status === StatusTypes.COMPLETE) {
            unsubscribe();
            resolve();
          }

          if (status === StatusTypes.FAILED) {
            unsubscribe();
            reject(new Error('Bridge transaction failed'));
          }
        } catch (error) {
          log('Error checking bridge status', error);
          unsubscribe();
          reject(error);
        }
      };

      this.#messenger.subscribe(
        'BridgeStatusController:stateChange',
        handler,
        (state) => state.txHistory[transactionId],
      );
    });
  }
}
