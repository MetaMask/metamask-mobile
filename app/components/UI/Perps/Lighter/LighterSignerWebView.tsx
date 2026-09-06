import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import type {
  WebViewMessageEvent,
  WebViewErrorEvent,
} from '@metamask/react-native-webview/src/WebViewTypes';
// Inlined as a string by babel-plugin-inline-import (scoped override in
// babel.config.js). The page embeds the Lighter Go/WASM signer as base64 —
// fully local, NO network access.
// @ts-expect-error HTML import handled by babel-plugin-inline-import.
import lighterSdkHtml from './wasm-wrapper.standalone.html';
import {
  connectLighterExecutor,
  resetLighterBridge,
  setLighterBridgeUnavailable,
  type LighterExecutorCall,
  type LighterExecutor,
} from './lighterSignerBridge';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { isTestEnvironment } from '../../../../util/test/utils';

/**
 * Log dev-only signer readiness without mutating the page's live WASM client.
 */
function logReadyLatency(mountedAt: number): void {
  if (!__DEV__ || isTestEnvironment) {
    return;
  }
  const readyAt = Date.now();
  DevLogger.log(
    `[LighterSignerBridge] perf mount→ready ${readyAt - mountedAt}ms`,
  );
}

const styles = StyleSheet.create({
  hidden: {
    height: 0,
    width: 0,
    flex: 0,
    maxWidth: 0,
    maxHeight: 0,
    overflow: 'hidden',
  },
});

export const MAX_LIGHTER_SIGNER_RELOAD_ATTEMPTS = 3;
export const LIGHTER_SIGNER_RELOAD_BASE_DELAY_MS = 1_000;
const UNAVAILABLE_ERROR =
  'Lighter signer is unavailable after repeated WebView load failures';

const executePromises: Record<
  string,
  | {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
      timer: ReturnType<typeof setTimeout>;
      functionName: LighterExecutorCall['function'];
    }
  | undefined
> = {};

/**
 * Reject and drop every in-flight call. Must run whenever the WebView
 * reloads (crash recovery, content-process loss): the page-side WASM state
 * is gone, so pending calls can never resolve and callers must retry
 * against the re-initialized signer instead of hanging forever.
 *
 * @param reason - Error message forwarded to each pending caller.
 */
function rejectAllPending(reason: string): void {
  for (const executeId of Object.keys(executePromises)) {
    const pending = executePromises[executeId];
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    delete executePromises[executeId];
  }
}

type LighterPageMessage =
  | { type: 'ready' }
  | { type: 'executeResult'; executeId: string; result: unknown }
  | { type: 'executeError'; executeId: string; message: string }
  | { type: 'log' | 'warn' | 'error'; message: string | string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLogMessage(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

function hasOptionalString(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return value[key] === undefined || typeof value[key] === 'string';
}

export function parseLighterPageMessage(
  data: string,
): LighterPageMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return null;
  }

  switch (parsed.type) {
    case 'ready':
      return { type: 'ready' };
    case 'executeResult':
      return typeof parsed.executeId === 'string' && 'result' in parsed
        ? {
            type: 'executeResult',
            executeId: parsed.executeId,
            result: parsed.result,
          }
        : null;
    case 'executeError':
      return typeof parsed.executeId === 'string' &&
        typeof parsed.message === 'string'
        ? {
            type: 'executeError',
            executeId: parsed.executeId,
            message: parsed.message,
          }
        : null;
    case 'log':
    case 'warn':
    case 'error':
      return isLogMessage(parsed.message)
        ? { type: parsed.type, message: parsed.message }
        : null;
    default:
      return null;
  }
}

export function isValidLighterSignerResult(
  functionName: LighterExecutorCall['function'],
  result: unknown,
): boolean {
  if (!isRecord(result) || !hasOptionalString(result, 'error')) {
    return false;
  }
  if (functionName === '_createClient') {
    return (
      typeof result.success === 'boolean' &&
      typeof result.pk === 'string' &&
      typeof result.pubKeySuccess === 'boolean' &&
      typeof result.body === 'string'
    );
  }
  if (functionName === '_createAuthToken') {
    return (
      typeof result.token === 'string' &&
      typeof result.deadline === 'number' &&
      Number.isFinite(result.deadline)
    );
  }
  return (
    typeof result.txInfo === 'string' && hasOptionalString(result, 'txHash')
  );
}

/**
 * Hidden off-screen WebView hosting the Lighter Go/WASM signer.
 *
 * Follows the SnapsExecutionWebView precedent (0x0 view mounted in Root before
 * Engine interactions) and the reference Lighter RN SDK postMessage protocol:
 * page → RN: ready | log | warn | error | executeResult | executeError;
 * RN → page: { type: 'execute', function, params, executeId }.
 *
 * On `ready` it connects the module-level lighterSignerBridge executor, which
 * releases any calls PerpsController queued before mount.
 */
