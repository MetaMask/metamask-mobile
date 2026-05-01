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

/**
 * Diagnostic probe.
 *
 * Production builds strip every `console.*` call via
 * `babel-plugin-transform-remove-console`, so console-based logging is
 * invisible on iOS release (where Hermes runs the bundle). To get any
 * E2E diagnostics out of the device we instead fire-and-forget an HTTP
 * request to a sentinel host. Whether it reaches Mockttp via the patched
 * `global.fetch` (URL-rewrite) or via the iOS system proxy
 * (`https://e2e-bridge-debug.invalid/...`), Mockttp will log it as
 * `Allowed URL: ...` and we see it in Detox stdout.
 *
 * `console.log` is kept too — useful on Android logcat and dev builds.
 */
const debugProbe = (event: string, detail?: string) => {
  const safe = encodeURIComponent(detail ?? '').slice(0, 200);
  // eslint-disable-next-line no-console
  console.log(`${LOG_PREFIX} ${event} ${detail ?? ''}`);
  try {
    const probeUrl = `http://e2e-bridge-debug.invalid/${event}/${safe}`;
    // Use `global.fetch` (post-shim if available, raw otherwise). Either
    // path reaches Mockttp on E2E.
    void global.fetch(probeUrl).catch(() => undefined);
  } catch {
    // Never let diagnostics affect product behavior.
  }
};

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

    const original = url.toString();
    let target = original;
    debugProbe('handleBridgeFetch-stream-entered', `isE2E=${isE2E}`);
    if (isE2E) {
      const proxyBase = resolveMockProxyUrl();
      if (proxyBase && !target.startsWith(proxyBase)) {
        target = `${proxyBase}/proxy?url=${encodeURIComponent(target)}`;
      }
      debugProbe(
        'handleBridgeFetch-rewrite',
        `proxyBase=${proxyBase ?? 'null'}-rewritten=${target !== original}`,
      );
    }

    // Wrap `expoFetch` so we can observe what the native URLSession does
    // with the rewritten URL. CI logs show the URL is correct
    // (proxyBase=http://localhost:<port> rewritten=true), but Mockttp
    // never sees the request — meaning expo/fetch's URLSession.ephemeral
    // is silently failing to reach localhost (ATS? IPv6? proxy bypass?).
    // These probes will tell us exactly what's happening.
    let response: Response | undefined;
    try {
      response = await expoFetch(target, options);
      debugProbe(
        'expoFetch-resolved',
        `ok=${response?.ok}-status=${response?.status}-hasBody=${Boolean(
          response?.body,
        )}`,
      );
      return response;
    } catch (err) {
      debugProbe(
        'expoFetch-threw',
        `name=${(err as Error)?.name ?? 'Unknown'}-msg=${
          (err as Error)?.message ?? 'unknown'
        }`,
      );
      throw err;
    }
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
