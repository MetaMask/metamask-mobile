import React, { useRef } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import WebView from 'react-native-webview';
import { snapsState, WebviewPostMessageStream } from '../../../core/Snaps';
import { createStyles } from './styles';

let stream: any;

const SnapsExecutionWebView = () => {
  const styles = createStyles();

  const webviewRef = useRef();

  const setWebviewPostMessage = () => {
    console.log('[Snaps/ APP] setWebviewPostMessage called');
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
  // https://gantunesr.github.io/mobile-execution-environment/
  // http://localhost:3001/mobile-execution-environment
  // http://10.0.2.2:3001/mobile-execution-environment
  const envIRI =
    Platform.OS === 'android'
      ? 'http://10.0.2.2:3001/mobile-execution-environment'
      : 'http://localhost:3001/mobile-execution-environment';

  const injectedJavascript = `(function() {
    window.postMessage = function(data) {
      window.ReactNativeWebView.postMessage(data);
    };
  })()`;

  const runBeforeFirst = `
  window.isNativeApp = true;
  true; // note: this is required, or you'll sometimes get silent failures
`;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.webview}>
        <WebView
          ref={webviewRef}
          source={{
            uri: envIRI,
          }}
          onMessage={(event) => {
            console.log(
              '[APP LOG] WebView onMessage called',
              event.nativeEvent.data,
            );
            messageFromWebview(event);
          }}
          onLoadEnd={() => {
            console.log('[Snaps/] WebView onLoadEnd called');
            setWebviewPostMessage();
          }}
          originWhitelist={['*']}
          javaScriptEnabled
          injectedJavaScript={injectedJavascript}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
        />
      </View>
    </ScrollView>
  );
};

export default SnapsExecutionWebView;
