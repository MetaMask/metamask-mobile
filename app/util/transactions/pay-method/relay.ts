import {
  AdaptedWallet,
  Execute,
  MAINNET_RELAY_API,
  createClient,
  getClient,
} from '@relayprotocol/relay-sdk';
import { BridgeQuoteRequest } from '../../../components/Views/confirmations/utils/bridge';
import { createProjectLogger } from '@metamask/utils';
import { cloneDeep, noop } from 'lodash';
import Engine from '../../../core/Engine';
import { toHex } from '@metamask/controller-utils';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionParams,
} from '@metamask/transaction-controller';
import { TransactionReceipt } from 'viem';
import { ARBITRUM_USDC_ADDRESS } from '../../../components/Views/confirmations/constants/perps';
import { NATIVE_TOKEN_ADDRESS } from '../../../components/Views/confirmations/constants/tokens';
import { BigNumber } from 'bignumber.js';

const log = createProjectLogger('relay-pay-method');

export enum PayMethodType {
  Bridge = 'bridge',
  Relay = 'relay',
}

export interface PayQuote<OriginalQuote> {
  fee: string;
  method: PayMethodType;
  original: OriginalQuote;
  request: BridgeQuoteRequest;
}

export interface PayMethod<OriginalQuote> {
  execute(
    quote: PayQuote<OriginalQuote>[],
    transactionId: string,
  ): Promise<string | undefined>;
  getQuotes(
    requests: BridgeQuoteRequest[],
  ): Promise<PayQuote<OriginalQuote>[] | undefined>;
}

export class RelayPayMethod implements PayMethod<Execute> {
  async execute(
    quotes: PayQuote<Execute>[],
    transactionId: string,
  ): Promise<string | undefined> {
    const { NetworkController, TransactionController } = Engine.context;
    const { controllerMessenger } = Engine;

    log('Executing relay quotes', quotes);

    if (!quotes.length) {
      log('No quotes to execute');
      return undefined;
    }

    const quote = quotes[0];
    let transactionHash: string | undefined;

    const wallet: AdaptedWallet = {
      address: async () => quote.request.from,
      getChainId: async () => Number(quote.request.sourceChainId),
      handleConfirmTransactionStep: async (tx) => {
        let finished = false;

        return new Promise((resolve, reject) => {
          controllerMessenger.subscribe(
            'TransactionController:stateChange',
            (transactions) => {
              if (finished) {
                return;
              }

              const match = (transactions as TransactionMeta[]).find(
                (t) => t.hash?.toLowerCase() === tx.toLowerCase(),
              );

              log('Checking for transaction confirmation', { tx, match });

              if (match?.txReceipt?.status === '0x1') {
                log('Transaction confirmed', match.txReceipt);
                finished = true;
                resolve(match.txReceipt as unknown as TransactionReceipt);
              } else if (match?.txReceipt?.status === '0x0') {
                log('Transaction failed', match.txReceipt);
                finished = true;
                reject(new Error('Transaction failed'));
              }
            },
            (state) => state.transactions,
          );
        });
      },
      handleSignMessageStep: async () => '',
      handleSendTransactionStep: async (chainId, item, step) => {
        const networkClientId = NetworkController.findNetworkClientIdByChainId(
          toHex(chainId),
        );

        log('Adding transaction', {
          chainId,
          item,
          step,
          networkClientId,
        });

        const result = await TransactionController.addTransaction(
          this.#normalizeParams(step.items[0].data),
          { networkClientId, requireApproval: false },
        );

        transactionHash = await result.result;

        log('Published transaction', transactionHash);

        return transactionHash;
      },
      switchChain: async () => noop(),
      vmType: 'evm',
    };

    const originalQuote = cloneDeep(quote.original);

    const result = await this.#getClient().actions.execute({
      quote: originalQuote,
      wallet,
    });

    log('Execution complete', result);

    const transactionMeta = TransactionController.state.transactions.find(
      (t) => t.id === transactionId,
    );

    if (transactionMeta) {
      TransactionController.updateTransaction(
        {
          ...transactionMeta,
          chainId: toHex(quote.request.sourceChainId),
          networkClientId: NetworkController.findNetworkClientIdByChainId(
            toHex(quote.request.sourceChainId),
          ),
        },
        'Update Relay transaction to source chain',
      );

      log('Updated transaction chain');
    }

    return transactionHash;
  }

  async getQuotes(
    requests: BridgeQuoteRequest[],
  ): Promise<PayQuote<Execute>[] | undefined> {
    log('Fetching relay quotes', requests);

    const normalizedRequests = requests.map((r) => this.#normalizeRequest(r));
    const request = normalizedRequests[0];

    const wallet: AdaptedWallet = {
      vmType: 'evm',
      getChainId: async () => Number(request.sourceChainId),
      handleSignMessageStep: async () => '',
      handleSendTransactionStep: async () => '',
      handleConfirmTransactionStep: async () => ({} as never),
      address: async () => request.from,
      switchChain: async () => noop(),
    };

    try {
      const quote = await this.#getClient().actions.getQuote({
        chainId: Number(request.sourceChainId),
        toChainId: Number(request.targetChainId),
        currency: request.sourceTokenAddress,
        toCurrency: request.targetTokenAddress,
        amount: request.targetAmountMinimum,
        user: request.from,
        recipient: request.from,
        tradeType: 'EXPECTED_OUTPUT',
        wallet,
      });

      log('Fetched relay quote', quote);
      return [this.#parseQuote(quote, request)];
    } catch (e) {
      log('Error fetching relay quote', e);
      return undefined;
    }
  }

  #normalizeParams(
    params: TransactionParams & {
      gas: number;
      maxFeePerGas: number;
      maxPriorityFeePerGas: number;
      value: number;
    },
  ): TransactionParams {
    return {
      ...params,
      gasLimit: toHex(params.gas),
      maxFeePerGas: toHex(params.maxFeePerGas),
      maxPriorityFeePerGas: toHex(params.maxPriorityFeePerGas),
      value: toHex(params.value),
    };
  }

  #normalizeRequest(request: BridgeQuoteRequest): BridgeQuoteRequest {
    const isHyperliquidDeposit =
      request.targetChainId === CHAIN_IDS.ARBITRUM &&
      request.targetTokenAddress.toLowerCase() ===
        ARBITRUM_USDC_ADDRESS.toLowerCase();

    return {
      ...request,
      targetChainId: isHyperliquidDeposit ? toHex(1337) : request.targetChainId,
      targetTokenAddress: isHyperliquidDeposit
        ? '0x00000000000000000000000000000000'
        : request.targetTokenAddress,
      targetAmountMinimum: isHyperliquidDeposit
        ? new BigNumber(request.targetAmountMinimum).shiftedBy(2).toString(10)
        : request.targetAmountMinimum,
    };
  }

  #parseQuote(quote: Execute, request: BridgeQuoteRequest): PayQuote<Execute> {
    return {
      fee: '0',
      method: PayMethodType.Relay,
      original: quote,
      request,
    };
  }

  #getClient() {
    if (!getClient()) {
      createClient({
        baseApiUrl: MAINNET_RELAY_API,
        source: 'matt.test',
      });
    }

    return getClient();
  }
}
