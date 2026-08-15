import React, { useCallback, useRef, useState } from 'react';
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
  lighterSignerBridge,
} from './lighterSignerBridge';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Dev-only synthetic signer round-trip: derives a throwaway venue key through
 * the real postMessage + WASM path so on-device signing latency is measurable
 * without touching any account (pure offline WASM computation).
 */
function runWarmupProbe(mountedAt: number): void {
  if (!__DEV__) {
    return;
  }
  const readyAt = Date.now();
  DevLogger.log(
    `[LighterSignerBridge] perf mount→ready ${readyAt - mountedAt}ms`,
  );
  const startedAt = Date.now();
  lighterSignerBridge
    .execute({
      function: '_createClient',
      params: ['ab'.repeat(32), 300, 0, 0, 254],
    })
    .then(() => {
      DevLogger.log(
        `[LighterSignerBridge] perf warmup _createClient ${Date.now() - startedAt}ms`,
      );
    })
    .catch((error: unknown) => {
      DevLogger.log('[LighterSignerBridge] perf warmup failed', String(error));
    });
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

const executePromises: Record<
  string,
  | { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  | undefined
> = {};

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

  const refresh = useCallback(() => {
    resetLighterBridge();
    setReloadKey((prev) => prev + 1);
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let message: {
      type?: string;
      executeId?: string;
      result?: unknown;
      message?: string | string[];
    };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      DevLogger.log(
        '[LighterSignerWebView] Invalid message',
        event.nativeEvent.data,
      );
      return;
    }

    switch (message.type) {
      case 'ready':
        DevLogger.log('[LighterSignerWebView] WASM signer ready');
        connectLighterExecutor(
          (call) =>
            new Promise((resolve, reject) => {
              const executeId = `${call.function}_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}`;
              executePromises[executeId] = { resolve, reject };
              webviewRef.current?.postMessage(
                JSON.stringify({ type: 'execute', ...call, executeId }),
              );
            }),
        );
        runWarmupProbe(mountedAtRef.current);
        break;
      case 'executeResult':
        if (message.executeId) {
          executePromises[message.executeId]?.resolve(message.result);
          delete executePromises[message.executeId];
        }
        break;
      case 'executeError':
        if (message.executeId) {
          executePromises[message.executeId]?.reject(
            new Error(String(message.message)),
          );
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
      default:
        DevLogger.log(
          '[LighterSignerWebView] Unknown message type',
          message.type,
        );
    }
  }, []);

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
        onContentProcessDidTerminate={refresh}
        onError={(event: WebViewErrorEvent) => {
          DevLogger.log(
            '[LighterSignerWebView] load error',
            event.nativeEvent.description,
          );
        }}
      />
    </View>
  );
};
