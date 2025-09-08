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

export type TransactionBridgeQuote = QuoteResponse &
  QuoteMetadata & { request: BridgeQuoteRequest };

const log = createProjectLogger('confirmation-bridge-utils');

export interface BridgeQuoteRequest {
  attemptsMax: number;
  bufferInitial: number;
  bufferStep: number;
  bufferSubsequent: number;
  from: Hex;
  slippage: number;
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

  if (!requests?.length) {
    return [];
  }

  try {
    const gasFeeEstimates = await getGasFeeEstimates(requests[0].sourceChainId);

    log('Fetched gas fee estimates', gasFeeEstimates);

    const finalRequests = getFinalRequests(requests);

    const result = await Promise.all(
      finalRequests.map((request, index) =>
        getSufficientSingleBridgeQuote(request, gasFeeEstimates, index),
      ),
    );

    return result;
  } catch (error) {
    log('Error fetching bridge quotes', error);
    return undefined;
  }
}

export async function refreshQuote(
  quote: TransactionBridgeQuote,
): Promise<TransactionBridgeQuote> {
  const gasFeeEstimates = await getGasFeeEstimates(quote.request.sourceChainId);
  const newQuote = await getSingleBridgeQuote(quote.request, gasFeeEstimates);

  log('Refreshed bridge quote', { old: quote, new: newQuote });

  return newQuote;
}

async function getSufficientSingleBridgeQuote(
  request: BridgeQuoteRequest,
  gasFeeEstimates: GasFeeEstimates,
  index: number,
): Promise<TransactionBridgeQuote> {
  const {
    attemptsMax,
    bufferInitial,
    bufferStep,
    bufferSubsequent,
    sourceBalanceRaw,
    sourceTokenAmount,
    targetTokenAddress,
  } = request;

  const sourceAmountValue = new BigNumber(sourceTokenAmount);
  const buffer = index === 0 ? bufferInitial : bufferSubsequent;
  const originalSourceAmount = sourceAmountValue.div(1 + buffer);

  let currentSourceAmount = sourceTokenAmount;

  for (let i = 0; i < attemptsMax; i++) {
    const currentRequest = {
      ...request,
      sourceTokenAmount: currentSourceAmount,
    };

    try {
      log('Bridge quotes attempt', {
        attempt: i + 1,
        attemptsMax,
        bufferInitial,
        bufferStep,
        currentSourceAmount,
        target: targetTokenAddress,
      });

      const result = await getSingleBridgeQuote(
        currentRequest,
        gasFeeEstimates,
      );

      const dust = new BigNumber(result.quote.minDestTokenAmount)
        .minus(request.targetAmountMinimum)
        .toString(10);

      log('Found valid quote', {
        attempt: i + 1,
        target: targetTokenAddress,
        targetAmount: result.quote.minDestTokenAmount,
        goalAmount: request.targetAmountMinimum,
        dust,
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
      1 + buffer + bufferStep * (i + 1),
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
    slippage,
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
    gasIncluded7702: false,
    insufficientBal: false,
    slippage: slippage * 100,
    srcChainId: sourceChainId,
    srcTokenAddress: toChecksumAddress(sourceTokenAddress),
    srcTokenAmount: sourceTokenAmount,
    walletAddress: from,
  };

  const quotes = await BridgeController.fetchQuotes(
    quoteRequest,
    undefined,
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
  quotes: (QuoteResponse & QuoteMetadata)[],
  request: BridgeQuoteRequest,
): TransactionBridgeQuote {
  const fastestQuotes = orderBy(
    quotes,
    (quote) => quote.estimatedProcessingTimeInSeconds,
    'asc',
  ).slice(0, 3);

  const quotesOverMinimumTarget = fastestQuotes.filter((quote) =>
    new BigNumber(quote.quote.minDestTokenAmount).isGreaterThanOrEqualTo(
      request.targetAmountMinimum,
    ),
  );

  if (!quotesOverMinimumTarget.length) {
    throw new Error(ERROR_MESSAGE_ALL_QUOTES_UNDER_MINIMUM);
  }

  const match = orderBy(
    quotesOverMinimumTarget,
    (quote) => BigNumber(quote.cost?.valueInCurrency ?? 0).toNumber(),
    'asc',
  )[0];

  return {
    ...match,
    request,
  };
}

function getFinalRequests(
  requests: BridgeQuoteRequest[],
): BridgeQuoteRequest[] {
  return requests.map((request, index) => {
    const isFirstRequest = index === 0;
    const attemptsMax = isFirstRequest ? request.attemptsMax : 1;

    const sourceBalanceRaw = requests
      .reduce((acc, value, j) => {
        const isSameSource =
          value.sourceTokenAddress.toLowerCase() ===
            request.sourceTokenAddress.toLowerCase() &&
          value.sourceChainId === request.sourceChainId;

        if (isFirstRequest && j > index && isSameSource) {
          return acc.minus(value.sourceTokenAmount);
        }

        return acc;
      }, new BigNumber(request.sourceBalanceRaw))
      .toFixed(0);

    return {
      ...request,
      attemptsMax,
      sourceBalanceRaw,
    };
  });
}
