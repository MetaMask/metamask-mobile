import { SnapController } from '@metamask/snap-controllers';
import React, { useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { connect } from 'react-redux';
import Engine from '../../../core/Engine';

interface IProps {
  snapController: SnapController;
}

const url = 'https://metamask.github.io/iframe-execution-environment/0.4.4';

const Snaps = (props: IProps) => {
  const webViewRef = useRef(null);

  useEffect(() => {
    if (webViewRef.current) {
      Engine.context.MobileIframeExecutionService.setWebview(
        webViewRef.current,
      );
      // setWebview
    }
  });

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      onMessage={(message) => {
        // call postMessage on SnapMobileStream
        Engine.context.MobileIframeExecutionService._onMessage(
          message.nativeEvent.data,
        );
        console.log('onmessage-------------', message.nativeEvent.data);
        // {target: 'parent', data: 'SYN'}
      }}
    />
  );
};

const mapStateToProps = (state: any) => ({
  snapController: state.engine.backgroundState.SnapController,
});

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Snaps);
