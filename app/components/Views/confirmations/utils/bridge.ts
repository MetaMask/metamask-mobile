import {
  FeatureId,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectBridgeQuotes } from '../../../../core/redux/slices/bridge';
import { GasFeeEstimates, GasFeeState } from '@metamask/gas-fee-controller';
import { orderBy } from 'lodash';

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

  const quotes = await BridgeController.fetchQuotes(
    {
      destChainId: targetChainId,
      destTokenAddress: targetTokenAddress,
      destWalletAddress: from,
      gasIncluded: false,
      insufficientBal: true,
      srcChainId: sourceChainId,
      srcTokenAddress: sourceTokenAddress,
      srcTokenAmount: sourceTokenAmount,
      walletAddress: from,
    },
    abort.signal,
    FeatureId.PERPS,
  );

  if (!quotes.length) {
    throw new Error('No quotes found');
  }

  return getActiveQuote(quotes, gasFeeEstimates);
}

function getActiveQuote(
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

  return orderBy(
    allQuotes,
    (quote) => quote.estimatedProcessingTimeInSeconds,
    'asc',
  )[0];
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
