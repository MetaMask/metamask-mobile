import { createMfaMoneyAccount } from './createMfaMoneyAccount';

describe('createMfaMoneyAccount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays pending before 2 seconds have passed', async () => {
    const onResolved = jest.fn();
    createMfaMoneyAccount().then(onResolved);

    jest.advanceTimersByTime(1999);
    await Promise.resolve();

    expect(onResolved).not.toHaveBeenCalled();
  });

  it('resolves after 2 seconds', async () => {
    const promise = createMfaMoneyAccount();

    jest.advanceTimersByTime(2000);

    await expect(promise).resolves.toBeUndefined();
  });
});
