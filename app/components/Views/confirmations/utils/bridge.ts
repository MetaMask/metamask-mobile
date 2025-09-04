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

const ERROR_MESSAGE_NO_QUOTES = 'No quotes found';
const ERROR_MESSAGE_ALL_QUOTES_UNDER_MINIMUM = 'All quotes under minimum';

export type TransactionBridgeQuote = QuoteResponse & QuoteMetadata;

const log = createProjectLogger('confirmation-bridge-utils');

let abort: AbortController;

export interface BridgeQuoteRequest {
  bufferStep: number;
  from: Hex;
  initialBuffer: number;
  maxAttempts: number;
  sourceBalanceRaw: string;
  sourceChainId: Hex;
  sourceTokenAddress: Hex;
  sourceTokenAmount: string;
  targetAmountMinimum: string;
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

    const finalRequests = getFinalRequests(requests);

    const result = await Promise.all(
      finalRequests.map((request) =>
        getSufficientSingleBridgeQuote(request, gasFeeEstimates),
      ),
    );

    return result;
  } catch (error) {
    log('Error fetching bridge quotes', error);
    return undefined;
  }
}

async function getSufficientSingleBridgeQuote(
  request: BridgeQuoteRequest,
  gasFeeEstimates: GasFeeEstimates,
): Promise<TransactionBridgeQuote> {
  const {
    bufferStep,
    initialBuffer,
    maxAttempts,
    sourceBalanceRaw,
    sourceTokenAmount,
    targetTokenAddress,
  } = request;

  const sourceAmountValue = new BigNumber(sourceTokenAmount);
  const originalSourceAmount = sourceAmountValue.div(1 + initialBuffer);

  let currentSourceAmount = sourceTokenAmount;

  for (let i = 0; i < maxAttempts; i++) {
    const currentRequest = {
      ...request,
      sourceTokenAmount: currentSourceAmount,
    };

    try {
      log('Bridge quotes attempt', {
        attempt: i + 1,
        bufferStep,
        currentSourceAmount,
        initialBuffer,
        maxAttempts,
        target: targetTokenAddress,
      });

      const result = await getSingleBridgeQuote(
        currentRequest,
        gasFeeEstimates,
      );

      log('Found valid quote', {
        attempt: i + 1,
        quote: result,
      });

      return result;
    } catch (error) {
      const errorMessage = (error as { message: string }).message;

      if (errorMessage !== ERROR_MESSAGE_ALL_QUOTES_UNDER_MINIMUM) {
        throw error;
      }
    }

    if (
      new BigNumber(currentSourceAmount).isGreaterThanOrEqualTo(
        sourceBalanceRaw,
      )
    ) {
      log('Reached balance limit', targetTokenAddress);
      break;
    }

    const newSourceAmount = originalSourceAmount.multipliedBy(
      1 + initialBuffer + bufferStep * (i + 1),
    );

    currentSourceAmount = newSourceAmount.isLessThan(sourceBalanceRaw)
      ? newSourceAmount.toFixed(0)
      : sourceBalanceRaw;
  }

  log('All attempts failed', request.targetTokenAddress);

  throw new Error(ERROR_MESSAGE_ALL_QUOTES_UNDER_MINIMUM);
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
    throw new Error(ERROR_MESSAGE_NO_QUOTES);
  }

  return getActiveQuote(quoteRequest, quotes, gasFeeEstimates, request);
}

function getActiveQuote(
  quoteRequest: GenericQuoteRequest,
  quotes: QuoteResponse[],
  gasFeeEstimates: GasFeeEstimates,
  request: BridgeQuoteRequest,
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

  return getBestQuote(allQuotes, request);
}

async function getGasFeeEstimates(chainId: Hex) {
  const { GasFeeController, NetworkController } = Engine.context;

  const networkClientId =
    NetworkController.findNetworkClientIdByChainId(chainId);

  const state = await GasFeeController.fetchGasFeeEstimates({
    networkClientId,
  });

  return state.gasFeeEstimates as GasFeeEstimates;
}

function getBestQuote(
  quotes: TransactionBridgeQuote[],
  request: BridgeQuoteRequest,
): TransactionBridgeQuote {
  const fastestQuotes = orderBy(
    quotes,
    (quote) => quote.estimatedProcessingTimeInSeconds,
    'asc',
  ).slice(0, 3);

  const quotesOverMinimumTarget = fastestQuotes.filter((quote) =>
    new BigNumber(quote.toTokenAmount?.amount).isGreaterThanOrEqualTo(
      request.targetAmountMinimum,
    ),
  );

  if (!quotesOverMinimumTarget.length) {
    throw new Error(ERROR_MESSAGE_ALL_QUOTES_UNDER_MINIMUM);
  }

  return orderBy(
    quotesOverMinimumTarget,
    (quote) => BigNumber(quote.cost?.valueInCurrency ?? 0).toNumber(),
    'asc',
  )[0];
}

function getFinalRequests(requests: BridgeQuoteRequest[]) {
  return requests.map((request, index) => {
    const isFinalRequest = index === requests.length - 1;
    const maxAttempts = !isFinalRequest ? 1 : request.maxAttempts;

    const sourceBalanceRaw = requests
      .reduce((acc, value, j) => {
        const isSameSource =
          value.sourceTokenAddress.toLowerCase() ===
            request.sourceTokenAddress.toLowerCase() &&
          value.sourceChainId === request.sourceChainId;

        if (j < index && isFinalRequest && isSameSource) {
          return acc.minus(value.sourceTokenAmount);
        }

        return acc;
      }, new BigNumber(request.sourceBalanceRaw))
      .toFixed(0);

    return {
      ...request,
      maxAttempts,
      sourceBalanceRaw,
    };
  });
}
