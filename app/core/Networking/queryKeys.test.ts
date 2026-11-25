import { createQueryKeys } from './queryKeys';

it('namespaces keys by feature and keeps parameters in order', () => {
  const keys = createQueryKeys('markets');

  expect(keys.of('detail', 'market-1', { currency: 'usd' })).toEqual([
    'markets',
    'detail',
    'market-1',
    { currency: 'usd' },
  ]);
  expect(keys.of('list')).not.toEqual(createQueryKeys('tokens').of('list'));
});
