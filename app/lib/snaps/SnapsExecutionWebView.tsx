///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { Component } from 'react';
import { View } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { LaunchArguments } from 'react-native-launch-arguments';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import {
  WebViewNavigationEvent,
  WebViewErrorEvent,
} from '@metamask/react-native-webview/src/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
import WebViewHTML from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';
import { EmptyObject } from '@metamask/snaps-sdk';
import { assert, hasProperty } from '@metamask/utils';
import Logger from '../../util/Logger';
import { isE2E } from '../../util/test/utils';
import { createPatchedSnapsHTML } from './e2e/createPatchedSnapsHTML';

const styles = createStyles();

/**
 * Get the appropriate HTML for the Snaps execution environment.
 * In E2E tests, returns patched HTML that routes fetch calls through the mock server.
 * In production, returns the original unmodified HTML.
 *
 * SECURITY: The isE2E check uses process.env which is evaluated at BUILD TIME.
 * In production builds (main, production, pre-release), isE2E is always false
 * and this code path is never executed. The bundler may also tree-shake this code.
 */
const getSnapsExecutionHTML = (): string => {
  // Double-check: never use patched HTML in production environments
  if (
    isE2E &&
    process.env.METAMASK_ENVIRONMENT !== 'production' &&
    process.env.METAMASK_ENVIRONMENT !== 'pre-release' &&
    process.env.METAMASK_ENVIRONMENT !== 'main'
  ) {
    try {
      const launchArgs = LaunchArguments.value<{ mockServerPort?: string }>();
      const mockServerPort = launchArgs?.mockServerPort
        ? parseInt(launchArgs.mockServerPort, 10)
        : 8000;
      // Use localhost for both platforms - on Android, adb reverse handles port forwarding
      const mockServerHost = 'localhost';
      return createPatchedSnapsHTML(mockServerPort, mockServerHost);
    } catch {
      // If anything fails, fall back to original HTML
      return WebViewHTML;
    }
  }
  return WebViewHTML;
};

// This is a hack to allow us to asynchronously await the creation of the WebView.
// eslint-disable-next-line import-x/no-mutable-exports
export let createWebView: (jobId: string) => Promise<WebViewInterface>;
// eslint-disable-next-line import-x/no-mutable-exports
export let removeWebView: (jobId: string) => void;

interface WebViewState {
  ref?: WebView;
  listener?: (event: PostMessageEvent) => void;
  props: {
    onWebViewMessage: (data: WebViewMessageEvent) => void;
    onWebViewLoad: (event: WebViewNavigationEvent | WebViewErrorEvent) => void;
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
      const api = {
        injectJavaScript: (js: string) => {
          assert(
            this.webViews[jobId]?.ref,
            'Snaps execution webview reference not found.',
          );
          this.webViews[jobId].ref?.injectJavaScript(js);
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

      const onWebViewLoad = (
        event: WebViewNavigationEvent | WebViewErrorEvent,
      ) => {
        if (hasProperty(event.nativeEvent, 'code')) {
          reject(
            new Error(
              `Snaps execution webview failed to load with error code: ${event.nativeEvent.code}`,
            ),
          );
        }
      };

      const onWebViewMessage = (data: WebViewMessageEvent) => {
        // We resolve the promise on the first message received
        resolve(api);

        if (this.webViews[jobId]?.listener) {
          try {
            this.webViews[jobId].listener?.(
              data.nativeEvent as unknown as PostMessageEvent,
            );
          } catch (error) {
            Logger.log('Snaps execution webview failure:', error);
          }
        }
      };

      const setWebViewRef = (ref: WebView) => {
        if (this.webViews[jobId]) {
          this.webViews[jobId].ref = ref;
        }
      };

      this.webViews[jobId] = {
        props: {
          onWebViewLoad,
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
    // In E2E tests, use HTTP baseUrl to allow mixed content (calling HTTP mock server)
    // In production, use HTTPS for security
    const baseUrl = isE2E ? 'http://localhost' : 'https://localhost';

    return (
      <View style={styles.container}>
        {Object.entries(this.webViews).map(([key, { props }]) => (
          <WebView
            testID={key}
            key={key}
            ref={props.ref}
            source={{ html: getSnapsExecutionHTML(), baseUrl }}
            onMessage={props.onWebViewMessage}
            onLoadEnd={props.onWebViewLoad}
            originWhitelist={['*']}
            javaScriptEnabled
            webviewDebuggingEnabled={__DEV__}
            // Allow mixed content in E2E tests (HTTP requests from HTTPS page)
            mixedContentMode={isE2E ? 'always' : 'never'}
          />
        ))}
      </View>
    );
  }
}
///: END:ONLY_INCLUDE_IF
