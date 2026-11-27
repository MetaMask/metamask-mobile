export class NetworkTimeoutError extends Error {
  constructor() {
    super('Network request timed out');
    this.name = 'NetworkTimeoutError';
  }
}

/** A response outside 2xx. Carries the status only, never the URL. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** The body was not JSON, or `parse` rejected it. Not retried. */
export class InvalidResponseError extends Error {
  constructor(cause: unknown) {
    super('Invalid response body', { cause });
    this.name = 'InvalidResponseError';
  }
}
