interface WebViewFocus {
  webviewRef: React.RefObject<{
    injectJavaScript: (script: string) => void;
    stopLoading: () => void;
  }>;
  isFocused: boolean;
}

const handleWebViewFocus = ({ webviewRef, isFocused }: WebViewFocus) => {
  if (webviewRef.current) {
    if (isFocused) {
      webviewRef.current.injectJavaScript(`
        window.isTabActive = true;
      `);
    } else {
      webviewRef.current.injectJavaScript(`
        window.isTabActive = false;
      `);
      webviewRef.current.stopLoading(); // Stop loading the page
    }
  }
};

export default handleWebViewFocus;
