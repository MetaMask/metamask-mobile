import {
  BridgeControllerState,
  QuoteResponse,
} from '@metamask/bridge-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectBridgeQuotes } from '../../../../core/redux/slices/bridge';

const QUOTE_TIMEOUT = 5000; // 5 Seconds

const log = createProjectLogger('confirmation-bridge-utils');

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
): Promise<QuoteResponse[] | undefined> {
  log('Fetching bridge quotes', requests);

  try {
    const allQuotes: QuoteResponse[] = [];

    for (const request of requests) {
      const quotes = await getSingleBridgeQuotes(request);

      if (!quotes) {
        return undefined;
      }

      allQuotes.push(quotes);
    }

    log('Fetched bridge quotes', allQuotes);

    return allQuotes;
  } catch (error) {
    log('Error fetching bridge quotes', error);
    return [];
  }
}

async function getSingleBridgeQuotes(
  request: BridgeQuoteRequest,
): Promise<QuoteResponse | undefined> {
  const {
    from,
    sourceChainId,
    sourceTokenAddress,
    sourceTokenAmount,
    targetChainId,
    targetTokenAddress,
  } = request;

  const { BridgeController } = Engine.context;

  BridgeController.resetState();

  const activeQuotePromise = waitForQuoteOrTimeout(targetTokenAddress);

  await BridgeController.updateBridgeQuoteRequestParams(
    {
      walletAddress: from,
      srcChainId: sourceChainId,
      srcTokenAddress: sourceTokenAddress,
      srcTokenAmount: sourceTokenAmount,
      destChainId: targetChainId,
      destTokenAddress: targetTokenAddress,
      insufficientBal: true,
      destWalletAddress: from,
      slippage: 0.5,
    },
    {
      stx_enabled: false,
      token_symbol_source: '',
      token_symbol_destination: '',
      security_warnings: [],
    },
  );

  log('Waiting for quote', request);

  const activeQuote = await activeQuotePromise;

  BridgeController.resetState();

  return activeQuote;
}

function waitForQuoteOrTimeout(
  targetTokenAddress: Hex,
): Promise<QuoteResponse | undefined> {
  return new Promise<QuoteResponse>((resolve, reject) => {
    Engine.controllerMessenger.subscribeOnceIf(
      'BridgeController:stateChange',
      (controllerState) => {
        resolve(getActiveQuote(controllerState) as QuoteResponse);
      },
      (controllerState) => {
        const activeQuote = getActiveQuote(controllerState);

        const isMatch =
          activeQuote?.quote.destAsset.address.toLowerCase() ===
          targetTokenAddress.toLowerCase();

        return isMatch;
      },
      { onTimeout: reject, timeout: QUOTE_TIMEOUT },
    );
  });
}

function getActiveQuote(
  controllerState: BridgeControllerState,
): QuoteResponse | undefined {
  const fullState = store.getState();

  const state = {
    ...fullState,
    engine: {
      ...fullState.engine,
      backgroundState: {
        ...fullState.engine.backgroundState,
        BridgeController: controllerState,
      },
    },
  };

  return selectBridgeQuotes(state).recommendedQuote ?? undefined;
}
