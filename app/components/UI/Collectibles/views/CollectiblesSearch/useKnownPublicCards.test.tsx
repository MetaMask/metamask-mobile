import React, { type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { packPartnerQueries } from '../../services/data/packPartnerQueries';
import { useKnownPublicCards } from './useKnownPublicCards';

// Narrow cache-subscription contract: real TanStack cache, no screen or app hooks mocked.
describe('useKnownPublicCards cache subscription', () => {
  let client: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const key = (environment: 'devnet' | 'mainnet') =>
    packPartnerQueries.getPackInventory(environment, 'pack').queryKey;
  const inventory = (mint: string) => ({
    pages: [{ cards: [{ mint, name: mint }] }],
    pageParams: [null],
  });

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
  });
  afterEach(() => client.clear());

  it('keeps the snapshot stable when unrelated cache entries change', () => {
    client.setQueryData(key('devnet'), inventory('local'));
    const { result } = renderHook(() => useKnownPublicCards('devnet'), {
      wrapper,
    });
    const previous = result.current;

    act(() => {
      client.setQueryData(key('mainnet'), inventory('other-network'));
      client.setQueryData(['CollectiblesSocialApiDataService:getFeed'], []);
    });

    expect(result.current).toBe(previous);
    expect(result.current.map((card) => card.mint)).toEqual(['local']);
  });

  it('changes the public inventory snapshot when the network changes', () => {
    client.setQueryData(key('devnet'), inventory('test'));
    client.setQueryData(key('mainnet'), inventory('real'));
    const { result, rerender } = renderHook(
      ({ environment }: { environment: 'devnet' | 'mainnet' }) =>
        useKnownPublicCards(environment),
      { wrapper, initialProps: { environment: 'devnet' } },
    );
    expect(result.current.map((card) => card.mint)).toEqual(['test']);

    rerender({ environment: 'mainnet' });

    expect(result.current.map((card) => card.mint)).toEqual(['real']);
  });

  it('does not fetch or retain stale inventory queries', () => {
    const fetchInventory = jest.fn();
    client.setQueryDefaults(key('devnet'), { queryFn: fetchInventory });
    client.setQueryData(key('devnet'), inventory('cached'));

    renderHook(() => useKnownPublicCards('devnet'), { wrapper });

    expect(fetchInventory).not.toHaveBeenCalled();
    expect(
      client
        .getQueryCache()
        .find({ queryKey: key('devnet') })
        ?.getObserversCount(),
    ).toBe(0);
  });

  it('reads cached Greatest Hits updates without requesting a pool ranking', () => {
    const hitsKey = packPartnerQueries.getGreatestHits('devnet').queryKey;
    const fetchRanking = jest.fn();
    client.setQueryDefaults(hitsKey, { queryFn: fetchRanking });
    const { result } = renderHook(() => useKnownPublicCards('devnet'), {
      wrapper,
    });

    act(() => {
      client.setQueryData(hitsKey, [{ mint: 'ranked', name: 'Ranked card' }]);
    });

    expect(result.current.map((card) => card.mint)).toEqual(['ranked']);
    expect(fetchRanking).not.toHaveBeenCalled();
    expect(
      client.getQueryCache().find({ queryKey: hitsKey })?.getObserversCount(),
    ).toBe(0);
  });

  it('clears both visited inventory and ranking results on wallet cache reset', () => {
    client.setQueryData(key('devnet'), inventory('cached'));
    client.setQueryData(packPartnerQueries.getGreatestHits('devnet').queryKey, [
      { mint: 'ranked', name: 'Ranked card' },
    ]);
    const { result } = renderHook(() => useKnownPublicCards('devnet'), {
      wrapper,
    });
    expect(result.current).toHaveLength(2);

    act(() => client.clear());

    expect(result.current).toEqual([]);
  });

  it('releases its cache subscription on unmount', () => {
    const cache = client.getQueryCache();
    const subscribe = cache.subscribe.bind(cache);
    const unsubscribe = jest.fn();
    jest.spyOn(cache, 'subscribe').mockImplementation((listener) => {
      const release = subscribe(listener);
      return () => {
        unsubscribe();
        release();
      };
    });
    const { unmount } = renderHook(() => useKnownPublicCards('devnet'), {
      wrapper,
    });
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
