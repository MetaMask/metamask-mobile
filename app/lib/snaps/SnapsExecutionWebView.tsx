///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { Component, RefObject, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { createStyles } from './styles';

const ENV_URI = 'http://localhost:6363';

const styles = createStyles();

// This is a hack to allow us to asynchronously await the creation of the WebView.
let resolveGetWebView;
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
      injectJavaScript: (js) => {
        this.webViewRef.injectJavaScript(js);
      },
      addEventListener: (_event, listener) => {
        this.listener = listener;
      },
      removeEventListener: (_event, _listener) => {
        this.listener = null;
      },
    };

    resolveGetWebView(api);
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
            source={{
              uri: ENV_URI,
            }}
            onMessage={this.onWebViewMessage}
            // TODO: Handle load error
            onLoadEnd={this.onWebViewLoad}
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
