import {
  AttemptDeadlineError,
  withCommandDeadline,
} from './commandDeadline.ts';

describe('withCommandDeadline', () => {
  it('returns the operation result when it settles first', async () => {
    const result = await withCommandDeadline(Promise.resolve('ok'), 50);

    expect(result).toBe('ok');
  });

  it('rejects with the operation error when that error settles first', async () => {
    const operation = Promise.reject(new Error('tap missed'));

    await expect(withCommandDeadline(operation, 50)).rejects.toThrow(
      'tap missed',
    );
  });

  it('rejects with AttemptDeadlineError when the operation does not settle', async () => {
    const operation = new Promise<string>(() => undefined);

    await expect(withCommandDeadline(operation, 20)).rejects.toBeInstanceOf(
      AttemptDeadlineError,
    );
  });

  it('ignores a rejection that arrives after the deadline', async () => {
    let rejectLate: (error: Error) => void = () => undefined;
    const operation = new Promise<string>((_resolve, reject) => {
      rejectLate = reject;
    });

    await expect(withCommandDeadline(operation, 20)).rejects.toBeInstanceOf(
      AttemptDeadlineError,
    );

    rejectLate(new Error('late failure'));
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
});
