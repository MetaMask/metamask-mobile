import {
  WEB_SHARE_MESSAGE_TYPE,
  buildWebSharePolyfillScript,
  buildWebShareResultScript,
  WEB_CLIPBOARD_IMAGE_UNSUPPORTED_MESSAGE,
  buildWebClipboardPolyfillScript,
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

  it('defers resolution until the native result instead of resolving on postMessage', () => {
    const script = buildWebSharePolyfillScript(true);

    // The promise must be created around postMessage and stored in the pending
    // registry, not resolved immediately after posting.
    expect(script).toContain('__mmWebSharePending');
    expect(script).toContain('__mmResolveWebShare');
    expect(script).toContain('resolveWebShare');
    expect(script).toContain(
      'pending[id] = { resolve: resolve, reject: reject }',
    );
    expect(script).toContain('payload:');
    expect(script).toContain('id: id');
  });

  it('rejects with an AbortError DOMException on cancel/failure', () => {
    const script = buildWebSharePolyfillScript(true);

    expect(script).toContain('AbortError');
    expect(script).toContain('DOMException');
    expect(script).toContain("status === 'cancelled'");
  });
});

describe('buildWebShareResultScript', () => {
  it('calls the page-side resolver with the request id and status', () => {
    const script = buildWebShareResultScript('mm-share-1', 'success');

    expect(script).toContain('window.__mmResolveWebShare');
    expect(script).toContain('"mm-share-1"');
    expect(script).toContain('"success"');
  });

  it('forwards the cancellation status and message', () => {
    const script = buildWebShareResultScript(
      'mm-share-2',
      'cancelled',
      'user cancelled',
    );

    expect(script).toContain('"mm-share-2"');
    expect(script).toContain('"cancelled"');
    expect(script).toContain('"user cancelled"');
  });

  it('defaults the message to an empty string when omitted', () => {
    const script = buildWebShareResultScript('mm-share-3', 'error');

    expect(script).toContain('"error"');
    expect(script).toContain('""');
  });
});

describe('buildWebClipboardPolyfillScript', () => {
  it('rejects image clipboard writes on Android with NotAllowedError', () => {
    const script = buildWebClipboardPolyfillScript(true);

    expect(script).toContain('navigator.clipboard.write');
    expect(script).toContain('itemsContainImage');
    expect(script).toContain("type.indexOf('image/')");
    expect(script).toContain('NotAllowedError');
    expect(script).toContain(WEB_CLIPBOARD_IMAGE_UNSUPPORTED_MESSAGE);
    expect(script).toContain('__mmNativeClipboardWrite');
  });

  it('passes non-image writes through to the native implementation', () => {
    const script = buildWebClipboardPolyfillScript(true);

    expect(script).toContain('__mmNativeClipboardWrite(items)');
    expect(script).toContain('itemsContainImage(items)');
  });

  it('returns a no-op script when forceInstall is false', () => {
    expect(buildWebClipboardPolyfillScript(false)).toBe('true;');
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

  it('only intercepts anchors with an explicit download attribute', () => {
    const script = buildWebDownloadInterceptorScript();

    expect(script).toContain('hasDownloadIntent');
    expect(script).toContain("hasAttribute('download')");
  });

  it('bounds the blob registry to avoid unbounded memory retention', () => {
    const script = buildWebDownloadInterceptorScript();

    expect(script).toContain('BLOB_REGISTRY_LIMIT');
    expect(script).toContain('blobRegistry.size >= BLOB_REGISTRY_LIMIT');
  });

  it('disables the react-native-webview built-in blob interceptor', () => {
    const script = buildWebDownloadInterceptorScript();

    // Pre-setting this flag stops BlobFileDownloader.kt from assigning
    // window.downloadBlob and clobbering page globals with that name.
    expect(script).toContain('window.blobDownloadInjected = true');
  });
});
