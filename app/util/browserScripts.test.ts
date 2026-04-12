import { IFRAME_DETECTION_SCRIPT } from './browserScripts';

describe('IFRAME_DETECTION_SCRIPT', () => {
  it('is a valid JavaScript string that can be parsed', () => {
    expect(() => {
      // eslint-disable-next-line no-new-func
      new Function(IFRAME_DETECTION_SCRIPT);
    }).not.toThrow();
  });

  it('references IFRAME_DETECTED message type', () => {
    expect(IFRAME_DETECTION_SCRIPT).toContain("'IFRAME_DETECTED'");
  });

  it('checks window.self !== window.top for iframe detection', () => {
    expect(IFRAME_DETECTION_SCRIPT).toContain('window.self !== window.top');
  });

  it('collects iframe src URLs', () => {
    expect(IFRAME_DETECTION_SCRIPT).toContain(
      "document.getElementsByTagName('iframe')",
    );
    expect(IFRAME_DETECTION_SCRIPT).toContain('frames[i].src');
  });

  it('sends data via ReactNativeWebView.postMessage', () => {
    expect(IFRAME_DETECTION_SCRIPT).toContain('ReactNativeWebView.postMessage');
  });

  it('includes isIframe in the posted message', () => {
    expect(IFRAME_DETECTION_SCRIPT).toContain('isIframe: isIframe');
  });

  it('includes iframeUrls in the posted message', () => {
    expect(IFRAME_DETECTION_SCRIPT).toContain('iframeUrls: iframeUrls');
  });
});
