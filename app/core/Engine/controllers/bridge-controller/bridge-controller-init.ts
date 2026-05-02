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
import { isE2E } from '../../../../util/test/utils';

const { version: clientVersion } = packageJSON;

/**
 * Read the Mockttp proxy URL stashed by `shim.js` once its async mock-server
 * discovery completes. We deliberately do NOT redo the discovery here —
 * shim.js already does it on every E2E boot, and any duplication risks
 * platform-specific drift (LaunchArguments availability, port mismatches,
 * etc.). If the global isn't set yet, the SSE call falls through to the
 * real backend — which is the same behavior we had before this fix.
 */
const resolveMockProxyUrl = (): string | null => {
  if (!isE2E) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromShim = (global as any).__E2E_MOCK_PROXY_URL as string | undefined;
  return fromShim ?? null;
};

export const handleBridgeFetch = async (
  url: RequestInfo | URL,
  options: RequestInit = {},
) => {
  if (url.toString().includes('Stream')) {
    // Resolve `expo/fetch` lazily on every call instead of via a top-level
    // `import { fetch as expoFetch } from 'expo/fetch'`. Hermes' release
    // bytecode optimizer can inline the static import binding, which would
    // prevent any post-boot replacement of `mod.fetch` from taking effect.
    // Re-reading the property at the call site avoids that.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { fetch: expoFetch } = require('expo/fetch') as {
      fetch: (url: string, init?: RequestInit) => Promise<Response>;
    };

    let target = url.toString();
    if (isE2E) {
      const proxyBase = resolveMockProxyUrl();
      if (proxyBase && !target.startsWith(proxyBase)) {
        target = `${proxyBase}/proxy?url=${encodeURIComponent(target)}`;
      }
    }

    return expoFetch(target, options);
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
