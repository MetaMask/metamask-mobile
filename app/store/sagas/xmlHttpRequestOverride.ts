import AppConstants from '../../../app/core/AppConstants';

const originalSend = globalThis.XMLHttpRequest.prototype.send;
const originalOpen = globalThis.XMLHttpRequest.prototype.open;

export function overrideXMLHttpRequest() {
  // Store the URL of the current request - only valid under assumption of no new requests being initiated between `open` and `send` of one
  let currentUrl = '';

  // TODO: This should operate on an allowlist rather than fuzzy-blocklist approach
  // Only known "good" URLs should be explicitly allowed, as opposed to only "bad" ones disallowed
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
  globalThis.XMLHttpRequest.prototype.open = function (
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
  globalThis.XMLHttpRequest.prototype.send = function (...args: any[]) {
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
  globalThis.XMLHttpRequest.prototype.open = originalOpen;
  globalThis.XMLHttpRequest.prototype.send = originalSend;
}
