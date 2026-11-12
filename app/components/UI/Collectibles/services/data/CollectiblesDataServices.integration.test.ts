import { InfiniteQueryObserver, onlineManager } from '@tanstack/query-core';
import { Messenger } from '@metamask/messenger';
import { createUIQueryClient } from '@metamask/react-data-query';
import { createDeferredPromise } from '@metamask/utils';
import { CollectiblesApiDataService } from './CollectiblesApiDataService';
import { CollectiblesSocialApiDataService } from './CollectiblesSocialApiDataService';
import { collectiblesQueries } from './collectiblesQueries';
import { MockCollectiblesApiClient } from '../clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../clients/MockCollectiblesSocialApiClient';

/** Real messenger, BaseDataService and UI proxy; only unavailable backend clients are mocked. */
describe('Collectibles data service integration', () => {
  const cleanups: (() => void)[] = [];
  let wasOnline: boolean;
  beforeEach(() => {
    wasOnline = onlineManager.isOnline();
  });
  afterEach(() => {
    cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
    onlineManager.setOnline(wasOnline);
  });

  const setup = () => {
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const messenger = new Messenger({
      namespace: 'CollectiblesApiDataService',
    });
    const api = new CollectiblesApiDataService({
      messenger,
      client: clients.collectiblesApi,
    });
    const social = new CollectiblesSocialApiDataService({
      messenger: new Messenger({
        namespace: 'CollectiblesSocialApiDataService',
      }),
      client: clients.socialApi,
    });
    const ui = createUIQueryClient(
      ['CollectiblesApiDataService'] as const,
      messenger,
    );
    cleanups.push(() => {
      ui.clear();
      api.destroy();
      social.destroy();
    });
    return { ...clients, api, social, ui };
  };

  it('reports a lost connection instead of pausing background reads indefinitely', async () => {
    const { collectiblesApi, socialApi, api, social } = setup();
    const failure = new Error('Connection lost');
    jest.spyOn(collectiblesApi, 'getPackInsights').mockRejectedValue(failure);
    jest.spyOn(socialApi, 'getPackSocialContext').mockRejectedValue(failure);
    onlineManager.setOnline(false);
    const request = { packTypes: ['pack_partner:pokemon_25'] };

    const results = await Promise.allSettled([
      api.getPackInsights('devnet:alice', request),
      social.getPackSocialContext('devnet:alice', request),
    ]);

    expect(results).toEqual([
      { status: 'rejected', reason: failure },
      { status: 'rejected', reason: failure },
    ]);
  });

  it('shares the background query between UI and direct reads and isolates account/environment keys', async () => {
    const { collectiblesApi, api, ui } = setup();
    const read = jest.spyOn(collectiblesApi, 'getPackInsights');
    const request = { packTypes: ['pack-partner:pokemon_25'] };
    const key = collectiblesQueries.api(
      'getPackInsights',
      'devnet:alice',
      request,
    );

    const [uiResult, serviceResult] = await Promise.all([
      ui.fetchQuery({ queryKey: key }),
      api.getPackInsights('devnet:alice', request),
    ]);
    expect(uiResult).toEqual(serviceResult);
    expect(read).toHaveBeenCalledTimes(1);

    await api.getPackInsights('devnet:bob', request);
    await api.getPackInsights('mainnet:alice', request);
    expect(read).toHaveBeenCalledTimes(3);
    await ui.invalidateQueries({ queryKey: key });
    await api.getPackInsights('devnet:alice', request);
    expect(read).toHaveBeenCalledTimes(4);
  });

  it('uses cursor pages in the background and the UI without embedding a query function', async () => {
    const { collectiblesApi, ui } = setup();
    const read = jest.spyOn(collectiblesApi, 'getWalletHistory');
    const request = {
      account: { namespace: 'solana' as const, address: 'viewer' },
      limit: 1,
    };
    read.mockResolvedValueOnce({
      items: [],
      nextCursor: 'older',
    });
    read.mockResolvedValueOnce({ items: [], nextCursor: null });
    const key = collectiblesQueries.api(
      'getWalletHistory',
      'devnet:viewer',
      request,
    );

    const observer = new InfiniteQueryObserver(ui, {
      queryKey: key,
      initialPageParam: null,
      getNextPageParam: (
        page: Awaited<ReturnType<typeof collectiblesApi.getWalletHistory>>,
      ) => page.nextCursor,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    cleanups.push(unsubscribe);
    await observer.refetch();
    const result = await observer.fetchNextPage();
    expect(result.data?.pages).toEqual([
      { items: [], nextCursor: 'older' },
      { items: [], nextCursor: null },
    ]);
    expect(read).toHaveBeenNthCalledWith(2, { ...request, cursor: 'older' });
  });

  it('normalizes a visible pack batch before caching and calling the client', async () => {
    const { collectiblesApi, api } = setup();
    const read = jest.spyOn(collectiblesApi, 'getPackInsights');

    await api.getPackInsights('devnet:alice', {
      packTypes: ['pokemon_50', 'pokemon_25', 'pokemon_50'],
    });
    await api.getPackInsights('devnet:alice', {
      packTypes: ['pokemon_25', 'pokemon_50'],
    });

    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith({
      packTypes: ['pokemon_25', 'pokemon_50'],
    });
  });

  it('clears pending server reads on wallet reset without allowing an old result to refill the cache', async () => {
    const { collectiblesApi, api } = setup();
    const pending =
      createDeferredPromise<
        Awaited<ReturnType<typeof collectiblesApi.getPackInsights>>
      >();
    const read = jest
      .spyOn(collectiblesApi, 'getPackInsights')
      .mockReturnValueOnce(pending.promise);
    const request = { packTypes: ['test-pack'] };
    const oldRead = api
      .getPackInsights('devnet:alice', request)
      .catch(() => undefined);
    api.clearCache();
    pending.resolve({});
    await oldRead;

    await api.getPackInsights('devnet:alice', request);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('invalidates a Social feed only after a successful write and never retries a rejected write', async () => {
    const { socialApi, social } = setup();
    const read = jest.spyOn(socialApi, 'getFeed');
    const write = jest.spyOn(socialApi, 'shareCards');
    const scope = 'devnet:alice';
    const request = { profileId: 'collector' };
    const draft = {
      draftId: 'data-service-post',
      caption: 'My card',
      cards: [
        {
          provider: 'pack-partner' as const,
          mint: 'mint',
          name: 'Set',
          imageUrl: null,
          insuredValueUsd: '10',
          memo: 'memo',
        },
      ],
    };
    await social.getFeed(scope, request);
    write.mockRejectedValueOnce(new Error('unavailable'));
    await expect(social.shareCards(scope, draft)).rejects.toThrow(
      'unavailable',
    );
    expect(write).toHaveBeenCalledTimes(1);
    await social.getFeed(scope, request);
    expect(read).toHaveBeenCalledTimes(1);

    const published = await socialApi.shareCards(draft);
    read.mockResolvedValue({ items: [published], nextCursor: null });
    await social.shareCards(scope, draft);
    const result = await social.getFeed(scope, request);
    expect(read).toHaveBeenCalledTimes(2);
    expect(result.items.some((item) => item.itemId === draft.draftId)).toBe(
      true,
    );
  });
});
