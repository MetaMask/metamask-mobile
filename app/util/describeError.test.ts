import { describeError } from './describeError';

describe('describeError', () => {
  it('formats the stack frames with function and file names', () => {
    const error = new Error('boom');

    const description = describeError(error);

    expect(description).toMatch(/^Error: boom\n {2}at /u);
    expect(description).toMatch(/describeError\.test\.ts/u);
  });

  it('restores the previous prepareStackTrace', () => {
    const errorConstructor = Error as ErrorConstructor & {
      prepareStackTrace?: unknown;
    };
    const previous = errorConstructor.prepareStackTrace;

    describeError(new Error('boom'));

    expect(errorConstructor.prepareStackTrace).toBe(previous);
  });

  it('describes values that are not errors', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });
});
