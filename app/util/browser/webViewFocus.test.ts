import handleWebViewFocus from './webViewFocus';

describe('handleWebViewFocus', () => {
  it('should inject JavaScript to set isTabActive to true when focused', () => {
    const injectJavaScript = jest.fn();
    const stopLoading = jest.fn();
    const webviewRef = { current: { injectJavaScript, stopLoading } };

    handleWebViewFocus({ webviewRef, isFocused: true });

    const injectedScript = injectJavaScript.mock.calls[0][0].trim();
    expect(injectedScript).toBe('window.isTabActive = true;');
    expect(stopLoading).not.toHaveBeenCalled();
  });

  it('should inject JavaScript to set isTabActive to false and stop loading when not focused', () => {
    const injectJavaScript = jest.fn();
    const stopLoading = jest.fn();
    const webviewRef = { current: { injectJavaScript, stopLoading } };

    handleWebViewFocus({ webviewRef, isFocused: false });

    const injectedScript = injectJavaScript.mock.calls[0][0].trim();
    expect(injectedScript).toBe('window.isTabActive = false;');
    expect(stopLoading).toHaveBeenCalled();
  });

  it('should do nothing if webviewRef.current is null', () => {
    const injectJavaScript = jest.fn();
    const stopLoading = jest.fn();
    const webviewRef = { current: null };

    handleWebViewFocus({ webviewRef, isFocused: true });

    expect(injectJavaScript).not.toHaveBeenCalled();
    expect(stopLoading).not.toHaveBeenCalled();
  });
});