export const LighterSignerWebView = () => {
  const webviewRef = useRef<WebView>(null);
  const mountedAtRef = useRef<number>(Date.now());
  const [reloadKey, setReloadKey] = useState(0);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const reloadAttemptsRef = useRef(0);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isUnavailableRef = useRef(false);

  const handleFailure = useCallback(() => {
    if (
      reloadTimerRef.current ||
      !isMountedRef.current ||
      isUnavailableRef.current
    ) {
      return;
    }
    rejectAllPending('Lighter signer WebView reloaded; retry the operation');
    if (reloadAttemptsRef.current >= MAX_LIGHTER_SIGNER_RELOAD_ATTEMPTS) {
      isUnavailableRef.current = true;
      setIsUnavailable(true);
      setLighterBridgeUnavailable(UNAVAILABLE_ERROR);
      return;
    }
    resetLighterBridge();

    const delay =
      LIGHTER_SIGNER_RELOAD_BASE_DELAY_MS * 2 ** reloadAttemptsRef.current;
    reloadAttemptsRef.current += 1;
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      if (isMountedRef.current) {
        setReloadKey((previous) => previous + 1);
      }
    }, delay);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      rejectAllPending('Lighter signer WebView unmounted');
      resetLighterBridge();
    };
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const message = parseLighterPageMessage(event.nativeEvent.data);
    if (!message) {
      DevLogger.log(
        '[LighterSignerWebView] Invalid message',
        event.nativeEvent.data,
      );
      return;
    }

    switch (message.type) {
      case 'ready': {
        if (reloadTimerRef.current || isUnavailableRef.current) {
          return;
        }
        DevLogger.log('[LighterSignerWebView] WASM signer ready');
        const execute: LighterExecutor = (call, timeoutMs) => {
          const webview = webviewRef.current;
          if (!webview) {
            return Promise.reject(
              new Error('Lighter signer WebView is not mounted'),
            );
          }
          return new Promise((resolve, reject) => {
            const executeId = `${call.function}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2)}`;
            const timer = setTimeout(() => {
              delete executePromises[executeId];
              reject(
                new Error(
                  `Lighter signer call ${call.function} timed out after ${timeoutMs}ms`,
                ),
              );
            }, timeoutMs);
            executePromises[executeId] = {
              resolve,
              reject,
              timer,
              functionName: call.function,
            };
            try {
              webview.postMessage(
                JSON.stringify({ type: 'execute', ...call, executeId }),
              );
            } catch (error) {
              clearTimeout(timer);
              delete executePromises[executeId];
              reject(error);
            }
          });
        };
        connectLighterExecutor(execute);
        logReadyLatency(mountedAtRef.current);
        break;
      }
      case 'executeResult':
        {
          const pendingResult = executePromises[message.executeId];
          if (pendingResult) {
            clearTimeout(pendingResult.timer);
            if (
              isValidLighterSignerResult(
                pendingResult.functionName,
                message.result,
              )
            ) {
              pendingResult.resolve(message.result);
            } else {
              pendingResult.reject(
                new Error(
                  `Invalid Lighter signer result for ${pendingResult.functionName}`,
                ),
              );
            }
          }
          delete executePromises[message.executeId];
        }
        break;
      case 'executeError':
        {
          const pendingError = executePromises[message.executeId];
          if (pendingError) {
            clearTimeout(pendingError.timer);
            pendingError.reject(new Error(message.message));
          }
          delete executePromises[message.executeId];
        }
        break;
      case 'log':
      case 'warn':
      case 'error':
        DevLogger.log(
          `[LighterSignerWebView] page ${message.type}:`,
          message.message,
        );
        break;
    }
  }, []);

  if (isUnavailable) {
    return null;
  }

  return (
    <View style={styles.hidden}>
      <WebView
        key={`lighter-signer-${reloadKey}`}
        ref={webviewRef}
        style={styles.hidden}
        source={{ html: lighterSdkHtml, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        javaScriptEnabled
        webviewDebuggingEnabled={__DEV__}
        onMessage={onMessage}
        onContentProcessDidTerminate={handleFailure}
        // Android equivalent of iOS content-process termination.
        onRenderProcessGone={handleFailure}
        onError={(event: WebViewErrorEvent) => {
          DevLogger.log(
            '[LighterSignerWebView] load error',
            event.nativeEvent.description,
          );
          // A failed load leaves the page without a WASM runtime; reload and
          // fail pending callers rather than letting them hang.
          handleFailure();
        }}
      />
    </View>
  );
};
