import AppConstants from '../../../app/core/AppConstants';
import { TraceName, TraceOperation, endTrace, trace } from '../../util/trace';

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

interface XHROverrideOptions {
  operation: TraceOperation;
  beforeSend?: (url: string) => boolean | void;
}

function createXHROverride(options: XHROverrideOptions) {
  let currentUrl = '';

  global.XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    user?: string | null,
    password?: string | null,
  ) {
    currentUrl = url?.toString();
    trace({
      name: currentUrl as TraceName,
      op: options.operation,
    });
    return originalOpen.apply(this, [
      method,
      currentUrl,
      async,
      user,
      password,
    ]);
  };

  global.XMLHttpRequest.prototype.send = function (...args: unknown[]) {
    this.addEventListener('load', () => {
      endTrace({ name: currentUrl as TraceName });
    });

    this.addEventListener('error', () => {
      endTrace({ name: currentUrl as TraceName });
    });

    if (options.beforeSend && options.beforeSend(currentUrl)) {
      return;
    }

    return originalSend.call(this, ...args);
  };
}
/**
 * This creates a trace of each URL request to sentry, sending just the hostname.
 * Currently this is only used when basic functionality is enabled.
 */
export function createLoggingXHROverride() {
  createXHROverride({ operation: TraceOperation.Http });
}

export function overrideXMLHttpRequest() {
  const shouldBlockRequest = (url: string) =>
    AppConstants.BASIC_FUNCTIONALITY_BLOCK_LIST.some((blockedUrl) =>
      url.includes(blockedUrl),
    );

  const handleError = (url: string) =>
    Promise.reject(new Error(`Disallowed URL: ${url}`)).catch((error) => {
      console.error(error);
    });

  createXHROverride({
    operation: TraceOperation.NoBasicFunctionalityHttp,
    beforeSend: (url) => {
      if (shouldBlockRequest(url)) {
        handleError(url);
        return true; // indicates request should be blocked
      }
      return false;
    },
  });
}

export function restoreXMLHttpRequest() {
  global.XMLHttpRequest.prototype.open = originalOpen;
  global.XMLHttpRequest.prototype.send = originalSend;
}
