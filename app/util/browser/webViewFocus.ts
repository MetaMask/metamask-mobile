import React from 'react';

interface WebViewFocus {
  webviewRef: React.RefObject<{
    injectJavaScript: (script: string) => void;
    stopLoading: () => void;
    reload: () => void;
  }>;
  isFocused: boolean;
  chainId: string;
  previousChainId?: string;
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
    }

    if (previousChainId && previousChainId !== chainId) {
      webviewRef.current.reload();
    }
  }
};

export default handleWebViewFocus;
