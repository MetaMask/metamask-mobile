import React from 'react';
import { Hex } from '@metamask/utils';

interface WebViewFocus {
  webviewRef: React.RefObject<{
    injectJavaScript: (script: string) => void;
    stopLoading: () => void;
    reload: () => void;
  }>;
  isFocused: boolean;
  chainId: Hex;
  previousChainId?: Hex;
}

const handleWebViewFocus = ({
  webviewRef,
  isFocused,
  chainId,
  previousChainId,
}: WebViewFocus) => {
  if (webviewRef.current) {
    if (!isFocused) {
      webviewRef.current.stopLoading();
      // this reloads the webview to clear any setTimeOut's or setInterval's
      webviewRef.current.reload();
    }

    if (previousChainId && previousChainId !== chainId) {
      webviewRef.current.reload();
    }
  }
};

export default handleWebViewFocus;
