import {
  WEB_SHARE_MESSAGE_TYPE,
  buildWebSharePolyfillScript,
  WEB_DOWNLOAD_MESSAGE_TYPE,
  buildWebDownloadInterceptorScript,
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

describe('buildWebDownloadInterceptorScript', () => {
  it('intercepts blob/data anchor downloads and posts them to native', () => {
    const script = buildWebDownloadInterceptorScript();

    expect(script).toContain(WEB_DOWNLOAD_MESSAGE_TYPE);
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toContain("href.indexOf('blob:')");
    expect(script).toContain("href.indexOf('data:')");
    expect(script).toContain('HTMLAnchorElement.prototype.click');
    expect(script).toContain('URL.createObjectURL');
    expect(script).toContain('blobRegistry');
    expect(script).toContain('FileReader');
    expect(script).toContain('readAsDataURL');
    expect(script).toContain("addEventListener('click'");
    expect(script).toContain('event.preventDefault');
  });

  it('guards against double installation of the click listener', () => {
    const script = buildWebDownloadInterceptorScript();

    expect(script).toContain('__mmWebDownloadClickInstalled');
    expect(script).toContain('__mmBlobRegistry');
  });

  it('disables the react-native-webview built-in blob interceptor', () => {
    const script = buildWebDownloadInterceptorScript();

    // Pre-setting this flag stops BlobFileDownloader.kt from assigning
    // window.downloadBlob and clobbering page globals with that name.
    expect(script).toContain('window.blobDownloadInjected = true');
  });
});
