import { Hex } from '@metamask/utils';
import handleWebViewFocus from './webViewFocus';

interface WebViewRef {
  injectJavaScript: (script: string) => void;
  stopLoading: () => void;
  reload: () => void;
}

describe('handleWebViewFocus', () => {
  let webviewRef: React.RefObject<WebViewRef>;
  let stopLoading: jest.Mock;
  let reload: jest.Mock;

  beforeEach(() => {
    stopLoading = jest.fn();
    reload = jest.fn();
    webviewRef = {
      current: {
        injectJavaScript: jest.fn(),
        stopLoading,
        reload,
      },
    };
  });

  it('should reload the webview if chainId has changed', () => {
    handleWebViewFocus({
      webviewRef,
      isFocused: true,
      chainId: '0x1' as Hex,
      previousChainId: '0x2' as Hex,
    });

    expect(reload).toHaveBeenCalled();
    expect(stopLoading).not.toHaveBeenCalled();
  });

  it('should not reload the webview if chainId has not changed', () => {
    handleWebViewFocus({
      webviewRef,
      isFocused: true,
      chainId: '0x1' as Hex,
      previousChainId: '0x1' as Hex,
    });

    expect(reload).not.toHaveBeenCalled();
    expect(stopLoading).not.toHaveBeenCalled();
  });

  it('should do nothing if webviewRef.current is null', () => {
    handleWebViewFocus({
      webviewRef: { current: null },
      isFocused: true,
      chainId: '0x1' as Hex,
      previousChainId: '0x2' as Hex,
    });

    expect(stopLoading).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should stop loading if webview is not focused', () => {
    handleWebViewFocus({
      webviewRef,
      isFocused: false,
      chainId: '0x1' as Hex,
      previousChainId: '0x1' as Hex,
    });

    expect(stopLoading).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
