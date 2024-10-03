///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useRef, useCallback } from 'react';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import { PostMessageEvent } from '@metamask/post-message-stream';
import { ScrollView, View } from 'react-native';
import { createStyles } from './styles';

const SNAPS_EE_URL = 'https://execution.metamask.io/webview/6.7.1/index.html';

const styles = createStyles();
interface SnapsExecutionWebViewProps {
  onWebViewReady: (webView: WebViewInterface) => void;
}

export const SnapsExecutionWebView: React.FC<SnapsExecutionWebViewProps> = ({ onWebViewReady }) => {
  const webViewRef = useRef<WebView>(null);
  const listenerRef = useRef<((event: PostMessageEvent) => void) | null>(null);

  const onWebViewLoad = useCallback(() => {
    const api: WebViewInterface = {
      injectJavaScript: (js: string) => {
        webViewRef.current?.injectJavaScript(js);
      },
      registerMessageListener: (listener: (event: PostMessageEvent) => void) => {
        listenerRef.current = listener;
      },
      unregisterMessageListener: () => {
        listenerRef.current = null;
      },
    };

    onWebViewReady(api);
  }, [onWebViewReady]);

  const onWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    if (listenerRef.current) {
      listenerRef.current({
        data: event.nativeEvent.data,
        origin: '*',
        source: window,
      });
    }
  }, []);

  return (
    <ScrollView testID={'load-snap-webview'}>
      <View style={styles.webview}>
      <WebView
        ref={webViewRef}
        source={{ uri: SNAPS_EE_URL }}
        onMessage={onWebViewMessage}
        onLoadEnd={onWebViewLoad}
        originWhitelist={['https://execution.metamask.io*']}
        javaScriptEnabled
        />
      </View>
    </ScrollView>
  );
};

///: END:ONLY_INCLUDE_IF
