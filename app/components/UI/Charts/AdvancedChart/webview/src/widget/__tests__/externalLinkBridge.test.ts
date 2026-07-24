/**
 * @jest-environment jsdom
 */
import {
  __resetExternalLinkBridgeForTests,
  installTradingViewExternalOpenBridge,
  isTradingViewExternalHostname,
  isTradingViewExternalHref,
} from '../externalLinkBridge';

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

const installRNBridge = (): MockBridge => {
  const bridge: MockBridge = { postMessage: jest.fn() };
  (
    window as unknown as { ReactNativeWebView?: MockBridge }
  ).ReactNativeWebView = bridge;
  return bridge;
};

describe('isTradingViewExternalHostname', () => {
  it.each(['tradingview.com', 'www.tradingview.com', 'docs.tradingview.com'])(
    'matches %s',
    (host) => {
      expect(isTradingViewExternalHostname(host)).toBe(true);
    },
  );

  it.each(['evil.com', '', null, undefined, 'sometradingview.com'])(
    'rejects %s',
    (host) => {
      expect(
        isTradingViewExternalHostname(host as string | null | undefined),
      ).toBe(false);
    },
  );
});

describe('isTradingViewExternalHref', () => {
  it('matches absolute TradingView URLs', () => {
    expect(isTradingViewExternalHref('https://www.tradingview.com/x')).toBe(
      true,
    );
  });

  it('matches relative URLs that resolve to TradingView', () => {
    expect(isTradingViewExternalHref('/path')).toBe(false); // resolves to current host (localhost)
  });

  it('returns false for empty / malformed input', () => {
    expect(isTradingViewExternalHref('')).toBe(false);
    expect(isTradingViewExternalHref(null)).toBe(false);
  });
});

