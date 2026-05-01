import {
  BridgeClientId,
  BridgeController,
  BridgeControllerMessenger,
} from '@metamask/bridge-controller';

import {
  MessengerClientInitFunction,
  MessengerClientInitRequest,
} from '../../types';
import type { BridgeControllerInitMessenger } from '../../messengers/bridge-controller-messenger';
import { TransactionParams } from '@metamask/transaction-controller';
import { buildAndTrackEvent } from '../../utils/analytics';
import type { AnalyticsUnfilteredProperties } from '../../../../util/analytics/analytics.types';
import {
  ChainId,
  handleFetch,
  TraceCallback,
} from '@metamask/controller-utils';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';
import packageJSON from '../../../../../package.json';

const { version: clientVersion } = packageJSON;

export const handleBridgeFetch = async (
  url: RequestInfo | URL,
  options: RequestInit = {},
) => {
  if (url.toString().includes('Stream')) {
    // Resolve `expo/fetch` lazily on every call instead of via a top-level
    // `import { fetch as expoFetch } from 'expo/fetch'`. Hermes' release
    // bytecode optimizer can inline the static import binding in
    // `handleBridgeFetch`, which prevents `shim.js`' E2E URL-rewrite patch
    // (which mutates `mod.fetch` after boot) from taking effect — the
    // bridge SSE request bypasses Mockttp's `/proxy` matcher and the
    // gasless-swap / bridge quote tests time out waiting for a quote.
    // Re-reading the property at the call site forces the patched fn to
    // be used. `require()` is memoized, so this is just a cached property
    // lookup — no real perf cost in production.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { fetch: expoFetch } = require('expo/fetch') as {
      fetch: (url: string, init?: RequestInit) => Promise<Response>;
    };
    return expoFetch(url.toString(), options);
  }
  return handleFetch(url, options);
};

export const bridgeControllerInit: MessengerClientInitFunction<
  BridgeController,
  BridgeControllerMessenger,
  BridgeControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger } = request;
  const { transactionController } = getControllers(request);

  try {
    /* bridge controller Initialization */
    const bridgeController = new BridgeController({
      messenger: controllerMessenger,
      clientId: BridgeClientId.MOBILE,
      clientVersion,
      // TODO: change getLayer1GasFee type to match transactionController.getLayer1GasFee
      getLayer1GasFee: async ({
        transactionParams,
        chainId,
      }: {
        transactionParams: TransactionParams;
        chainId: ChainId;
      }) =>
        transactionController.getLayer1GasFee({
          transactionParams,
          chainId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
      fetchFn: handleBridgeFetch,
      config: {
        customBridgeApiBaseUrl: BRIDGE_API_BASE_URL,
      },
      trackMetaMetricsFn: (event, properties) => {
        buildAndTrackEvent(
          initMessenger,
          event,
          properties as AnalyticsUnfilteredProperties,
        );
      },
      traceFn: trace as TraceCallback,
    });

    return { controller: bridgeController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize BridgeController');
    throw error;
  }
};

function getControllers(
  request: MessengerClientInitRequest<
    BridgeControllerMessenger,
    BridgeControllerInitMessenger
  >,
) {
  return {
    transactionController: request.getMessengerClient('TransactionController'),
  };
}
