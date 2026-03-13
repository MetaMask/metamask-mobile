///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { Component } from 'react';
import { View, NativeSyntheticEvent } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import { WebViewError } from '@metamask/react-native-webview/src/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
import WebViewHTML from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';
import { EmptyObject } from '@metamask/snaps-sdk';
import {
  FALLBACK_MOCK_SERVER_PORT,
  isE2E,
  testConfig,
} from '../../util/test/utils';

const styles = createStyles();

const getE2ENetworkProxyInjection = (mockServerPort: string): string => `
  (function() {
    var mockServerUrl = 'http://localhost:${mockServerPort}';
    var proxyPrefix = mockServerUrl + '/proxy?url=';

    function toUrlString(url) {
      if (typeof url === 'string') {
        return url;
      }
      if (url && typeof url === 'object' && typeof url.url === 'string') {
        return url.url;
      }
      return String(url);
    }

    function shouldProxy(url) {
      return (
        typeof url === 'string' &&
        (url.startsWith('http://') || url.startsWith('https://')) &&
        !url.includes('/proxy?url=') &&
        !url.includes('localhost:${mockServerPort}') &&
        !url.includes('127.0.0.1:${mockServerPort}') &&
        !url.includes('10.0.2.2:${mockServerPort}')
      );
    }

    if (typeof fetch === 'function') {
      var originalFetch = fetch.bind(window);
      window.fetch = function(url, options) {
        var urlString = toUrlString(url);
        var finalUrl = shouldProxy(urlString)
          ? proxyPrefix + encodeURIComponent(urlString)
          : url;
        return originalFetch(finalUrl, options);
      };
    }

    var OriginalXHR = window.XMLHttpRequest;
    if (typeof OriginalXHR === 'function') {
      window.XMLHttpRequest = function() {
        var xhr = new OriginalXHR();
        var originalOpen = xhr.open;

        xhr.open = function(method, url) {
          var openArgs = Array.prototype.slice.call(arguments, 2);
          var finalUrl = shouldProxy(url)
            ? proxyPrefix + encodeURIComponent(url)
            : url;
          return originalOpen.call.apply(
            originalOpen,
            [this, method, finalUrl].concat(openArgs),
          );
        };

        return xhr;
      };

      try {
        Object.setPrototypeOf(window.XMLHttpRequest, OriginalXHR);
        Object.assign(window.XMLHttpRequest, OriginalXHR);
        window.XMLHttpRequest.prototype = OriginalXHR.prototype;
      } catch (e) {
        // No-op: this is best effort in the constrained WebView runtime.
      }
    }
  })();
  true;
`;

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
    const mockServerPort = String(
      testConfig.mockServerPort ?? FALLBACK_MOCK_SERVER_PORT,
    );
    const e2eWebViewNetworkProxyInjection = isE2E
      ? getE2ENetworkProxyInjection(mockServerPort)
      : undefined;
    const mixedContentMode = isE2E ? 'always' : undefined;

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
            mixedContentMode={mixedContentMode}
            injectedJavaScriptBeforeContentLoaded={
              e2eWebViewNetworkProxyInjection
            }
            javaScriptEnabled
            webviewDebuggingEnabled={__DEV__}
          />
        ))}
      </View>
    );
  }
}
///: END:ONLY_INCLUDE_IF
