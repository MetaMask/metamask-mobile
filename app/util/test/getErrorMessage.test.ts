import { getErrorMessage } from './getErrorMessage';

describe('getErrorMessage', () => {
  it('returns the message from an Error', () => {
    const error = new Error('migration failed');

    const message = getErrorMessage(error);

    expect(message).toBe('migration failed');
  });

  it('throws when the captured value is not an Error', () => {
    expect(() => getErrorMessage('migration failed')).toThrow(
      'Expected captureException to receive an Error',
    );
  });
});
