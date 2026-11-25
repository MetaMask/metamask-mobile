import { onlineManager, QueryClient } from '@tanstack/react-query';
import { HttpError, OfflineError } from './errors';
import { networkMutationOptions } from './networkMutationOptions';

jest.mock('react-native/Libraries/AppState/AppState', () => ({
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

const intent = { feature: 'watchlist', operation: 'toggle' };

describe('networkMutationOptions', () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.useFakeTimers();
    onlineManager.setOnline(true);
    client = new QueryClient({
      defaultOptions: { mutations: { gcTime: Infinity } },
    });
  });

  afterEach(() => {
    client.clear();
    onlineManager.setOnline(true);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('rejects before running offline and never replays', async () => {
    onlineManager.setOnline(false);
    const mutationFn = jest.fn(async () => 'done');
    const options = networkMutationOptions({ ...intent, mutationFn });
    const mutation = client.getMutationCache().build(client, options);

    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(
      OfflineError,
    );
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(mutationFn).not.toHaveBeenCalled();
  });

  it('retries once after one second only when opted in', async () => {
    const mutationFn = jest
      .fn(async (_input: string) => 'done')
      .mockRejectedValueOnce(new HttpError(503, 'example.com'));
    const options = networkMutationOptions({
      ...intent,
      mutationFn,
      idempotent: true,
    });
    const result = client
      .getMutationCache()
      .build(client, options)
      .execute('fixture');

    await jest.advanceTimersByTimeAsync(999);
    expect(mutationFn).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('done');
    expect(mutationFn).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, true],
    [503, false],
  ] as const)(
    'does not retry status %s with idempotent=%s',
    async (status, idempotent) => {
      const error = new HttpError(status, 'example.com');
      const mutationFn = jest.fn().mockRejectedValue(error);
      const options = networkMutationOptions({
        ...intent,
        mutationFn,
        idempotent,
      });

      await expect(
        client.getMutationCache().build(client, options).execute(undefined),
      ).rejects.toBe(error);
      expect(mutationFn).toHaveBeenCalledTimes(1);
    },
  );

  it('drops the retry if transport was lost even if it recovered within the delay', async () => {
    const error = new HttpError(503, 'example.com');
    const mutationFn = jest.fn().mockRejectedValue(error);
    const options = networkMutationOptions({
      ...intent,
      mutationFn,
      idempotent: true,
    });
    const result = client
      .getMutationCache()
      .build(client, options)
      .execute(undefined);
    await jest.advanceTimersByTimeAsync(0);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await Promise.all([
      expect(result).rejects.toBe(error),
      jest.advanceTimersByTimeAsync(1000),
    ]);
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});
