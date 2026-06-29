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
});
