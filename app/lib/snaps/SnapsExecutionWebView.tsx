///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { Component } from 'react';
import { View, NativeSyntheticEvent, Platform } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import { WebViewError } from '@metamask/react-native-webview/src/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
import WebViewHTML from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';
import { EmptyObject } from '@metamask/snaps-sdk';
import {
  enableApiCallLogs,
  getMockServerPortInApp,
  isE2E,
} from '../../util/test/utils';

const styles = createStyles();

interface E2EProxyPatchScriptParams {
  mockServerPort: string;
  platform: string;
  snapId: string;
}

/**
 * Build a script to patch fetch/XMLHttpRequest/WebSocket inside the Snaps WebView runtime.
 * This makes Snap network access visible in the E2E proxy the same way as app requests.
 */
export const buildE2EProxyPatchScript = ({
  mockServerPort,
  platform,
  snapId,
}: E2EProxyPatchScriptParams): string => {
  const proxyCandidates =
    platform === 'android'
      ? ['http://localhost', 'http://10.0.2.2']
      : ['http://localhost'];

  return `
    (() => {
      try {
        const mockServerPort = ${JSON.stringify(mockServerPort)};
        const proxyCandidates = ${JSON.stringify(proxyCandidates)}.map(
          (host) => \`\${host}:\${mockServerPort}\`,
        );
        const wsProxyCandidates = proxyCandidates.map((candidate) =>
          candidate.replace(/^http/i, 'ws'),
        );
        const snapProxySource = 'snap-webview';
        const snapId = ${JSON.stringify(snapId)};

        const buildProxyUrl = (proxyBaseUrl, targetUrl) =>
          \`\${proxyBaseUrl}/proxy?source=\${snapProxySource}&snapId=\${encodeURIComponent(snapId)}&url=\${encodeURIComponent(targetUrl)}\`;
        const buildProxyWebSocketUrl = (proxyBaseUrl, targetUrl) =>
          \`\${proxyBaseUrl}/proxy-ws?source=\${snapProxySource}&snapId=\${encodeURIComponent(snapId)}&url=\${encodeURIComponent(targetUrl)}\`;

        const shouldProxyUrl = (targetUrl) =>
          typeof targetUrl === 'string' &&
          /^https?:\\/\\//.test(targetUrl) &&
          !targetUrl.includes('/proxy?') &&
          !proxyCandidates.some((candidate) => targetUrl.startsWith(candidate));
        const shouldProxyWebSocketUrl = (targetUrl) =>
          typeof targetUrl === 'string' &&
          /^wss?:\\/\\//i.test(targetUrl) &&
          !targetUrl.includes('/proxy-ws?') &&
          !wsProxyCandidates.some((candidate) => targetUrl.startsWith(candidate));
        const isSolanaInfuraWebSocketUrl = (targetUrl) =>
          typeof targetUrl === 'string' &&
          /^wss?:\\/\\/solana-(mainnet|devnet)\\.infura\\.io\\/v3/i.test(targetUrl);

        const patchWindowNetworkApis = (targetWindow) => {
          if (!targetWindow || targetWindow.__MM_E2E_SNAP_PROXY_PATCHED__) {
            return;
          }
          targetWindow.__MM_E2E_SNAP_PROXY_PATCHED__ = true;

          const toUrlString = (input) => {
            if (typeof input === 'string') {
              return input;
            }
            if (
              typeof targetWindow.URL !== 'undefined' &&
              input instanceof targetWindow.URL
            ) {
              return input.toString();
            }
            if (input && typeof input === 'object' && typeof input.url === 'string') {
              return input.url;
            }
            return String(input);
          };

          if (typeof targetWindow.fetch === 'function') {
            const originalFetch = targetWindow.fetch.bind(targetWindow);
            targetWindow.fetch = async (input, init) => {
              const targetUrl = toUrlString(input);
              if (!shouldProxyUrl(targetUrl)) {
                return originalFetch(input, init);
              }

              let lastError;
              for (const proxyBaseUrl of proxyCandidates) {
                try {
                  return await originalFetch(
                    buildProxyUrl(proxyBaseUrl, targetUrl),
                    init,
                  );
                } catch (error) {
                  lastError = error;
                }
              }

              if (lastError) {
                return originalFetch(input, init);
              }
              return originalFetch(input, init);
            };
          }

          const OriginalXHR = targetWindow.XMLHttpRequest;
          if (typeof OriginalXHR === 'function') {
            targetWindow.XMLHttpRequest = function (...args) {
              const xhr = new OriginalXHR(...args);
              const originalOpen = xhr.open;
              xhr.open = function (method, url, ...openArgs) {
                const targetUrl = toUrlString(url);
                if (shouldProxyUrl(targetUrl)) {
                  const proxiedUrl = buildProxyUrl(proxyCandidates[0], targetUrl);
                  return originalOpen.call(this, method, proxiedUrl, ...openArgs);
                }
                return originalOpen.call(this, method, url, ...openArgs);
              };
              return xhr;
            };
            try {
              Object.setPrototypeOf(targetWindow.XMLHttpRequest, OriginalXHR);
              Object.assign(targetWindow.XMLHttpRequest, OriginalXHR);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log('[SNAPS E2E PROXY] Failed to copy XHR properties', error);
            }
          }

          const OriginalWebSocket = targetWindow.WebSocket;
          if (typeof OriginalWebSocket === 'function') {
            const emitSyntheticSocketMessage = (socket, payload) => {
              try {
                if (typeof targetWindow.MessageEvent === 'function') {
                  socket.dispatchEvent(
                    new targetWindow.MessageEvent('message', {
                      data: JSON.stringify(payload),
                    }),
                  );
                  return;
                }
              } catch {
                // no-op
              }

              try {
                const fallbackEvent = { data: JSON.stringify(payload) };
                if (typeof socket.onmessage === 'function') {
                  socket.onmessage(fallbackEvent);
                }
              } catch {
                // no-op
              }
            };

            const resolveSolanaWebSocketResponse = (rawPayload, nextSubscriptionIdRef) => {
              let parsedPayload = rawPayload;
              if (typeof rawPayload === 'string') {
                try {
                  parsedPayload = JSON.parse(rawPayload);
                } catch {
                  parsedPayload = null;
                }
              }

              const request = Array.isArray(parsedPayload)
                ? parsedPayload.find(
                    (item) =>
                      item &&
                      typeof item === 'object' &&
                      typeof item.method === 'string',
                  ) ?? null
                : parsedPayload;

              if (!request || typeof request !== 'object') {
                return null;
              }

              const method =
                typeof request.method === 'string' ? request.method : undefined;
              const id =
                typeof request.id === 'string' || typeof request.id === 'number'
                  ? request.id
                  : '1';

              if (!method) {
                return null;
              }

              if (method === 'signatureSubscribe') {
                const subscriptionId = nextSubscriptionIdRef.value++;
                return {
                  initialResponse: {
                    delayMs: 500,
                    payload: {
                      jsonrpc: '2.0',
                      result: subscriptionId,
                      id,
                    },
                  },
                  followUpResponse: {
                    delayMs: 1500,
                    payload: {
                      jsonrpc: '2.0',
                      method: 'signatureNotification',
                      params: {
                        result: {
                          context: { slot: 342840492 },
                          value: { err: null },
                        },
                        subscription: subscriptionId,
                      },
                    },
                  },
                };
              }

              if (method === 'accountSubscribe') {
                return {
                  initialResponse: {
                    delayMs: 500,
                    payload: {
                      jsonrpc: '2.0',
                      result:
                        'b07ebf7caf2238a9b604d4dfcaf1934280fcd347d6eded62bc0def6cbb767d11',
                      id,
                    },
                  },
                };
              }

              if (method === 'programSubscribe') {
                const payloadAsText =
                  typeof rawPayload === 'string'
                    ? rawPayload
                    : JSON.stringify(rawPayload ?? '');
                const subscriptionResult = payloadAsText.includes(
                  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
                )
                  ? 'f33dd9975158af47bf16c7f6062a73191d4595c59cfec605d5a51e25c65ffb51'
                  : '568eafd45635c108d0d426361143de125a841628a58679f5a024cbab9a20b41c';

                return {
                  initialResponse: {
                    delayMs: 500,
                    payload: {
                      jsonrpc: '2.0',
                      result: subscriptionResult,
                      id,
                    },
                  },
                };
              }

              return null;
            };

            const buildSolanaSocketResponseDispatcher = (socket) => {
              const nextSubscriptionIdRef = { value: 8648699534240963 };
              return (rawPayload) => {
                const mockResponse = resolveSolanaWebSocketResponse(
                  rawPayload,
                  nextSubscriptionIdRef,
                );
                if (!mockResponse) {
                  return;
                }

                const dispatch = (responseDef) => {
                  if (!responseDef) {
                    return;
                  }
                  setTimeout(() => {
                    emitSyntheticSocketMessage(socket, responseDef.payload);
                  }, responseDef.delayMs ?? 0);
                };

                dispatch(mockResponse.initialResponse);
                dispatch(mockResponse.followUpResponse);
              };
            };

            const createWebSocket = (url, protocols) => {
              if (typeof protocols === 'undefined') {
                return new OriginalWebSocket(url);
              }
              return new OriginalWebSocket(url, protocols);
            };

            const createProxiedWebSocket = (targetUrl, protocols) => {
              let lastError;
              for (const proxyBaseUrl of wsProxyCandidates) {
                try {
                  return createWebSocket(
                    buildProxyWebSocketUrl(proxyBaseUrl, targetUrl),
                    protocols,
                  );
                } catch (error) {
                  lastError = error;
                }
              }
              if (lastError) {
                // eslint-disable-next-line no-console
                console.log(
                  '[SNAPS E2E PROXY] Failed to create proxied WebSocket, using original URL',
                  lastError,
                );
              }
              return createWebSocket(targetUrl, protocols);
            };

            targetWindow.WebSocket = function (url, protocols) {
              const targetUrl = toUrlString(url);
              if (
                !shouldProxyWebSocketUrl(targetUrl) ||
                !isSolanaInfuraWebSocketUrl(targetUrl)
              ) {
                return createWebSocket(url, protocols);
              }

              const socket = createProxiedWebSocket(targetUrl, protocols);
              const dispatchSolanaMockResponse =
                buildSolanaSocketResponseDispatcher(socket);
              const originalSend = socket.send?.bind(socket);
              if (typeof originalSend === 'function') {
                socket.send = function (payload) {
                  dispatchSolanaMockResponse(payload);
                  try {
                    return originalSend(payload);
                  } catch (error) {
                    // eslint-disable-next-line no-console
                    console.log(
                      '[SNAPS E2E PROXY] Solana websocket send failed, synthetic response still dispatched',
                      error,
                    );
                    return undefined;
                  }
                };
              }

              return socket;
            };

            targetWindow.WebSocket.prototype = OriginalWebSocket.prototype;
            try {
              Object.setPrototypeOf(targetWindow.WebSocket, OriginalWebSocket);
              Object.assign(targetWindow.WebSocket, OriginalWebSocket);
            } catch {
              // no-op
            }
          }
        };

        const patchIframeElement = (iframe) => {
          if (!iframe || typeof iframe.addEventListener !== 'function') {
            return;
          }

          const patchIframeWindow = () => {
            try {
              patchWindowNetworkApis(iframe.contentWindow);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log('[SNAPS E2E PROXY] Failed to patch iframe', error);
            }
          };

          patchIframeWindow();
          iframe.addEventListener('load', patchIframeWindow);
        };

        patchWindowNetworkApis(window);

        try {
          document.querySelectorAll('iframe').forEach((iframe) => {
            patchIframeElement(iframe);
          });
        } catch {
          // no-op
        }

        try {
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLIFrameElement) {
                  patchIframeElement(node);
                } else if (
                  node instanceof HTMLElement &&
                  typeof node.querySelectorAll === 'function'
                ) {
                  node.querySelectorAll('iframe').forEach((iframe) => {
                    patchIframeElement(iframe);
                  });
                }
              });
            }
          });
          observer.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true,
          });
        } catch {
          // no-op
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('[SNAPS E2E PROXY] Failed to patch network APIs', error);
      }
    })();
    true;
  `;
};

