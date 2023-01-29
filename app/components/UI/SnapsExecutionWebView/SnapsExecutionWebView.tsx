import React, { useRef } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import WebView from 'react-native-webview';
import { snapsState, WebviewPostMessageStream } from '../../../core/Snaps';
import { createStyles } from './styles';

import Engine from '../../../core/Engine';

const INSTALL_SUCCESS_MESSAGE = (id: string) => `Snap ${id} installed 🎉🎉🎉`;
const INSTALL_FAILED_MESSAGE = (id: string) =>
  `Snap ${id} failed to install 💀💀💀`;

let stream: any;

const SnapsExecutionWebView = () => {
  const styles = createStyles();

  const webviewRef = useRef();

  const installSnap = async (snapId: string): Promise<void> => {
    const mockOrigin = 'origin';
    const { SnapController } = Engine.context as any;
    await SnapController.installSnaps(mockOrigin, { [snapId]: {} });
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
