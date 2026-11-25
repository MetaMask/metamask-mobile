import {
  onlineManager,
  QueryClient,
  QueryObserver,
} from '@tanstack/react-query';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { isTierPolicyEnabled } from './killSwitch';
import { networkQueryOptions } from './networkQueryOptions';
import { prefetchIfAllowed } from './prefetch';
import { createQueryKeys } from './queryKeys';

jest.mock('../../util/deviceCapability/conditions', () => ({
  getNetworkConditions: jest.fn(),
}));
jest.mock('./killSwitch', () => ({ isTierPolicyEnabled: jest.fn() }));

it('creates tagged options for fetch, prefetch and adaptive polling', async () => {
  const client = new QueryClient();
  jest.mocked(isTierPolicyEnabled).mockReturnValue(true);
  jest.mocked(getNetworkConditions).mockReturnValue({
    hardware: 'LOW',
    network: 'SLOW_CELLULAR',
    latency: 'SLOW',
  });
  const queryKey = createQueryKeys('prices').of('spot', 'fixture');
  const queryFn = jest.fn(async () => ({ value: 3 }));
  const options = networkQueryOptions({
    queryKey,
    queryFn,
    feature: 'prices',
    operation: 'spot',
    poll: 'frequent',
    freshness: 'live',
  });
  try {
    expect(queryKey).toEqual(['prices', 'spot', 'fixture']);
    expect(options).toMatchObject({
      gcTime: 300000,
      staleTime: 30000,
      refetchIntervalInBackground: false,
      meta: { feature: 'prices', operation: 'spot' },
    });
    const observer = new QueryObserver(client, options);
    const { refetchInterval } = options;
    if (typeof refetchInterval !== 'function')
      throw new Error('Expected adaptive polling');
    expect(refetchInterval(observer.getCurrentQuery())).toBe(120000);
    await prefetchIfAllowed(client, options);
    expect(queryFn).not.toHaveBeenCalled();
    jest.mocked(isTierPolicyEnabled).mockReturnValue(false);
    expect(refetchInterval(observer.getCurrentQuery())).toBe(30000);
    await prefetchIfAllowed(client, options);
    onlineManager.setOnline(false);
    const refresh = client.fetchQuery({ ...options, staleTime: 0 });
    expect(client.getQueryState(options.queryKey)?.fetchStatus).toBe('paused');
    expect(client.getQueryData(options.queryKey)?.value).toBe(3);
    expect(queryFn).toHaveBeenCalledTimes(1);
    onlineManager.setOnline(true);
    observer.getCurrentQuery().onOnline();
    const data = await refresh;
    expect(data.value).toBe(3);
    expect(client.getQueryData(options.queryKey)?.value).toBe(3);
    expect(queryFn).toHaveBeenCalledTimes(2);
  } finally {
    onlineManager.setOnline(true);
    client.clear();
  }
});
