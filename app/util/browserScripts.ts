const getWindowInformation = `
  const shortcutIcon = window.document.querySelector('head > link[rel="shortcut icon"]');
  const icon = shortcutIcon || Array.from(window.document.querySelectorAll('head > link[rel="icon"]')).find((icon) => Boolean(icon.href));

  const siteName = document.querySelector('head > meta[property="og:site_name"]');
  const title = siteName || document.querySelector('head > meta[name="title"]');
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
    {
      type: 'GET_TITLE_FOR_BOOKMARK',
      payload: {
        title: title ? title.content : document.title,
        url: location.href,
        icon: icon && icon.href
      }
    }
  ))
`;

export const DOCUMENT_URL_FOR_URL_BAR = 'DOCUMENT_URL_FOR_URL_BAR';

/**
 * Posts the current document URL and title back to React Native. Used to sync
 * the URL bar after back/forward navigation when the WebView navigation event
 * may not match `window.location`.
 */
export const buildDocumentUrlForUrlBarScript = (requestId: string): string =>
  `(function () {
    if (!window.ReactNativeWebView) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: ${JSON.stringify(DOCUMENT_URL_FOR_URL_BAR)},
      payload: {
        requestId: ${JSON.stringify(requestId)},
        url: window.location.href,
        title: document.title,
      },
    }));
  })(); true;`;

export const SPA_urlChangeListener = `(function () {
  var __mmHistory = window.history;
  var __mmPushState = __mmHistory.pushState;
  var __mmReplaceState = __mmHistory.replaceState;
  function __mm__updateUrl(){
    const siteName = document.querySelector('head > meta[property="og:site_name"]');
    const title = siteName || document.querySelector('head > meta[name="title"]') || document.title;
    const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
      {
        type: 'NAV_CHANGE',
        payload: {
          url: location.href,
          title: title,
        }
      }
    ));

    setTimeout(() => {
      const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
      {
        type: 'GET_HEIGHT',
        payload: {
          height: height
        }
      }))
    }, 500);
  }

  __mmHistory.pushState = function(state) {
    setTimeout(function () {
      __mm__updateUrl();
    }, 100);
    return __mmPushState.apply(history, arguments);
  };

  __mmHistory.replaceState = function(state) {
    setTimeout(function () {
      __mm__updateUrl();
    }, 100);
    return __mmReplaceState.apply(history, arguments);
  };

  window.onpopstate = function(event) {
    __mm__updateUrl();
  };
  })();
`;

export const JS_WINDOW_INFORMATION = `
  (function () {
    ${getWindowInformation}
  })();
`;

export const JS_DESELECT_TEXT = `if (window.getSelection) {window.getSelection().removeAllRanges();}
else if (document.selection) {document.selection.empty();}`;

export const SCROLL_TRACKER_SCRIPT = `
  (function() {
    let lastScrollY = -1; // Start at -1 to ensure first position is always sent
    let rafPending = false;

    const sendScrollPosition = () => {
      const currentScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
      if (currentScrollY !== lastScrollY) {
        lastScrollY = currentScrollY;
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SCROLL_POSITION',
          payload: { scrollY: currentScrollY }
        }));
      }
    };

    // Debounced scroll handler using requestAnimationFrame for better Android performance
    const onScroll = () => {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          sendScrollPosition();
          rafPending = false;
        });
      }
    };

    // Listen to multiple events for better reliability on Android
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('touchend', sendScrollPosition, { passive: true });

    // Send initial position after DOM is ready
    if (document.readyState === 'complete') {
      sendScrollPosition();
    } else {
      window.addEventListener('load', sendScrollPosition);
    }

    // Also send on page visibility change (tab switch back)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        sendScrollPosition();
      }
    });
  })();
`;

export const JS_POST_MESSAGE_TO_PROVIDER = (
  message: object,
  origin: string,
) => `(function () {
  try {
    // Only send message if origins match
    if (window.location.origin === ${JSON.stringify(origin)}) {
      window.postMessage(${JSON.stringify(message)}, ${JSON.stringify(origin)});
    }
  } catch (e) {
    // Nothing to do here
  }
})();`;

export const WEB_SHARE_MESSAGE_TYPE = 'WEB_SHARE';

const WEB_SHARE_READ_FILE_FN = `function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve({
          name: file.name || 'share',
          type: file.type || 'application/octet-stream',
          data: reader.result,
        });
      };
      reader.onerror = function () {
        reject(reader.error || new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }`;

const WEB_SHARE_CAN_SHARE_FN = `function canShareData(data) {
    if (data == null || typeof data !== 'object') {
      return false;
    }
    if (data.files && data.files.length > 0) {
      return true;
    }
    return !!(data.url || data.text || data.title);
  }`;