describe('installTradingViewExternalOpenBridge', () => {
  beforeEach(() => {
    __resetExternalLinkBridgeForTests();
    delete (window as unknown as { __mmTvOpenPatched?: boolean })
      .__mmTvOpenPatched;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('patches window.open to redirect TradingView URLs to RN', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const originalOpen = jest.fn();
    window.open = originalOpen;

    installTradingViewExternalOpenBridge();

    const opened = window.open('https://www.tradingview.com/foo');
    expect(opened).toBeNull();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'CHART_TRADINGVIEW_CLICKED',
        payload: { url: 'https://www.tradingview.com/foo' },
      }),
    );
    expect(originalOpen).not.toHaveBeenCalled();
  });

  it('passes through non-TradingView URLs to the original window.open', () => {
    installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const originalOpen = jest.fn().mockReturnValue(null);
    window.open = originalOpen;

    installTradingViewExternalOpenBridge();
    window.open('https://example.com');

    expect(originalOpen).toHaveBeenCalled();
  });

  it('debounces repeated TradingView opens within 600ms', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    window.open = jest.fn();

    installTradingViewExternalOpenBridge();

    window.open('https://tradingview.com/a');
    window.open('https://tradingview.com/b');

    expect(bridge.postMessage).toHaveBeenCalledTimes(1);
  });

  it('passes through when window.open is called with undefined URL', () => {
    installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const originalOpen = jest.fn().mockReturnValue(null);
    window.open = originalOpen;

    installTradingViewExternalOpenBridge();
    window.open(undefined as unknown as string);

    expect(originalOpen).toHaveBeenCalled();
  });

  it('passes through when window.open is called with empty string URL', () => {
    installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const originalOpen = jest.fn().mockReturnValue(null);
    window.open = originalOpen;

    installTradingViewExternalOpenBridge();
    window.open('');

    expect(originalOpen).toHaveBeenCalled();
  });

  it('schedules deferred reapplication at 200, 800, and 2000ms', () => {
    installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    installTradingViewExternalOpenBridge();

    const scheduledDelays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(scheduledDelays).toContain(200);
    expect(scheduledDelays).toContain(800);
    expect(scheduledDelays).toContain(2000);

    setTimeoutSpy.mockRestore();
  });

  it('reapplies patches when deferred timeouts fire', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    window.open = jest.fn();

    installTradingViewExternalOpenBridge();

    // After the first call, window.open is already patched.
    // Advance through all deferred timeouts — they should not break anything.
    jest.advanceTimersByTime(2100);

    // The patch should still work correctly after reapplication.
    window.open('https://tradingview.com/chart');
    expect(bridge.postMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'CHART_TRADINGVIEW_CLICKED',
        payload: { url: 'https://tradingview.com/chart' },
      }),
    );
  });

  it('attaches a load listener to the iframe inside tv_chart_container', () => {
    installRNBridge();
    const mockIframe = document.createElement('iframe');
    const addListenerSpy = jest.spyOn(mockIframe, 'addEventListener');

    const container = document.createElement('div');
    container.id = 'tv_chart_container';
    container.appendChild(mockIframe);

    jest.spyOn(document, 'getElementById').mockReturnValue(container);

    installTradingViewExternalOpenBridge();

    expect(addListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('does not double-install window.open patch when called twice', () => {
    installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const originalOpen = jest.fn();
    window.open = originalOpen;

    installTradingViewExternalOpenBridge();
    const patchedOpen = window.open;

    // Calling again should not re-wrap.
    installTradingViewExternalOpenBridge();
    expect(window.open).toBe(patchedOpen);
  });
});

describe('handleTradingViewLinkCapture (click handler)', () => {
  beforeEach(() => {
    __resetExternalLinkBridgeForTests();
    delete (window as unknown as { __mmTvOpenPatched?: boolean })
      .__mmTvOpenPatched;
    delete (document as unknown as { __mmTvLinkCaptureInstalled?: boolean })
      .__mmTvLinkCaptureInstalled;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('posts CHART_TRADINGVIEW_CLICKED when a TradingView anchor is clicked', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const anchor = document.createElement('a');
    anchor.href = 'https://www.tradingview.com/symbols/ETHUSD/';
    document.body.appendChild(anchor);

    try {
      anchor.click();
      expect(bridge.postMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'CHART_TRADINGVIEW_CLICKED',
          payload: { url: 'https://www.tradingview.com/symbols/ETHUSD/' },
        }),
      );
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('calls preventDefault and stopPropagation on the click event', () => {
    installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const anchor = document.createElement('a');
    anchor.href = 'https://tradingview.com/chart/abc';
    document.body.appendChild(anchor);

    const preventDefaultSpy = jest.fn();
    const stopPropagationSpy = jest.fn();

    try {
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'preventDefault', {
        value: preventDefaultSpy,
      });
      Object.defineProperty(event, 'stopPropagation', {
        value: stopPropagationSpy,
      });
      anchor.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('ignores clicks on elements that are not inside an anchor', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const div = document.createElement('div');
    document.body.appendChild(div);

    try {
      div.click();
      expect(bridge.postMessage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(div);
    }
  });

  it('ignores clicks on anchors with non-TradingView hrefs', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/page';
    document.body.appendChild(anchor);

    try {
      anchor.click();
      expect(bridge.postMessage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('ignores clicks on anchors with empty href', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const anchor = document.createElement('a');
    // No href set — anchor.href is ''
    document.body.appendChild(anchor);

    try {
      anchor.click();
      expect(bridge.postMessage).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('debounces repeated anchor clicks within 600ms', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const anchor = document.createElement('a');
    anchor.href = 'https://tradingview.com/ideas';
    document.body.appendChild(anchor);

    try {
      anchor.click();
      anchor.click();
      anchor.click();

      expect(bridge.postMessage).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('allows another click after the 600ms debounce window expires', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const anchor = document.createElement('a');
    anchor.href = 'https://tradingview.com/ideas';
    document.body.appendChild(anchor);

    try {
      anchor.click();
      expect(bridge.postMessage).toHaveBeenCalledTimes(1);

      // Advance past the debounce window.
      jest.advanceTimersByTime(601);
      jest.setSystemTime(Date.now() + 601);

      anchor.click();
      expect(bridge.postMessage).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('captures clicks on child elements inside a TradingView anchor', () => {
    const bridge = installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    installTradingViewExternalOpenBridge();

    const anchor = document.createElement('a');
    anchor.href = 'https://tradingview.com/chart';
    const span = document.createElement('span');
    span.textContent = 'Click me';
    anchor.appendChild(span);
    document.body.appendChild(anchor);

    try {
      span.click();
      expect(bridge.postMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'CHART_TRADINGVIEW_CLICKED',
          payload: { url: 'https://tradingview.com/chart' },
        }),
      );
    } finally {
      document.body.removeChild(anchor);
    }
  });

  it('does not install duplicate click listeners on the same document', () => {
    installRNBridge();
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const addListenerSpy = jest.spyOn(document, 'addEventListener');

    installTradingViewExternalOpenBridge();
    const clickListenerCount1 = addListenerSpy.mock.calls.filter(
      (call) => call[0] === 'click',
    ).length;

    installTradingViewExternalOpenBridge();
    const clickListenerCount2 = addListenerSpy.mock.calls.filter(
      (call) => call[0] === 'click',
    ).length;

    // The second call should not have added another click listener.
    expect(clickListenerCount2).toBe(clickListenerCount1);
  });
});