const shouldPatchSnapsWebViewProxy = () => isE2E || enableApiCallLogs;

// This is a hack to allow us to asynchronously await the creation of the WebView.
// eslint-disable-next-line import/no-mutable-exports
export let createWebView: (jobId: string) => Promise<WebViewInterface>;
// eslint-disable-next-line import/no-mutable-exports
export let removeWebView: (jobId: string) => void;

interface WebViewState {
  ref?: WebView;
  listener?: (event: PostMessageEvent) => void;
  props: {
    onWebViewMessage: (data: WebViewMessageEvent) => void;
    onWebViewLoad: () => void;
    onWebViewError: (error: NativeSyntheticEvent<WebViewError>) => void;
    ref: (ref: WebView) => void;
  };
}

// This is a class component because storing the references we are don't work in functional components.
export class SnapsExecutionWebView extends Component {
  webViews: Record<string, WebViewState> = {};

  constructor(props: EmptyObject) {
    super(props);

    createWebView = this.createWebView.bind(this);
    removeWebView = this.removeWebView.bind(this);
  }

  createWebView(jobId: string) {
    const promise = new Promise<WebViewInterface>((resolve, reject) => {
      const onWebViewLoad = () => {
        if (shouldPatchSnapsWebViewProxy()) {
          this.webViews[jobId]?.ref?.injectJavaScript(
            buildE2EProxyPatchScript({
              mockServerPort: String(getMockServerPortInApp()),
              platform: Platform.OS,
              snapId: jobId,
            }),
          );
        }

        const api = {
          injectJavaScript: (js: string) => {
            this.webViews[jobId]?.ref?.injectJavaScript(js);
          },
          registerMessageListener: (
            listener: (event: PostMessageEvent) => void,
          ) => {
            if (this.webViews[jobId]) {
              this.webViews[jobId].listener = listener;
            }
          },
          unregisterMessageListener: (
            _listener: (event: PostMessageEvent) => void,
          ) => {
            if (this.webViews[jobId]) {
              this.webViews[jobId].listener = undefined;
            }
          },
        };
        resolve(api);
      };

      const onWebViewMessage = (data: WebViewMessageEvent) => {
        if (this.webViews[jobId]?.listener) {
          this.webViews[jobId].listener?.(
            data.nativeEvent as unknown as PostMessageEvent,
          );
        }
      };

      const onWebViewError = (error: NativeSyntheticEvent<WebViewError>) => {
        reject(error);
      };

      const setWebViewRef = (ref: WebView) => {
        if (this.webViews[jobId]) {
          this.webViews[jobId].ref = ref;
        }
      };

      this.webViews[jobId] = {
        props: {
          onWebViewLoad,
          onWebViewError,
          onWebViewMessage,
          ref: setWebViewRef,
        },
      };
    });

    // Force re-render.
    this.forceUpdate();

    return promise;
  }

  removeWebView(jobId: string) {
    delete this.webViews[jobId];

    // Force re-render.
    this.forceUpdate();
  }

  render() {
    return (
      <View style={styles.container}>
        {Object.entries(this.webViews).map(([key, { props }]) => {
          const e2eProxyPatchScript = shouldPatchSnapsWebViewProxy()
            ? buildE2EProxyPatchScript({
                mockServerPort: String(getMockServerPortInApp()),
                platform: Platform.OS,
                snapId: key,
              })
            : undefined;

          return (
            <WebView
              testID={key}
              key={key}
              ref={props.ref}
              source={{ html: WebViewHTML, baseUrl: 'https://localhost' }}
              injectedJavaScriptBeforeContentLoaded={e2eProxyPatchScript}
              onMessage={props.onWebViewMessage}
              onError={props.onWebViewError}
              onLoadEnd={props.onWebViewLoad}
              originWhitelist={['*']}
              javaScriptEnabled
              webviewDebuggingEnabled={__DEV__}
            />
          );
        })}
      </View>
    );
  }
}
///: END:ONLY_INCLUDE_IF
