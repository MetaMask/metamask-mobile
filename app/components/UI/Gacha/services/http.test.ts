import { isFetchNetworkError } from './http';

describe('isFetchNetworkError', () => {
  it.each([
    [
      'an AbortError',
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    ],
    ['a React Native network failure', new TypeError('Network request failed')],
    ['a browser network failure', new TypeError('Failed to fetch')],
  ])('accepts %s', (_, error) => {
    expect(isFetchNetworkError(error)).toBe(true);
  });

  it.each([
    [
      'a programming TypeError',
      new TypeError("Cannot read properties of undefined (reading 'x')"),
    ],
    ['a plain Error', new Error('Network request failed')],
    ['a string', 'Network request failed'],
  ])('rejects %s', (_, error) => {
    expect(isFetchNetworkError(error)).toBe(false);
  });
});
