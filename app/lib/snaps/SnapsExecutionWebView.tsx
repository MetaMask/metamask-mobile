///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { Component, RefObject } from 'react';
import { View, ScrollView, NativeSyntheticEvent } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import { WebViewError } from '@metamask/react-native-webview/lib/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
import WebViewHTML from '@metamask/snaps-execution-environments/dist/browserify/webview/index.html';

const styles = createStyles();

// This is a hack to allow us to asynchronously await the creation of the WebView.
export let createWebView: (jobId: string) => Promise<WebViewInterface>;
export let removeWebView: (jobId: string) => void;

type WebViewState = {
  ref?: WebView;
  listener?: (event: PostMessageEvent) => void;
  props: any;
}

// This is a class component because storing the references we are don't work in functional components.
export class SnapsExecutionWebView extends Component {
  webViews: Record<string, WebViewState> = {};

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(props: any) {
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
        }
        resolve(api);
      }

      const onWebViewMessage = (data: WebViewMessageEvent) => {
        if (this.webViews[jobId]?.listener) {
          this.webViews[jobId].listener(data.nativeEvent as any);
        }
      }

      const onWebViewError = (error: NativeSyntheticEvent<WebViewError>) => {
        reject(error);
      }

      const setWebViewRef = (ref: WebView<{ any: any }>) => {
        if (this.webViews[jobId]) {
          this.webViews[jobId].ref = ref;
        }
      }

      this.webViews[jobId] = {
        props: {
          onWebViewLoad,
          onWebViewError,
          onWebViewMessage,
          ref: setWebViewRef
        }
      }
    })

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
      <ScrollView>
        <View style={styles.webview}>
          {Object.entries(this.webViews).map(([key, { props }]) => (
            <WebView
              key={key}
              ref={props.ref}
              source={{ html: WebViewHTML, baseUrl: 'https://localhost' }}
              onMessage={props.onWebViewMessage}
              onError={props.onWebViewError}
              onLoadEnd={props.onWebViewLoad}
              originWhitelist={['*']}
              javaScriptEnabled
            />
          ))}

        </View>
      </ScrollView>
    );
  }
}

///: END:ONLY_INCLUDE_IF
