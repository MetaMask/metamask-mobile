/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useCallback } from 'react';
import { View, ScrollView, NativeSyntheticEvent } from 'react-native';
import { useSelector } from 'react-redux';
import WebView, { WebViewMessageEvent } from '@metamask/react-native-webview';
import { WebViewError } from '@metamask/react-native-webview/lib/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
import { WebViewInterface } from '@metamask/snaps-controllers/dist/types/services/webview/WebViewMessageStream';
import Engine from '../../core/Engine';
import { RootState } from '../../reducers';
import { createStyles } from './styles';
import { SnapId } from '@metamask/snaps-sdk';

const SNAPS_EE_URL = 'https://execution.metamask.io/webview/6.6.2/index.html';

const styles = createStyles();

interface SnapsExecutionWebViewProps {
  injectJavaScript(js: string): void;
  registerMessageListener(listener: (event: PostMessageEvent) => void): void;
  unregisterMessageListener(listener: (event: PostMessageEvent) => void): void;
}

let resolveGetWebView: (arg0: SnapsExecutionWebViewProps) => void;
let rejectGetWebView: (error: NativeSyntheticEvent<WebViewError>) => void;

export const getSnapsWebViewPromise = new Promise<WebViewInterface>(
  (resolve, reject) => {
    resolveGetWebView = resolve;
    rejectGetWebView = reject;
  },
);

export const SnapsExecutionWebView: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const listenerRef = useRef<any>(null);
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const onWebViewLoad = useCallback(() => {
    const api = {
      injectJavaScript: (js: string) => {
        webViewRef.current?.injectJavaScript(js);
      },
      registerMessageListener: (
        listener: (event: PostMessageEvent) => void,
      ) => {
        listenerRef.current = listener;
      },
      unregisterMessageListener: (
        _listener: (event: PostMessageEvent) => void,
      ) => {
        listenerRef.current = null;
      },
    };

    resolveGetWebView(api);
  }, []);

  const onWebViewError = useCallback(
    (error: NativeSyntheticEvent<WebViewError>) => {
      rejectGetWebView(error);
    },
    [],
  );

  const onWebViewMessage = useCallback((data: WebViewMessageEvent) => {
    if (listenerRef.current) {
      listenerRef.current(data.nativeEvent);
    }
  }, []);

  useEffect(
    () =>
      // Cleanup function to reset the promise handlers when the component unmounts
      () => {
        resolveGetWebView = () => {
          console.log('Reset resolveGetWebView');
        };
        rejectGetWebView = () => {
          console.log('Reset rejectGetWebView');
        };
      },
    [],
  );

  useEffect(() => {
    if (!basicFunctionalityEnabled) {
      try {
        Engine.context.SnapController.stopSnap(
          'npm:@metamask/message-signing-snap' as SnapId,
        );
      } catch (error) {
        console.error(error);
      }
    }
  }, [basicFunctionalityEnabled]);

  if (!basicFunctionalityEnabled) {
    return null;
  }

  return (
    <ScrollView testID={'load-snap-webview'}>
      <View style={styles.webview}>
        <WebView
          ref={webViewRef}
          source={{ uri: SNAPS_EE_URL }}
          onMessage={onWebViewMessage}
          onError={onWebViewError}
          onLoadEnd={onWebViewLoad}
          originWhitelist={['https://execution.metamask.io*']}
          javaScriptEnabled
        />
      </View>
    </ScrollView>
  );
};
