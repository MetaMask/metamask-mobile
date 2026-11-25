import { createTestQueryClient } from './createTestQueryClient';

it('creates independent caches and disables retries', async () => {
  const client = createTestQueryClient();
  const other = createTestQueryClient();
  const key = ['fixture'];
  const queryFn = jest.fn(async () => {
    throw new Error('fixture');
  });
  client.setQueryData(key, true);

  await expect(client.fetchQuery({ queryKey: key, queryFn })).rejects.toThrow(
    'fixture',
  );
  expect(queryFn).toHaveBeenCalledTimes(1);
  expect(other.getQueryData(key)).toBeUndefined();
});
