import {
  REDACTED,
  headersToObject,
  isTextContentType,
  parseRawHeaders,
  redactHeaders,
  truncate,
} from './redact';

describe('redactHeaders', () => {
  it('hides credentials but keeps ordinary headers', () => {
    expect(
      redactHeaders({
        Authorization: 'Bearer abc',
        'X-Api-Key': 'k',
        'x-session-token': 't',
        'content-type': 'application/json',
      }),
    ).toEqual({
      Authorization: REDACTED,
      'X-Api-Key': REDACTED,
      'x-session-token': REDACTED,
      'content-type': 'application/json',
    });
  });
});

describe('truncate', () => {
  it('keeps short text and marks how much was cut from long text', () => {
    expect(truncate('abc', 5)).toBe('abc');
    expect(truncate('abcdefgh', 5)).toBe('abcde… [+3 chars]');
  });
});

describe('isTextContentType', () => {
  it.each([
    [undefined, true],
    ['application/json; charset=utf-8', true],
    ['application/vnd.api+json', true],
    ['text/plain', true],
    ['image/png', false],
    ['application/octet-stream', false],
  ])('%s -> %s', (contentType, expected) => {
    expect(isTextContentType(contentType)).toBe(expected);
  });
});

describe('headersToObject', () => {
  it('accepts tuples, plain objects and Headers-like objects', () => {
    expect(headersToObject([['a', '1']])).toEqual({ a: '1' });
    expect(headersToObject({ b: '2' })).toEqual({ b: '2' });
    const headersLike = {
      forEach: (cb: (value: string, name: string) => void) => cb('3', 'c'),
    } as unknown as Headers;
    expect(headersToObject(headersLike)).toEqual({ c: '3' });
    expect(headersToObject(undefined)).toEqual({});
  });
});

describe('parseRawHeaders', () => {
  it('splits on the first colon and lowercases names', () => {
    expect(
      parseRawHeaders(
        'Content-Type: text/plain\r\nLocation: http://x:80/y\r\n',
      ),
    ).toEqual({ 'content-type': 'text/plain', location: 'http://x:80/y' });
    expect(parseRawHeaders(null)).toEqual({});
  });
});
