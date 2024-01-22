/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { Component, RefObject } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { createStyles } from './styles';

const sourceUri =
  (Platform.OS === 'android' ? 'file:///android_asset/' : '') +
  'web.bundle/index.html';

let EE = sourceUri;
let attempts = 0;

const styles = createStyles();

interface SnapsExecutionWebViewProps {
  injectJavaScript: (js: string) => void;
  addEventListener: (_event: any, listener: any) => void;
  removeEventListener: (_event: any, _listener: any) => void;
}
// This is a hack to allow us to asynchronously await the creation of the WebView.
let resolveGetWebView: (arg0: SnapsExecutionWebViewProps) => void;
export const getSnapsWebViewPromise = new Promise((resolve) => {
  resolveGetWebView = resolve;
});

// This is a class component because storing the references we are don't work in functional components.
export class SnapsExecutionWebView extends Component {
  webViewRef: RefObject<WebView> | null = null;
  listener: any = null;

  constructor(props: any) {
    super(props);
  }

  setWebViewRef(ref) {
    this.webViewRef = ref;
  }

  onWebViewLoad() {
    const api = {
      injectJavaScript: (js: string) => {
        this.webViewRef?.injectJavaScript(js);
      },
      addEventListener: (_event: any, listener: any) => {
        this.listener = listener;
      },
      removeEventListener: (_event: any, _listener: any) => {
        this.listener = null;
      },
    };

    resolveGetWebView(api);
  }

  onWebViewError() {
    attempts++;
    if (attempts < 2) {
      // TODO: This should point to a AWS S3 bucket as a fallback.
      EE = 'https://jonathansoufer.github.io/';
      this.webViewRef?.reload();
    }
  }

  onWebViewMessage(data: WebViewMessageEvent) {
    if (this.listener) {
      this.listener(data.nativeEvent);
    }
  }

  render() {
    return (
      <ScrollView>
        <View style={styles.webview}>
          <WebView
            ref={this.setWebViewRef}
            source={{ uri: EE }}
            onMessage={this.onWebViewMessage}
            onError={this.onWebViewError}
            onLoadEnd={this.onWebViewLoad}
            allowFileAccess
            // TODO: This should probably change
            originWhitelist={['*']}
            javaScriptEnabled
          />
        </View>
      </ScrollView>
    );
  }
}

///: END:ONLY_INCLUDE_IF
