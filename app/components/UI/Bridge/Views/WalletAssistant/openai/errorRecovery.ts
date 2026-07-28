export type OpenAIErrorKind =
  | 'aborted'
  | 'network'
  | 'invalid_api_key'
  | 'rate_limited'
  | 'server'
  | 'malformed_response'
  | 'unknown';

export interface OpenAIErrorRecovery {
  kind: OpenAIErrorKind;
  message: string;
  retryable: boolean;
  showApiKeySettings: boolean;
}

interface ErrorLike {
  code?: unknown;
  name?: unknown;
  response?: unknown;
  status?: unknown;
}

const NETWORK_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETDOWN',
  'ENETUNREACH',
  'ETIMEDOUT',
  'ERR_NETWORK',
]);

const NETWORK_ERROR_MESSAGES = [
  'failed to fetch',
  'network request failed',
  'network error',
  'internet connection appears to be offline',
  'the internet connection appears to be offline',
];

const RECOVERY_BY_KIND: Record<OpenAIErrorKind, OpenAIErrorRecovery> = {
  aborted: {
    kind: 'aborted',
    message: 'The response was stopped.',
    retryable: true,
    showApiKeySettings: false,
  },
  network: {
    kind: 'network',
    message: 'You appear to be offline. Check your connection and try again.',
    retryable: true,
    showApiKeySettings: false,
  },
  invalid_api_key: {
    kind: 'invalid_api_key',
    message: 'Your OpenAI API key was rejected. Update it and try again.',
    retryable: false,
    showApiKeySettings: true,
  },
  rate_limited: {
    kind: 'rate_limited',
    message:
      'OpenAI is receiving too many requests. Wait a moment and try again.',
    retryable: true,
    showApiKeySettings: false,
  },
  server: {
    kind: 'server',
    message: 'OpenAI is temporarily unavailable. Try again in a moment.',
    retryable: true,
    showApiKeySettings: false,
  },
  malformed_response: {
    kind: 'malformed_response',
    message: 'The assistant returned an unreadable response. Please try again.',
    retryable: true,
    showApiKeySettings: false,
  },
  unknown: {
    kind: 'unknown',
    message: 'The assistant could not respond. Please try again.',
    retryable: true,
    showApiKeySettings: false,
  },
};

/**
 * A safe marker for a response that could not be decoded into the expected
 * structured shape. The raw response must never be passed to this error.
 */
export class MalformedOpenAIResponseError extends Error {
  constructor() {
    super('The OpenAI response did not match the expected structure.');
    this.name = 'MalformedOpenAIResponseError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const getErrorLike = (error: unknown): ErrorLike =>
  isRecord(error) ? error : {};

const getStatus = (error: unknown) => {
  const errorLike = getErrorLike(error);
  if (typeof errorLike.status === 'number') {
    return errorLike.status;
  }

  if (isRecord(errorLike.response)) {
    const responseStatus = errorLike.response.status;
    if (typeof responseStatus === 'number') {
      return responseStatus;
    }
  }

  return undefined;
};

const isAbortError = (error: unknown) => {
  const { code, name } = getErrorLike(error);
  return name === 'AbortError' || code === 'ABORT_ERR';
};

const isNetworkError = (error: unknown) => {
  const { code } = getErrorLike(error);
  if (typeof code === 'string' && NETWORK_ERROR_CODES.has(code.toUpperCase())) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.trim().toLowerCase();
  return NETWORK_ERROR_MESSAGES.some((message) =>
    normalizedMessage.includes(message),
  );
};

const isMalformedResponseError = (error: unknown) =>
  error instanceof MalformedOpenAIResponseError ||
  error instanceof SyntaxError ||
  getErrorLike(error).name === 'MalformedOpenAIResponseError';

/**
 * Converts request and response failures into a small, safe UI contract.
 * Raw error messages and response bodies are deliberately never returned.
 */
export const classifyOpenAIError = (error: unknown): OpenAIErrorRecovery => {
  if (isAbortError(error)) {
    return RECOVERY_BY_KIND.aborted;
  }

  const status = getStatus(error);
  if (status === 401) {
    return RECOVERY_BY_KIND.invalid_api_key;
  }
  if (status === 429) {
    return RECOVERY_BY_KIND.rate_limited;
  }
  if (status !== undefined && status >= 500 && status <= 599) {
    return RECOVERY_BY_KIND.server;
  }

  if (isNetworkError(error)) {
    return RECOVERY_BY_KIND.network;
  }
  if (isMalformedResponseError(error)) {
    return RECOVERY_BY_KIND.malformed_response;
  }

  return RECOVERY_BY_KIND.unknown;
};
