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

  const handleError = () =>
    Promise.reject(new Error(`Disallowed URL: ${currentUrl}`)).catch(
      (error) => {
        console.error(error);
      },
    );

  // Override the 'open' method to capture the request URL
  global.XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
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
  global.XMLHttpRequest.prototype.send = function (...args: unknown[]) {
    // Check if the current request should be blocked
    if (shouldBlockRequest(currentUrl)) {
      handleError(); // Trigger an error callback or handle the blocked request as needed
      return; // Do not proceed with the request
    }
    // For non-blocked requests, proceed as normal
    return originalSend.call(this, ...args);
  };
}

export function restoreXMLHttpRequest() {
  global.XMLHttpRequest.prototype.open = originalOpen;
  global.XMLHttpRequest.prototype.send = originalSend;
}
