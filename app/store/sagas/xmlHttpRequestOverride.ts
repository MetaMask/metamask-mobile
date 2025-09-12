import AppConstants from '../../../app/core/AppConstants';

if (process.env.JEST_WORKER_ID !== undefined) {
  // monkeypatch for Jest
  // TODO: mock properly in test setup; ideally without xhr2
  // see https://github.com/MetaMask/metamask-mobile/issues/10390
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const { XMLHttpRequest: _XMLHttpRequest } = require('xhr2');
  class FakeXMLHttpRequest extends _XMLHttpRequest {
    url?: string;
    status?: number;
    responseText?: string;
    open(_method: string, url: string) {
      this.url = url;
    }

    send() {
      this.status = 200;
      this.responseText = '';
      this.onload();
    }
  }

  // This should probably be done completely differently - the types are not the issue here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.XMLHttpRequest = FakeXMLHttpRequest as any;
}

const originalSend = global.XMLHttpRequest.prototype.send;
const originalOpen = global.XMLHttpRequest.prototype.open;

export function overrideXMLHttpRequest() {
  // Store the URL of the current request - only valid under assumption of no new requests being initiated between `open` and `send` of one
  let currentUrl = '';

  // TODO: This should operate on an allowlist rather than fuzzy-blocklist approach
  // Only known "good" URLs should be explicitly allowed, as opposed to only "bad" ones disallowed
  // see https://github.com/MetaMask/metamask-mobile/issues/10391
  const shouldBlockRequest = (url: string) =>
    AppConstants.BASIC_FUNCTIONALITY_BLOCK_LIST.some((blockedUrl) =>
      url.includes(blockedUrl),
    );

  const handleBlockedRequest = (xhr: XMLHttpRequest) => {
    const error = new Error(`Disallowed URL: ${currentUrl}`);
    // Keep existing logging behavior (relied upon by tests)
    console.error(error);

    // Proactively notify consumers so promises (e.g., fetch) do not hang.
    try {
      // Inform listeners that an error occurred
      const onerror = xhr.onerror;
      if (typeof onerror === 'function') {
        // @ts-expect-error - ProgressEvent is not supported by React Native and we don't need it
        onerror(error);
      }
    } catch {
      // no-op
    }

    try {
      // Abort to ensure any consumers listening for abort are notified
      if (typeof xhr.abort === 'function') {
        xhr.abort();
      }
    } catch {
      // no-op
    }

    try {
      // Fire loadend if present to complete any pending listeners
      const onloadend = xhr.onloadend;
      if (typeof onloadend === 'function') {
        // @ts-expect-error - ProgressEvent is not supported by React Native and we don't need it
        onloadend();
      }
    } catch {
      // no-op
    }
  };

  // Override the 'open' method to capture the request URL
  global.XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    user?: string | null,
    password?: string | null,
  ) {
    currentUrl = url?.toString();
    return originalOpen.apply(this, [
      method,
      currentUrl,
      async,
      user,
      password,
    ]);
  };

  // Override the 'send' method to implement the blocking logic
  global.XMLHttpRequest.prototype.send = function (
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    // Check if the current request should be blocked
    if (shouldBlockRequest(currentUrl)) {
      handleBlockedRequest(this as XMLHttpRequest); // Trigger error/abort so callers don't hang
      return; // Do not proceed with the request
    }
    // For non-blocked requests, proceed as normal
    return originalSend.call(this, body);
  };
}

export function restoreXMLHttpRequest() {
  global.XMLHttpRequest.prototype.open = originalOpen;
  global.XMLHttpRequest.prototype.send = originalSend;
}
