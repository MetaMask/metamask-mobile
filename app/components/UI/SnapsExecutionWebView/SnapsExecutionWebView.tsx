import React, { useRef } from 'react';
import { View, ScrollView } from 'react-native';
import { Button } from 'react-native-share';
import WebView from 'react-native-webview';
import { snapsState, WebviewPostMessageStream } from '../../../core/Snaps';
import { createStyles } from './styles';

import Engine from '../../../core/Engine';

const TEST_SNAP_ID_ONE = 'local:http://localhost:3000/snap/';
const TEST_SNAP_ID_TWO = 'local:http://localhost:3000/helloworldsnap/';

let stream: any;

const SnapsExecutionWebView = () => {
  const styles = createStyles();

  const webviewRef = useRef();

  const installSnap = async (snapId: string): Promise<void> => {
    const mockOrigin = 'origin';
    const { SnapController } = Engine.context as any;
    await SnapController.processRequestedSnap(mockOrigin, snapId, '');
    // await SnapController.installSnaps(mockOrigin, {
    //   [snapId]: {},
    // });
    // await snapController.terminateSnap(snapId);
  };

  const executeTestSnap = async (snapId: string) => {
    // eslint-disable-next-line no-console
    const { SnapController } = Engine.context as any;
    const localSnap = snapId;
    const origin = 'origin';
    const result = await SnapController.handleRequest({
      snapId: localSnap,
      origin,
      handler: 'onRpcRequest',
      request: {
        method: 'hello',
      },
    });
    // eslint-disable-next-line no-console
    console.log(result);
  };

  const getInstalledSnaps = () => {
    const { SnapController } = Engine.context as any;
    // eslint-disable-next-line no-console
    console.log(SnapController.internalState.snaps);
  };

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
      <Button onPress={async () => await installSnap(TEST_SNAP_ID_ONE)}>
        Install Test Snap 1
      </Button>
      <Button onPress={async () => await installSnap(TEST_SNAP_ID_TWO)}>
        Install Test Snap 2
      </Button>
      <Button onPress={async () => await executeTestSnap(TEST_SNAP_ID_TWO)}>
        Test Hello World Snap
      </Button>
      <Button onPress={getInstalledSnaps}>Get installed snaps</Button>
      <View style={styles.webview}>
        <WebView
          ref={webviewRef}
          source={{ uri: 'http://localhost:3001/' }}
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
