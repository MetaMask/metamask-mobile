import React, { useRef } from 'react';
import { View, ScrollView } from 'react-native';
<<<<<<< HEAD
import WebView from 'react-native-webview';
import { snapsState, WebviewPostMessageStream } from '../../../core/Snaps';
import { createStyles } from './styles';
=======
import { Button } from 'react-native-share';
import WebView from 'react-native-webview';
import { snapsState, WebviewPostMessageStream } from '../../../core/Snaps';
import { createStyles } from './styles';

import Engine from '../../../core/Engine';

const TEST_SNAP_ID_ONE = 'local:http://localhost:3000/snap/';
const TEST_SNAP_ID_TWO = 'local:http://localhost:3000/snapother/';
>>>>>>> 2c98d4f88 (Add styles to SnapsExecutionWebView for debugging)

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
<<<<<<< HEAD
      <View style={styles.webview}>
        <WebView
          ref={webviewRef}
          source={{
            uri: 'https://gantunesr.github.io/mobile-execution-environment/',
          }}
=======
      <Button onPress={async () => await installSnap(TEST_SNAP_ID_ONE)}>
        Install Test Snap 1
      </Button>
      <Button onPress={async () => await installSnap(TEST_SNAP_ID_TWO)}>
        Install Test Snap 2
      </Button>
      <Button onPress={async () => await executeTestSnap(TEST_SNAP_ID_ONE)}>
        Execute Test Snap 1
      </Button>
      <Button onPress={getInstalledSnaps}>Get installed snaps</Button>
      <View style={styles.webview}>
        <WebView
          ref={webviewRef}
          source={{ uri: 'http://localhost:3001/' }}
>>>>>>> 2c98d4f88 (Add styles to SnapsExecutionWebView for debugging)
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
