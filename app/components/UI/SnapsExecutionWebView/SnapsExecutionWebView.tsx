import React, { useRef } from 'react';
import { View, ScrollView } from 'react-native';
import WebView from 'react-native-webview';
import { snapsState, WebviewPostMessageStream } from '../../../core/Snaps';
import { createStyles } from './styles';

let stream: any;

const SnapsExecutionWebView = () => {
  const styles = createStyles();

  const webviewRef = useRef();

  const setWebviewPostMessage = () => {
    stream = new WebviewPostMessageStream({
      name: 'rnside',
      target: 'webview',
      targetOrigin: '*',
      targetWindow: webviewRef.current,
    });

    // eslint-disable-next-line no-console
    stream.on('data', (data: any) =>
      // eslint-disable-next-line no-console
      console.log(
        '[APP LOG] setWebviewPostMessage: Message from Webview ' + data,
      ),
    );

    snapsState.stream = stream;
    snapsState.webview = webviewRef.current;
  };

  const messageFromWebview = (data: any) => {
    stream?._onMessage(data);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.webview}>
        <WebView
          ref={webviewRef}
          source={{
            uri: 'https://gantunesr.github.io/mobile-execution-environment/',
          }}
          onMessage={messageFromWebview}
          onLoadEnd={setWebviewPostMessage}
          originWhitelist={['*']}
          javaScriptEnabled
        />
      </View>
    </ScrollView>
  );
};

export default SnapsExecutionWebView;
