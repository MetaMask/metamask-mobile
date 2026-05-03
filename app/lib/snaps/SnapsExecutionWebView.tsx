///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { Component } from 'react';
import { View } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import {
  WebViewNavigationEvent,
  WebViewErrorEvent,
} from '@metamask/react-native-webview/src/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
// eslint-disable-next-line import-x/no-unresolved
import WebViewHTMLRaw from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';
import { EmptyObject } from '@metamask/snaps-sdk';
import { assert, hasProperty } from '@metamask/utils';
import Logger from '../../util/Logger';

const styles = createStyles();

// LavaMoat scuttling inside the snap iframe locks down `globalThis` after
// `lockdown()` runs. Any property of `globalThis` that is not in the
// scuttling allow-list throws when accessed (see Sentry issue #19735).
//
// Several first-party snaps (`bitcoin-wallet-snap`, `tron-wallet-snap`,
// `ethereum-provider-example-snap`, …) — and any third-party snap whose
// bundle pulls in libraries that touch the DOM serialization APIs —
// transitively reach for `XMLSerializer` / `DOMParser` during startup,
// which currently kills the snap with `code: -32603` and surfaces in CI as
// "The Snap … has been terminated during execution.".
//
// We extend the bundled `scuttleGlobalThis.exceptions` array to keep these
// browser intrinsics reachable from inside the snap sandbox. The fix is
// applied to the imported HTML string at module load time so it survives
// upgrades of `@metamask/snaps-execution-environments` for as long as the
// generated allow-list shape stays the same.
const SCUTTLING_EXCEPTIONS_ORIGINAL =
  'scuttleGlobalThis:{enabled:!0,exceptions:["Object","postMessage","Reflect","Set","JSON","ReactNativeWebView","String","webpackChunk_metamask_snaps_execution_environments"]}';
const SCUTTLING_EXCEPTIONS_PATCHED =
  'scuttleGlobalThis:{enabled:!0,exceptions:["Object","postMessage","Reflect","Set","JSON","ReactNativeWebView","String","XMLSerializer","DOMParser","webpackChunk_metamask_snaps_execution_environments"]}';

const patchSnapsWebViewHTML = (html: string): string => {
  if (!html.includes(SCUTTLING_EXCEPTIONS_ORIGINAL)) {
    if (!html.includes('"XMLSerializer"')) {
      Logger.log(
        'SnapsExecutionWebView: scuttleGlobalThis exceptions list shape changed; XMLSerializer/DOMParser patch was not applied. See Sentry #19735.',
      );
    }
    return html;
  }
  return html.replace(
    SCUTTLING_EXCEPTIONS_ORIGINAL,
    SCUTTLING_EXCEPTIONS_PATCHED,
  );
};

const WebViewHTML = patchSnapsWebViewHTML(WebViewHTMLRaw as string);

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
    return (
      <View style={styles.container}>
        {Object.entries(this.webViews).map(([key, { props }]) => (
          <WebView
            testID={key}
            key={key}
            ref={props.ref}
            source={{ html: WebViewHTML, baseUrl: 'https://localhost' }}
            onMessage={props.onWebViewMessage}
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