const WEB_SHARE_SHARE_FN = `function shareData(data) {
    if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) {
      return Promise.reject(new Error('Share failed'));
    }
    if (!canShareData(data)) {
      return Promise.reject(new TypeError('Invalid share data'));
    }

    var files = data.files ? Array.prototype.slice.call(data.files) : [];
    var readFiles = files.length === 0
      ? Promise.resolve([])
      : Promise.all(files.map(readFileAsBase64));

    return readFiles.then(function (encodedFiles) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: ${JSON.stringify(WEB_SHARE_MESSAGE_TYPE)},
        payload: {
          url: data.url,
          text: data.text,
          title: data.title,
          files: encodedFiles,
        },
      }));
    });
  }`;

/**
 * Builds a script that polyfills navigator.share and navigator.canShare for
 * WebViews that lack Web Share API support (Android).
 *
 * @param forceInstall - When true, always installs the polyfill (Android). When false, skips if a native share implementation already exists (iOS).
 */
export const buildWebSharePolyfillScript = (forceInstall = false): string =>
  `(function () {
  ${WEB_SHARE_READ_FILE_FN}
  ${WEB_SHARE_CAN_SHARE_FN}
  ${WEB_SHARE_SHARE_FN}

  ${
    forceInstall
      ? ''
      : `if (navigator.share != null && typeof navigator.share === 'function' &&
      navigator.canShare != null && typeof navigator.canShare === 'function') {
    return;
  }`
  }

  try {
    Object.defineProperty(Navigator.prototype, 'share', {
      value: shareData,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    Object.defineProperty(Navigator.prototype, 'canShare', {
      value: canShareData,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    navigator.share = shareData;
    navigator.canShare = canShareData;
  }
})();
true;`;

/**
 * Polyfill script for Android WebView. Always overrides share/canShare.
 */
export const WEB_SHARE_API_POLYFILL_SCRIPT = buildWebSharePolyfillScript(true);

export const WEB_DOWNLOAD_MESSAGE_TYPE = 'WEB_DOWNLOAD';

const WEB_DOWNLOAD_READ_FN = `function readAsBase64(url) {
    return fetch(url)
      .then(function (response) { return response.blob(); })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve({ data: reader.result, type: blob.type });
          };
          reader.onerror = function () {
            reject(reader.error || new Error('Failed to read blob'));
          };
          reader.readAsDataURL(blob);
        });
      });
  }`;

const WEB_DOWNLOAD_FORWARD_FN = `function forwardDownload(url, name) {
    readAsBase64(url)
      .then(function (result) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: ${JSON.stringify(WEB_DOWNLOAD_MESSAGE_TYPE)},
          payload: {
            name: name || 'download',
            type: result.type || 'application/octet-stream',
            data: result.data,
          },
        }));
      })
      .catch(function () {});
  }`;

const WEB_DOWNLOAD_IS_INTERCEPTABLE_FN = `function isInterceptable(anchor) {
    if (!anchor || anchor.tagName !== 'A' || !anchor.hasAttribute('download')) {
      return false;
    }
    var href = anchor.getAttribute('href') || '';
    return href.indexOf('blob:') === 0 || href.indexOf('data:') === 0;
  }`;

/**
 * Builds a script that intercepts anchor-triggered `blob:`/`data:` downloads
 * and forwards their bytes to native. Android WebView cannot download in-memory
 * blob URLs via the native download manager (the URL is only resolvable inside
 * the renderer), so the page must read the payload as base64 and post it back.
 */
export const buildBlobDownloadInterceptorScript = (): string =>
  `(function () {
  if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) {
    return;
  }

  ${WEB_DOWNLOAD_READ_FN}
  ${WEB_DOWNLOAD_FORWARD_FN}
  ${WEB_DOWNLOAD_IS_INTERCEPTABLE_FN}

  try {
    var originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (isInterceptable(this)) {
        forwardDownload(this.href, this.getAttribute('download'));
        return;
      }
      return originalClick.apply(this, arguments);
    };
  } catch (e) {
    // Ignore: fall back to the capture-phase listener below.
  }

  document.addEventListener('click', function (event) {
    var node = event.target;
    while (node && node.tagName !== 'A') {
      node = node.parentElement;
    }
    if (isInterceptable(node)) {
      event.preventDefault();
      event.stopPropagation();
      forwardDownload(node.href, node.getAttribute('download'));
    }
  }, true);
})();
true;`;

/**
 * Blob/data download interceptor for Android WebView.
 */
export const WEB_DOWNLOAD_INTERCEPTOR_SCRIPT =
  buildBlobDownloadInterceptorScript();

export const JS_IFRAME_POST_MESSAGE_TO_PROVIDER = (
  _message: object,
  _origin: string,
) => `(function () {})()`;
/** Disable sending messages to iframes for now
 *
`(function () {
  const iframes = document.getElementsByTagName('iframe');
  for (let frame of iframes){

      try {
        frame.contentWindow.postMessage(${JSON.stringify(_message)}, '${_origin}');
      } catch (e) {
        //Nothing to do
      }

  }
})()`;
 */
