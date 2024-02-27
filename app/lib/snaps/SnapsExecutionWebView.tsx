/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { Component, RefObject } from 'react';
import { View, ScrollView, NativeSyntheticEvent } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/dist/types/services/webview/WebViewMessageStream';
import { WebViewError } from 'react-native-webview/lib/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';

const styles = createStyles();

interface SnapsExecutionWebViewProps {
  injectJavaScript(js: string): void;
  registerMessageListener(listener: (event: PostMessageEvent) => void): void;
  unregisterMessageListener(listener: (event: PostMessageEvent) => void): void;
}
// This is a hack to allow us to asynchronously await the creation of the WebView.
let resolveGetWebView: (arg0: SnapsExecutionWebViewProps) => void;
let rejectGetWebView: (error: NativeSyntheticEvent<WebViewError>) => void;

const SNAPS_EE_URL = 'https://execution.metamask.io/webview/4.0.0/index.html';

export const getSnapsWebViewPromise = new Promise<WebViewInterface>(
  (resolve, reject) => {
    resolveGetWebView = resolve;
    rejectGetWebView = reject;
  },
);

// This is a class component because storing the references we are don't work in functional components.
export class SnapsExecutionWebView extends Component {
  webViewRef: RefObject<WebView> | any = null;
  listener: any = null;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(props: any) {
    super(props);
  }

  setWebViewRef(ref: React.RefObject<WebView<{ any: any }>> | null) {
    this.webViewRef = ref;
  }

  onWebViewLoad() {
    const api = {
      injectJavaScript: (js: string) => {
        this.webViewRef?.injectJavaScript(js);
      },
      registerMessageListener: (
        listener: (event: PostMessageEvent) => void,
      ) => {
        this.listener = listener;
      },
      unregisterMessageListener: (
        _listener: (event: PostMessageEvent) => void,
      ) => {
        this.listener = null;
      },
    };

    resolveGetWebView(api);
  }

  onWebViewError(error: NativeSyntheticEvent<WebViewError>) {
    rejectGetWebView(error);
  }

  onWebViewMessage(data: WebViewMessageEvent) {
    if (this.listener) {
      this.listener(data.nativeEvent);
    }
  }

  render() {
    return (
      <ScrollView testID={'load-snap-webview'}>
        <View style={styles.webview}>
          <WebView
            ref={
              this.setWebViewRef as unknown as React.RefObject<WebView> | null
            }
            source={{
              uri: SNAPS_EE_URL,
            }}
            onMessage={this.onWebViewMessage}
            onError={this.onWebViewError}
            onLoadEnd={this.onWebViewLoad}
            originWhitelist={['https://execution.metamask.io*']}
            javaScriptEnabled
          />
        </View>
      </ScrollView>
    );
  }
}

///: END:ONLY_INCLUDE_IF
