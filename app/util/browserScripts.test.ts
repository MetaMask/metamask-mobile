// The chart shim is a page script. vm runs it in the test without shipping a Node builtin in the app.
// eslint-disable-next-line import-x/no-nodejs-modules
import { runInNewContext } from 'vm';
import {
  WEB_SHARE_MESSAGE_TYPE,
  buildWebSharePolyfillScript,
  buildWebShareResultScript,
  WEB_CLIPBOARD_IMAGE_UNSUPPORTED_MESSAGE,
  buildWebClipboardPolyfillScript,
  WEB_DOWNLOAD_MESSAGE_TYPE,
  buildWebDownloadInterceptorScript,
  buildBlobIframeSrcdocScript,
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

describe('buildBlobIframeSrcdocScript', () => {
  const flush = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };

  const install = (sandbox: Record<string, unknown>) => {
    sandbox.window = sandbox;
    runInNewContext(buildBlobIframeSrcdocScript(), sandbox);
  };

  it('renders a blob iframe document through srcdoc', async () => {
    const fetched: string[] = [];
    const frameProto: object = {};
    Object.defineProperty(frameProto, 'src', {
      configurable: true,
      get() {
        return '';
      },
      set() {
        return undefined;
      },
    });
    const iframeProto = Object.create(frameProto);
    const iframe = Object.create(iframeProto);
    const sandbox: Record<string, unknown> = {
      HTMLIFrameElement: function HTMLIFrameElement() {
        return undefined;
      },
      Map,
      setTimeout,
      location: { href: 'https://www.tradingview.com/widget' },
      document: {
        readyState: 'complete',
        documentElement: {},
        addEventListener() {
          return undefined;
        },
      },
      MutationObserver: class {
        observe() {
          return undefined;
        }
      },
      fetch: (url: string) => {
        fetched.push(url);
        return Promise.resolve({
          text: () =>
            Promise.resolve('<html><head></head><body>chart</body></html>'),
        });
      },
      URL: {
        createObjectURL: () => 'blob:unused',
        revokeObjectURL: () => undefined,
      },
    };
    (sandbox.HTMLIFrameElement as { prototype: object }).prototype =
      iframeProto;

    install(sandbox);
    iframe.src = 'blob:https://www.tradingview.com/chart-frame';
    await flush();

    expect(fetched).toEqual(['blob:https://www.tradingview.com/chart-frame']);
    expect(iframe.srcdoc).toContain(
      '<base href="https://www.tradingview.com/widget">',
    );
    expect(iframe.srcdoc).toContain('chart');
  });

  it('reads a blob created on a parent src setter without fetch', async () => {
    const html = '<html><head></head><body>chart</body></html>';
    const frameProto: object = {};
    Object.defineProperty(frameProto, 'src', {
      configurable: true,
      get() {
        return '';
      },
      set() {
        return undefined;
      },
    });
    const iframeProto = Object.create(frameProto);
    iframeProto.setAttribute = function setAttribute(
      this: { src: string },
      name: string,
      value: string,
    ) {
      if (name === 'src') {
        this.src = value;
      }
    };
    const sandbox: Record<string, unknown> = {
      HTMLIFrameElement: function HTMLIFrameElement() {
        return undefined;
      },
      Map,
      setTimeout,
      location: { href: 'https://www.tradingview.com/widget#chart' },
      document: {
        readyState: 'complete',
        documentElement: {},
        addEventListener() {
          return undefined;
        },
      },
      MutationObserver: class {
        observe() {
          return undefined;
        }
      },
      fetch: () => Promise.reject(new Error('fetch should not run')),
      URL: {
        createObjectURL: () => 'blob:https://www.tradingview.com/created',
        revokeObjectURL: () => undefined,
      },
    };
    (sandbox.HTMLIFrameElement as { prototype: object }).prototype =
      iframeProto;
    sandbox.window = sandbox;

    const iframe = runInNewContext(
      `${buildBlobIframeSrcdocScript()}
        var blob = { text: function () { return Promise.resolve(${JSON.stringify(html)}); } };
        var iframe = Object.create(HTMLIFrameElement.prototype);
        iframe.src = URL.createObjectURL(blob);
        iframe;
      `,
      sandbox,
    );
    await flush();

    expect(iframe.srcdoc).toContain(
      '<base href="https://www.tradingview.com/widget">',
    );
    expect(iframe.srcdoc).toContain('chart');
  });

  it('leaves https iframe sources on the native setter', () => {
    const assigned: string[] = [];
    const frameProto: object = {};
    Object.defineProperty(frameProto, 'src', {
      configurable: true,
      set(value: string) {
        assigned.push(value);
      },
    });
    const iframeProto = Object.create(frameProto);
    const sandbox: Record<string, unknown> = {
      HTMLIFrameElement: function HTMLIFrameElement() {
        return undefined;
      },
      Map,
      setTimeout,
      location: { href: 'https://example.com' },
      document: {
        readyState: 'complete',
        documentElement: {},
        addEventListener() {
          return undefined;
        },
      },
      MutationObserver: class {
        observe() {
          return undefined;
        }
      },
      URL: {
        createObjectURL: () => 'blob:unused',
        revokeObjectURL: () => undefined,
      },
    };
    (sandbox.HTMLIFrameElement as { prototype: object }).prototype =
      iframeProto;
    sandbox.window = sandbox;

    const iframe = runInNewContext(
      `${buildBlobIframeSrcdocScript()}
        var iframe = Object.create(HTMLIFrameElement.prototype);
        iframe.src = 'https://example.com/embed';
        iframe;
      `,
      sandbox,
    );

    expect(assigned).toEqual(['https://example.com/embed']);
    expect(iframe.srcdoc).toBeUndefined();
  });

  it('leaves pdf blob iframes on the native setter', () => {
    const assigned: string[] = [];
    const frameProto: object = {};
    Object.defineProperty(frameProto, 'src', {
      configurable: true,
      set(value: string) {
        assigned.push(value);
      },
    });
    const iframeProto = Object.create(frameProto);
    const sandbox: Record<string, unknown> = {
      HTMLIFrameElement: function HTMLIFrameElement() {
        return undefined;
      },
      Map,
      setTimeout,
      location: { href: 'https://example.com' },
      document: {
        readyState: 'complete',
        documentElement: {},
        addEventListener() {
          return undefined;
        },
      },
      MutationObserver: class {
        observe() {
          return undefined;
        }
      },
      URL: {
        createObjectURL: () => 'blob:https://example.com/file.pdf',
        revokeObjectURL: () => undefined,
      },
    };
    (sandbox.HTMLIFrameElement as { prototype: object }).prototype =
      iframeProto;
    sandbox.window = sandbox;

    const iframe = runInNewContext(
      `${buildBlobIframeSrcdocScript()}
        var blob = { type: 'application/pdf', text: function () { return Promise.resolve('%PDF-1.7'); } };
        var iframe = Object.create(HTMLIFrameElement.prototype);
        iframe.src = URL.createObjectURL(blob);
        iframe;
      `,
      sandbox,
    );

    expect(assigned).toEqual(['blob:https://example.com/file.pdf']);
    expect(iframe.srcdoc).toBeUndefined();
  });

  // The re-entry loop lives in the injected page script. Component-view and
  // integration runners never install that MutationObserver, so this stays a
  // unit test of the script itself.
  describe('binary blob iframes', () => {
    const drain = async () => {
      for (let step = 0; step < 12; step++) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    };

    const installBinaryFrame = (
      createObjectURL: (blob: { type?: string }) => string,
    ) => {
      const assigned: string[] = [];
      const observers: ((
        records: { type: string; target: object }[],
      ) => void)[] = [];
      const notifySrcObservers = (node: object): void => {
        queueMicrotask(() => {
          observers.forEach((notify) =>
            notify([{ type: 'attributes', target: node }]),
          );
        });
      };
      const frameProto: object = {};
      Object.defineProperty(frameProto, 'src', {
        configurable: true,
        get(this: { _src?: string }) {
          return this._src || '';
        },
        set(this: { _src?: string }, value: string) {
          assigned.push(value);
          this._src = value;
          // A regression that re-enters on every src write used to grow this
          // queue until the worker ran out of memory. Stop notifying past a
          // few writes so the assertion can fail instead.
          if (assigned.length <= 4) {
            notifySrcObservers(this);
          }
        },
      });
      const iframeProto = Object.create(frameProto);
      const sandbox: Record<string, unknown> = {
        HTMLIFrameElement: function HTMLIFrameElement() {
          return undefined;
        },
        Map,
        setTimeout,
        Uint8Array,
        location: { href: 'https://example.com/page' },
        document: {
          readyState: 'complete',
          documentElement: {},
          addEventListener() {
            return undefined;
          },
        },
        MutationObserver: class {
          constructor(
            callback: (records: { type: string; target: object }[]) => void,
          ) {
            observers.push(callback);
          }

          observe() {
            return undefined;
          }
        },
        fetch: () => Promise.reject(new Error('fetch should not run')),
        URL: {
          createObjectURL,
          revokeObjectURL: () => undefined,
        },
      };
      (sandbox.HTMLIFrameElement as { prototype: object }).prototype =
        iframeProto;

      return { assigned, sandbox };
    };

    const assignBlobFrame = (
      sandbox: Record<string, unknown>,
      blobSource: string,
    ) => {
      sandbox.window = sandbox;
      return runInNewContext(
        `${buildBlobIframeSrcdocScript()}
          ${blobSource}
          var iframe = Object.create(HTMLIFrameElement.prototype);
          iframe.tagName = 'IFRAME';
          iframe.getAttribute = function (name) {
            return String(name).toLowerCase() === 'src' ? this.src : null;
          };
          iframe.src = URL.createObjectURL(blob);
          iframe;
        `,
        sandbox,
      );
    };

    it('keeps a pdf blob on the native src when the src observer fires', async () => {
      const reads: string[] = [];
      const { assigned, sandbox } = installBinaryFrame(
        () => 'blob:https://example.com/file.pdf',
      );
      sandbox.reads = reads;

      const iframe = assignBlobFrame(
        sandbox,
        `var blob = {
          type: 'application/pdf',
          text: function () {
            reads.push('text');
            return Promise.resolve('%PDF-1.7');
          }
        };`,
      );
      await drain();

      expect(assigned).toEqual(['blob:https://example.com/file.pdf']);
      expect(iframe.srcdoc).toBeUndefined();
      expect(reads).toEqual([]);
    });

    it('keeps a gif blob without a mime type on the native src', async () => {
      const { assigned, sandbox } = installBinaryFrame(
        () => 'blob:https://example.com/anim.gif',
      );

      const iframe = assignBlobFrame(
        sandbox,
        `var blob = {
          type: '',
          text: function () {
            return Promise.resolve('GIF89a');
          }
        };`,
      );
      await drain();

      expect(assigned).toEqual(['blob:https://example.com/anim.gif']);
      expect(iframe.srcdoc).toBeUndefined();
    });

    it('keeps an image/png blob on the native src when its text reads as markup', async () => {
      const { assigned, sandbox } = installBinaryFrame(
        () => 'blob:https://example.com/image.png',
      );

      const iframe = assignBlobFrame(
        sandbox,
        `var blob = {
          type: 'image/png',
          text: function () {
            return Promise.resolve('<html><body>png bytes</body></html>');
          }
        };`,
      );
      await drain();

      expect(assigned).toEqual(['blob:https://example.com/image.png']);
      expect(iframe.srcdoc).toBeUndefined();
    });

    it('keeps a png blob without a mime type on the native src', async () => {
      const { assigned, sandbox } = installBinaryFrame(
        () => 'blob:https://example.com/raw.png',
      );

      const iframe = assignBlobFrame(
        sandbox,
        `var bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        var blob = {
          type: '',
          slice: function () { return this; },
          arrayBuffer: function () { return Promise.resolve(bytes.buffer); },
          text: function () {
            return Promise.resolve('<html><body>png bytes</body></html>');
          }
        };`,
      );
      await drain();

      expect(assigned).toEqual(['blob:https://example.com/raw.png']);
      expect(iframe.srcdoc).toBeUndefined();
    });

    it('keeps a jpeg blob without a mime type on the native src', async () => {
      const { assigned, sandbox } = installBinaryFrame(
        () => 'blob:https://example.com/image.jpg',
      );

      const iframe = assignBlobFrame(
        sandbox,
        `var bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
        var blob = {
          type: '',
          slice: function () { return this; },
          arrayBuffer: function () { return Promise.resolve(bytes.buffer); },
          text: function () {
            return Promise.resolve('<html><body>not a chart</body></html>');
          }
        };`,
      );
      await drain();

      expect(assigned).toEqual(['blob:https://example.com/image.jpg']);
      expect(iframe.srcdoc).toBeUndefined();
    });

    it('keeps an audio blob on the native src', async () => {
      const { assigned, sandbox } = installBinaryFrame(
        () => 'blob:https://example.com/sound.mp3',
      );

      const iframe = assignBlobFrame(
        sandbox,
        `var blob = {
          type: 'audio/mpeg',
          text: function () { return Promise.resolve('ID3'); }
        };`,
      );
      await drain();

      expect(assigned).toEqual(['blob:https://example.com/sound.mp3']);
      expect(iframe.srcdoc).toBeUndefined();
    });

    it('keeps a video blob without a mime type on the native src', async () => {
      const { assigned, sandbox } = installBinaryFrame(
        () => 'blob:https://example.com/clip.mp4',
      );

      const iframe = assignBlobFrame(
        sandbox,
        `var bytes = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]);
        var blob = {
          type: '',
          slice: function () { return this; },
          arrayBuffer: function () { return Promise.resolve(bytes.buffer); },
          text: function () { return Promise.resolve('ftyp'); }
        };`,
      );
      await drain();

      expect(assigned).toEqual(['blob:https://example.com/clip.mp4']);
      expect(iframe.srcdoc).toBeUndefined();
    });

    it('keeps the newer chart when an older blob read finishes later', async () => {
      const resolvers: ((html: string) => void)[] = [];
      let nextId = 0;
      const { sandbox } = installBinaryFrame(
        () => `blob:https://example.com/chart-${++nextId}`,
      );
      sandbox.resolvers = resolvers;
      sandbox.window = sandbox;

      const iframe = runInNewContext(
        `${buildBlobIframeSrcdocScript()}
          function chartBlob() {
            return {
              text: function () {
                return new Promise(function (resolve) {
                  resolvers.push(resolve);
                });
              }
            };
          }
          var iframe = Object.create(HTMLIFrameElement.prototype);
          iframe.tagName = 'IFRAME';
          iframe.getAttribute = function (name) {
            return String(name).toLowerCase() === 'src' ? this.src : null;
          };
          iframe.src = URL.createObjectURL(chartBlob());
          iframe._loadNext = function () {
            this.src = URL.createObjectURL(chartBlob());
          };
          iframe;
        `,
        sandbox,
      );
      await drain();

      iframe._loadNext();
      await drain();
      const resolveFirst = resolvers[0];
      const resolveSecond = resolvers[1];

      resolveSecond('<html><head></head><body>second-chart</body></html>');
      await drain();
      resolveFirst('<html><head></head><body>first-chart</body></html>');
      await drain();

      expect(iframe.srcdoc).toContain('second-chart');
      expect(iframe.srcdoc).not.toContain('first-chart');
    });
  });
});
