import {
  FeatureId,
  GenericQuoteRequest,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectBridgeQuotes } from '../../../../core/redux/slices/bridge';
import { GasFeeEstimates, GasFeeState } from '@metamask/gas-fee-controller';
import { orderBy } from 'lodash';
import { toChecksumAddress } from '../../../../util/address';
import { BigNumber } from 'bignumber.js';

export type TransactionBridgeQuote = QuoteResponse & QuoteMetadata;

const log = createProjectLogger('confirmation-bridge-utils');
let abort: AbortController;

export interface BridgeQuoteRequest {
  from: Hex;
  sourceChainId: Hex;
  sourceTokenAddress: Hex;
  sourceTokenAmount: string;
  targetChainId: Hex;
  targetTokenAddress: Hex;
}

export async function getBridgeQuotes(
  requests: BridgeQuoteRequest[],
): Promise<TransactionBridgeQuote[] | undefined> {
  log('Fetching bridge quotes', requests);

  abort?.abort();
  abort = new AbortController();

  if (!requests?.length) {
    return [];
  }

  try {
    const gasFeeEstimates = await getGasFeeEstimates(requests[0].sourceChainId);

    log('Fetched gas fee estimates', gasFeeEstimates);

    const result = await Promise.all(
      requests.map((request) => getSingleBridgeQuote(request, gasFeeEstimates)),
    );

    return result;
  } catch (error) {
    log('Error fetching bridge quotes', error);
    return undefined;
  }
}

async function getSingleBridgeQuote(
  request: BridgeQuoteRequest,
  gasFeeEstimates: GasFeeEstimates,
): Promise<TransactionBridgeQuote> {
  const {
    from,
    sourceChainId,
    sourceTokenAddress,
    sourceTokenAmount,
    targetChainId,
    targetTokenAddress,
  } = request;

  const { BridgeController } = Engine.context;

  const quoteRequest: GenericQuoteRequest = {
    destChainId: targetChainId,
    destTokenAddress: toChecksumAddress(targetTokenAddress),
    destWalletAddress: from,
    gasIncluded: false,
    insufficientBal: false,
    slippage: 0.5,
    srcChainId: sourceChainId,
    srcTokenAddress: toChecksumAddress(sourceTokenAddress),
    srcTokenAmount: sourceTokenAmount,
    walletAddress: from,
    gasless7702: false, // TODO handle this properly
  };

  const quotes = await BridgeController.fetchQuotes(
    quoteRequest,
    abort.signal,
    FeatureId.PERPS,
  );

  if (!quotes.length) {
    throw new Error('No quotes found');
  }

  return getActiveQuote(quoteRequest, quotes, gasFeeEstimates);
}

function getActiveQuote(
  quoteRequest: GenericQuoteRequest,
  quotes: QuoteResponse[],
  gasFeeEstimates: GasFeeEstimates,
): TransactionBridgeQuote {
  const fullState = store.getState();

  const state = {
    ...fullState,
    engine: {
      ...fullState?.engine,
      backgroundState: {
        ...fullState?.engine?.backgroundState,
        BridgeController: {
          ...fullState?.engine?.backgroundState?.BridgeController,
          quoteRequest,
          quotes,
        },
        ...(gasFeeEstimates
          ? {
              GasFeeController: {
                ...fullState?.engine?.backgroundState?.GasFeeController,
                gasFeeEstimates,
              } as GasFeeState,
            }
          : {}),
      },
    },
  };

  const allQuotes = selectBridgeQuotes(state).sortedQuotes;

  return getBestQuote(allQuotes);
}

async function getGasFeeEstimates(chainId: Hex) {
  const { GasFeeController, NetworkController } = Engine.context;

  const existingState =
    GasFeeController.state?.gasFeeEstimatesByChainId?.[chainId]
      ?.gasFeeEstimates;

  if (existingState) {
    return existingState as GasFeeEstimates;
  }

  const networkClientId =
    NetworkController.findNetworkClientIdByChainId(chainId);

  const state = await GasFeeController.fetchGasFeeEstimates({
    networkClientId,
  });

  return state.gasFeeEstimates as GasFeeEstimates;
}

function getBestQuote(
  quotes: TransactionBridgeQuote[],
): TransactionBridgeQuote {
  const fastestQuotes = orderBy(
    quotes,
    (quote) => quote.estimatedProcessingTimeInSeconds,
    'asc',
  ).slice(0, 3);

  return orderBy(
    fastestQuotes,
    (quote) => BigNumber(quote.cost?.valueInCurrency ?? 0).toNumber(),
    'asc',
  )[0];
}
