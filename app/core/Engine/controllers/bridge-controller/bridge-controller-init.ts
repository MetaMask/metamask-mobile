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
 * Resolve the Mockttp proxy URL for the current E2E run, if any.
 *
 * Mirrors the discovery logic in `shim.js` (multi-host health-check), but runs
 * locally inside the bridge-controller module. We can't rely on shim.js'
 * monkey-patch of `expo/fetch` surviving on iOS release: Hermes can inline
 * the static import binding, and the native ExpoFetchModule on iOS doesn't
 * expose a JS prototype to hook. Doing the URL rewrite here, at the call
 * site we own, is platform-independent and immune to bundler/runtime quirks.
 *
 * Memoized so the health-check runs at most once per app launch.
 */
const LOG_PREFIX = '[E2E BRIDGE]';

let mockProxyUrlPromise: Promise<string | null> | undefined;
const resolveMockProxyUrl = (): Promise<string | null> => {
  if (!isE2E) return Promise.resolve(null);
  if (mockProxyUrlPromise) return mockProxyUrlPromise;
  mockProxyUrlPromise = (async () => {
    try {
      // Lazy-required to keep these imports off the production module-init
      // path and to avoid Hermes inlining anything we want to look up at
      // runtime in E2E.
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { Platform } = require('react-native');
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { LaunchArguments } = require('react-native-launch-arguments');
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const defaultMockPortJson = require('../../../../../tests/api-mocking/mock-config/mockUrlCollection.json');
      const defaultMockPort = defaultMockPortJson?.defaultMockPort;

      const raw = LaunchArguments.value?.() ?? {};
      const mockServerPort = raw?.mockServerPort ?? defaultMockPort;

      const hosts: string[] = ['localhost'];
      if (Platform.OS === 'android') hosts.push('10.0.2.2');

      // `global.fetch` is patched by shim.js to route through the proxy once
      // discovered, but at this point we may run before that patch (or it may
      // not have applied). Use the original fetch saved by shim.js if present,
      // otherwise fall back to whatever `global.fetch` currently is.
      const probeFetch =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).__originalFetch ?? global.fetch;

      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} resolveMockProxyUrl: platform=${Platform.OS} port=${mockServerPort} hosts=${hosts.join(',')} usingOriginalFetch=${Boolean(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (global as any).__originalFetch,
        )}`,
      );

      for (const host of hosts) {
        const candidate = `http://${host}:${mockServerPort}`;
        try {
          const res = await probeFetch(`${candidate}/health-check`);
          // eslint-disable-next-line no-console
          console.log(
            `${LOG_PREFIX} health-check ${candidate} -> ok=${res?.ok} status=${res?.status}`,
          );
          if (res?.ok) return candidate;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log(
            `${LOG_PREFIX} health-check ${candidate} threw: ${
              (err as Error)?.message ?? err
            }`,
          );
        }
      }
      // eslint-disable-next-line no-console
      console.log(`${LOG_PREFIX} no reachable mock server`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} resolveMockProxyUrl crashed: ${
          (error as Error)?.message ?? error
        }`,
      );
      Logger.error(
        error as Error,
        'BridgeController: failed to resolve mock proxy URL',
      );
    }
    return null;
  })();
  return mockProxyUrlPromise;
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

    const original = url.toString();
    let target = original;
    if (isE2E) {
      const proxyBase = await resolveMockProxyUrl();
      if (proxyBase && !target.startsWith(proxyBase)) {
        target = `${proxyBase}/proxy?url=${encodeURIComponent(target)}`;
      }
      // eslint-disable-next-line no-console
      console.log(
        `${LOG_PREFIX} handleBridgeFetch SSE proxyBase=${proxyBase ?? 'null'} rewritten=${
          target !== original
        } url=${target}`,
      );
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
