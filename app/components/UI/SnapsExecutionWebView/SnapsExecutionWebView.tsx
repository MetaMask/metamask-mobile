///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
    console.log('SNAPS: setWebviewPostMessage called');
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
    console.log('SNAPS: messageFromWebview called with data: ' + data);
  };

  const envURI = {
    prod: 'https://gantunesr.github.io/mobile-execution-environment/',
    new: 'https://jonathansoufer.github.io/',
    //localIOS: 'http://localhost:3001/mobile-execution-environment',
    // localAndroid: 'http://10.0.2.2:3001/mobile-execution-environment',
  };

  return (
    <ScrollView>
      <View style={styles.webview}>
        <WebView
          ref={webviewRef}
          source={{
            uri: envURI.new,
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
///: END:ONLY_INCLUDE_IF
