import {
  PublishHook,
  PublishHookResult,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import { StatusTypes } from '@metamask/bridge-controller';
import {
  BridgeHistoryItem,
  BridgeStatusControllerEvents,
} from '@metamask/bridge-status-controller';
import { TransactionControllerInitMessenger } from '../../../core/Engine/messengers/transaction-controller-messenger';
import { store } from '../../../store';
import { ExtractEventHandler } from '@metamask/base-controller';
import { TransactionBridgeQuote } from '../../../components/Views/confirmations/utils/bridge';
import { cloneDeep } from 'lodash';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { toHex } from '@metamask/controller-utils';
import { updateRequiredTransactionIds } from '../../transaction-controller';
import { PAY_METHODS } from '../pay-method';

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

    const payMethod = PAY_METHODS[quotes[0].method];

    try {
      const transactionHash = await payMethod.execute(quotes, transactionId);
      return { transactionHash };
    } catch (error) {
      log('Error executing quotes', error);
      throw error;
    }
  }

  async #submitBridgeTransaction(
    transactionId: string,
    from: Hex,
    originalQuote: TransactionBridgeQuote,
  ): Promise<void> {
    const quote = cloneDeep(originalQuote);
    const sourceChainId = toHex(quote.quote.srcChainId);

    const isSmartTransaction = selectShouldUseSmartTransaction(
      store.getState(),
      sourceChainId,
    );

    const bridgeTransactionIdCollector = this.#collectTransactionIds(
      sourceChainId,
      from,

      (id) =>
        updateRequiredTransactionIds({
          transactionId,
          requiredTransactionIds: [id],
          append: true,
        }),
    );

    const result = await this.#messenger.call(
      'BridgeStatusController:submitTx',
      from,
      quote,
      isSmartTransaction,
    );

    bridgeTransactionIdCollector.end();

    log('Bridge transaction submitted', result);

    const { id: bridgeTransactionId } = result;

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

  #collectTransactionIds(
    chainId: Hex,
    from: Hex,
    onTransaction: (transactionId: string) => void,
  ): { end: () => void } {
    const listener = (tx: TransactionMeta) => {
      if (
        tx.chainId !== chainId ||
        tx.txParams.from.toLowerCase() !== from.toLowerCase()
      ) {
        return;
      }

      onTransaction(tx.id);
    };

    this.#messenger.subscribe(
      'TransactionController:unapprovedTransactionAdded',
      listener,
    );

    const end = () => {
      this.#messenger.unsubscribe(
        'TransactionController:unapprovedTransactionAdded',
        listener,
      );
    };

    return { end };
  }
}
