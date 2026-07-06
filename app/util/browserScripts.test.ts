import {
  WEB_SHARE_MESSAGE_TYPE,
  WEB_DOWNLOAD_MESSAGE_TYPE,
  buildWebSharePolyfillScript,
  buildBlobDownloadInterceptorScript,
} from './browserScripts';

describe('buildWebSharePolyfillScript', () => {
  it('includes share and canShare polyfills', () => {
    const script = buildWebSharePolyfillScript(true);

    expect(script).toContain('Navigator.prototype');
    expect(script).toContain("'share'");
    expect(script).toContain("'canShare'");
    expect(script).toContain(WEB_SHARE_MESSAGE_TYPE);
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toContain('FileReader');
    expect(script).toContain('readAsDataURL');
  });

  it('skips early return when forceInstall is true', () => {
    const forcedScript = buildWebSharePolyfillScript(true);
    const optionalScript = buildWebSharePolyfillScript(false);

    expect(forcedScript).not.toContain('typeof navigator.canShare');
    expect(optionalScript).toContain('typeof navigator.canShare');
  });
});

describe('buildBlobDownloadInterceptorScript', () => {
  it('intercepts blob/data anchor downloads and forwards them to native', () => {
    const script = buildBlobDownloadInterceptorScript();

    expect(script).toContain('HTMLAnchorElement.prototype.click');
    expect(script).toContain("href.indexOf('blob:')");
    expect(script).toContain("href.indexOf('data:')");
    expect(script).toContain('readAsDataURL');
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toContain(WEB_DOWNLOAD_MESSAGE_TYPE);
  });

  it('only acts on anchors with a download attribute', () => {
    const script = buildBlobDownloadInterceptorScript();

    expect(script).toContain("anchor.hasAttribute('download')");
  });
});
