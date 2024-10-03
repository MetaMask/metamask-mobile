import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import { SnapsExecutionWebView } from './SnapsExecutionWebView';
import { RootState } from '../../reducers';

// Create a new promise that will be resolved when the WebView is ready
let resolveWebViewPromise: (webView: WebViewInterface) => void;
export const getSnapsWebViewPromise = new Promise<WebViewInterface>((resolve) => {
  resolveWebViewPromise = resolve;
});

const SnapsExecutionWebViewWrapper: React.FC = () => {
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const [webViewInterface, setWebViewInterface] = useState<WebViewInterface | null>(null);

  useEffect(() => {
    if (webViewInterface) {
      resolveWebViewPromise(webViewInterface);
    }
  }, [webViewInterface]);

  if (!isBasicFunctionalityEnabled) {
    return null;
  }

  return <SnapsExecutionWebView onWebViewReady={setWebViewInterface} />;
};

export default SnapsExecutionWebViewWrapper;
