import handleWebViewFocus from './webViewFocus';

describe('handleWebViewFocus', () => {
  it('should stop loading when not focused', () => {
    const stopLoading = jest.fn();
    const reload = jest.fn();
    const webviewRef = { current: { stopLoading, reload } };

    handleWebViewFocus({ webviewRef, isFocused: false, chainId: '1' });

    expect(stopLoading).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should reload the webview if chainId has changed', () => {
    const stopLoading = jest.fn();
    const reload = jest.fn();
    const webviewRef = { current: { stopLoading, reload } };

    handleWebViewFocus({
      webviewRef,
      isFocused: true,
      chainId: '2',
      previousChainId: '1',
    });

    expect(reload).toHaveBeenCalled();
    expect(stopLoading).not.toHaveBeenCalled();
  });

  it('should not reload the webview if chainId has not changed', () => {
    const stopLoading = jest.fn();
    const reload = jest.fn();
    const webviewRef = { current: { stopLoading, reload } };

    handleWebViewFocus({
      webviewRef,
      isFocused: true,
      chainId: '1',
      previousChainId: '1',
    });

    expect(reload).not.toHaveBeenCalled();
    expect(stopLoading).not.toHaveBeenCalled();
  });

  it('should do nothing if webviewRef.current is null', () => {
    const stopLoading = jest.fn();
    const reload = jest.fn();
    const webviewRef = { current: null };

    handleWebViewFocus({
      webviewRef,
      isFocused: true,
      chainId: '1',
    });

    expect(stopLoading).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
