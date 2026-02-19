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
}

/**
 * Build a script to patch fetch/XMLHttpRequest inside the Snaps WebView runtime.
 * This makes Snap network access visible in the E2E proxy the same way as app requests.
 */
export const buildE2EProxyPatchScript = ({
  mockServerPort,
  platform,
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
        const snapProxySource = 'snap-webview';

        const buildProxyUrl = (proxyBaseUrl, targetUrl) =>
          \`\${proxyBaseUrl}/proxy?source=\${snapProxySource}&url=\${encodeURIComponent(targetUrl)}\`;

        const shouldProxyUrl = (targetUrl) =>
          typeof targetUrl === 'string' &&
          /^https?:\\/\\//.test(targetUrl) &&
          !targetUrl.includes('/proxy?') &&
          !proxyCandidates.some((candidate) => targetUrl.startsWith(candidate));

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
        {Object.entries(this.webViews).map(([key, { props }]) => (
          <WebView
            testID={key}
            key={key}
            ref={props.ref}
            source={{ html: WebViewHTML, baseUrl: 'https://localhost' }}
            onMessage={props.onWebViewMessage}
            onError={props.onWebViewError}
            onLoadEnd={props.onWebViewLoad}
            originWhitelist={['*']}
            javaScriptEnabled
            webviewDebuggingEnabled={__DEV__}
          />
        ))}
      </View>
    );
  }
}
///: END:ONLY_INCLUDE_IF
