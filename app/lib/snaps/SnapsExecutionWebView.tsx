///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { Component } from 'react';
import { View, NativeSyntheticEvent } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import { WebViewError } from '@metamask/react-native-webview/lib/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
import WebViewHTML from '@metamask/snaps-execution-environments/dist/browserify/webview/index.html';
import { EmptyObject } from '@metamask/snaps-sdk';

const styles = createStyles();

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
export class SnapsExecutionWebView extends Component<
  EmptyObject,
  { webViewIds: string[] }
> {
  webViews: Record<string, WebViewState> = {};
  pendingUpdates: string[] = [];
  updateScheduled = false;

  constructor(props: EmptyObject) {
    super(props);
    this.state = { webViewIds: [] };

    createWebView = this.createWebView.bind(this);
    removeWebView = this.removeWebView.bind(this);
  }

  componentWillUnmount() {
    // Clean up all WebViews when component unmounts
    Object.keys(this.webViews).forEach((jobId) => {
      this.webViews[jobId].listener = undefined;
      this.webViews[jobId].ref = undefined;
    });
    this.webViews = {};
  }

  scheduleUpdate() {
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      // Batch updates using setTimeout to allow multiple create/remove operations
      // to be processed in a single render cycle
      setTimeout(() => {
        this.setState({ webViewIds: Object.keys(this.webViews) });
        this.updateScheduled = false;
      }, 0);
    }
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

    // Schedule state update instead of forcing immediate re-render
    this.scheduleUpdate();

    return promise;
  }

  removeWebView(jobId: string) {
    // Clean up the WebView resources
    if (this.webViews[jobId]) {
      this.webViews[jobId].listener = undefined;
      this.webViews[jobId].ref = undefined;
      delete this.webViews[jobId];
    }

    // Schedule state update instead of forcing immediate re-render
    this.scheduleUpdate();
  }

  renderWebView = (jobId: string) => {
    const { props } = this.webViews[jobId];

    return (
      <WebView
        testID={jobId}
        key={jobId}
        ref={props.ref}
        source={{ html: WebViewHTML, baseUrl: 'https://localhost' }}
        onMessage={props.onWebViewMessage}
        onError={props.onWebViewError}
        onLoadEnd={props.onWebViewLoad}
        originWhitelist={['*']}
        javaScriptEnabled
        cacheEnabled
        cacheMode={'LOAD_CACHE_ELSE_NETWORK'}
        androidLayerType="hardware"
        renderToHardwareTextureAndroid
        textZoom={100}
        // Disable unnecessary features for better performance
        startInLoadingState={false}
        domStorageEnabled={false}
        mediaPlaybackRequiresUserAction
        sharedCookiesEnabled={false}
      />
    );
  };

  render() {
    return (
      <View style={styles.container}>
        {this.state.webViewIds.map((jobId) => this.renderWebView(jobId))}
      </View>
    );
  }
}
///: END:ONLY_INCLUDE_IF
