import {
  classifyOpenAIError,
  MalformedOpenAIResponseError,
} from './errorRecovery';

describe('classifyOpenAIError', () => {
  it.each([
    new DOMException('The operation was aborted.', 'AbortError'),
    { code: 'ABORT_ERR' },
    { name: 'AbortError' },
  ])('classifies abort errors', (error) => {
    expect(classifyOpenAIError(error)).toEqual({
      kind: 'aborted',
      message: 'The response was stopped.',
      retryable: true,
      showApiKeySettings: false,
    });
  });

  it.each([
    new TypeError('Network request failed'),
    new Error('Failed to fetch'),
    { code: 'ENETUNREACH' },
    { code: 'err_network' },
  ])('classifies offline and network failures', (error) => {
    expect(classifyOpenAIError(error)).toEqual({
      kind: 'network',
      message: 'You appear to be offline. Check your connection and try again.',
      retryable: true,
      showApiKeySettings: false,
    });
  });

  it.each([{ status: 401 }, { response: { status: 401 } }])(
    'directs 401 errors to API-key settings',
    (error) => {
      expect(classifyOpenAIError(error)).toEqual({
        kind: 'invalid_api_key',
        message: 'Your OpenAI API key was rejected. Update it and try again.',
        retryable: false,
        showApiKeySettings: true,
      });
    },
  );

  it('makes rate limit errors retryable', () => {
    expect(classifyOpenAIError({ status: 429 })).toEqual({
      kind: 'rate_limited',
      message:
        'OpenAI is receiving too many requests. Wait a moment and try again.',
      retryable: true,
      showApiKeySettings: false,
    });
  });

  it.each([500, 502, 503, 599])(
    'classifies %s as a temporary server failure',
    (status) => {
      expect(classifyOpenAIError({ status })).toEqual({
        kind: 'server',
        message: 'OpenAI is temporarily unavailable. Try again in a moment.',
        retryable: true,
        showApiKeySettings: false,
      });
    },
  );

  it.each([
    new MalformedOpenAIResponseError(),
    new SyntaxError('Unexpected token s in JSON'),
    { name: 'MalformedOpenAIResponseError' },
  ])('classifies malformed structured responses', (error) => {
    expect(classifyOpenAIError(error)).toEqual({
      kind: 'malformed_response',
      message:
        'The assistant returned an unreadable response. Please try again.',
      retryable: true,
      showApiKeySettings: false,
    });
  });

  it.each([
    undefined,
    null,
    'failure',
    new Error('sk-proj-secret-value'),
    { response: { body: 'sk-proj-secret-value' }, status: 403 },
  ])('returns a safe generic recovery without echoing error data', (error) => {
    const recovery = classifyOpenAIError(error);

    expect(recovery).toEqual({
      kind: 'unknown',
      message: 'The assistant could not respond. Please try again.',
      retryable: true,
      showApiKeySettings: false,
    });
    expect(JSON.stringify(recovery)).not.toContain('sk-proj-secret-value');
  });

  it('does not infer API-key problems from an untrusted error body', () => {
    const recovery = classifyOpenAIError(
      new Error('401 invalid API key sk-proj-secret-value'),
    );

    expect(recovery.kind).toBe('unknown');
    expect(recovery.showApiKeySettings).toBe(false);
    expect(recovery.message).not.toContain('sk-proj-secret-value');
  });
});
