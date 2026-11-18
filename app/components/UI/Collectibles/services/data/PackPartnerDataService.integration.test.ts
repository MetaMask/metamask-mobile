import {
  buildPackPartnerStorageHarness,
  createPackPartnerUIQueryClient,
} from '../../../../../../tests/integration/harnesses/pack-partner/storage';
import {
  hashKey,
  QueryObserver,
  type QueryObserverResult,
} from '@tanstack/query-core';
import { PackPartnerDataService } from './PackPartnerDataService';
import {
  packPartnerQueries,
  packPartnerQueryFamilies,
} from './packPartnerQueries';
import { createPackPartnerApi } from '../clients/PackPartnerApiClient';
import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../../providers/pack-partner/constants/environment';
import {
  buybackAvailable,
  machinePokemon50,
  status as statusFixture,
  inventoryNft,
  recentOpening,
  walletCards,
} from '../../providers/pack-partner/services/api.fixtures';
import type { PackPartnerCard } from '../../providers/pack-partner/types/packPartner';
import type { PackPartnerOpening } from '../../providers/pack-partner/types/openings';

const ADDRESS = '2euLumARMfXPW4REBXoYrLdLoWqTmXaHUNXD4ZJiPpAe';
const HOUR = 60 * 60_000;
const NOW = Date.parse('2026-09-27T12:00:00.000Z');
const OTHER_ENVIRONMENT: PackPartnerEnvironment =
  PACK_PARTNER_ENVIRONMENT === 'mainnet' ? 'devnet' : 'mainnet';
const isoAgo = (age: number): string => new Date(NOW - age).toISOString();

/** Real validation, transport, service and cache, with HTTP as the only mocked boundary. */
describe('PackPartner data service integration', () => {
  const cleanups: (() => void)[] = [];
  beforeEach(() => {
    // The global test setup pins `Date.now`; the buyback window and the UI
    // hydration of newer cache entries both need a clock that moves.
    jest.useFakeTimers({ advanceTimers: true, now: NOW });
  });
  afterEach(() => {
    cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
    jest.useRealTimers();
  });
  const response = (status: number, body: unknown): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    }) as Response;
  /** One page of the cards API, owned by the test wallet. */
  const cardsPage = (
    cards: { nftAddress: string; lastTransferredAt: string }[],
  ) => ({
    ...walletCards,
    totalPages: 1,
    filterNFtCard: cards.map((card) => ({
      ...walletCards.filterNFtCard[0],
      ...card,
      owner: { wallet: ADDRESS, name: 'collector' },
    })),
  });
  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  const waitFor = async (predicate: () => boolean): Promise<void> => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (predicate()) {
        return;
      }
      await delay(10);
    }
    throw new Error('Timed out waiting for the observed query');
  };
  const setup = () => {
    const fetchMock = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const api = createPackPartnerApi({
      fetch: fetchMock,
      baseUrl: 'https://pack-partner.test/api',
      cardsBaseUrl: 'https://cards.test',
      apiKey: '',
    });
    const { messenger } = buildPackPartnerStorageHarness();
    const service = new PackPartnerDataService({ messenger, api });
    const ui = createPackPartnerUIQueryClient(messenger);
    cleanups.push(() => {
      ui.clear();
      service.destroy();
    });
    const calls = (path: string) =>
      fetchMock.mock.calls.filter(([url]) => String(url).includes(path)).length;
    return { service, fetchMock, messenger, ui, calls };
  };

  it('aborts a wallet read on reset without retrying the cancelled request', async () => {
    const { service, fetchMock } = setup();
    let transportSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          transportSignal = init?.signal;
          transportSignal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const pending = service
      .getOwnedCards(PACK_PARTNER_ENVIRONMENT, ADDRESS)
      .catch((error: unknown) => error);
    await waitFor(() => fetchMock.mock.calls.length === 1);

    await service.clearCache();
    await pending;
    fetchMock.mockResolvedValue(response(200, cardsPage([])));
    const cards = await service.getOwnedCards(
      PACK_PARTNER_ENVIRONMENT,
      ADDRESS,
    );

    expect(transportSignal?.aborted).toBe(true);
    expect(cards).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares catalogue reads and inventory projections between the UI proxy and service messenger', async () => {
    const { ui, messenger, fetchMock } = setup();
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/machines'))
        return response(200, { machines: [machinePokemon50] });
      if (url.includes('/status')) return response(200, statusFixture);
      return response(200, { nfts: [inventoryNft], hasMore: false });
    });
    const catalogueKey = packPartnerQueries.getPacks(
      PACK_PARTNER_ENVIRONMENT,
    ).queryKey;
    const inventoryKey = packPartnerQueries.getPackInventory(
      PACK_PARTNER_ENVIRONMENT,
      machinePokemon50.code,
    ).queryKey;

    const [uiPacks, servicePacks] = await Promise.all([
      ui.fetchQuery({ queryKey: catalogueKey }),
      messenger.call(
        'PackPartnerDataService:getPacks',
        PACK_PARTNER_ENVIRONMENT,
      ),
    ]);
    const [uiPage, servicePage] = await Promise.all([
      ui.fetchQuery({ queryKey: inventoryKey }),
      messenger.call(
        'PackPartnerDataService:getPackInventory',
        PACK_PARTNER_ENVIRONMENT,
        machinePokemon50.code,
      ),
    ]);

    expect(uiPacks).toEqual(servicePacks);
    expect(servicePacks.map(({ code }) => code)).toEqual([
      machinePokemon50.code,
    ]);
    expect(uiPage).toEqual(servicePage);
    expect(servicePage.cards[0]).toMatchObject({
      mint: inventoryNft.nft_address,
      sourcePackCode: machinePokemon50.code,
    });
    expect(servicePage.cards[0]).not.toHaveProperty('buyback');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reads the owned cards of a wallet from the cards API without reading their offers', async () => {
    const { ui, fetchMock, calls } = setup();
    const recentMint = 'RecentMint1111111111111111111111111111111111';
    const oldMint = 'OldMint111111111111111111111111111111111111';
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/cards/'))
        return response(
          200,
          cardsPage([
            {
              nftAddress: oldMint,
              lastTransferredAt: isoAgo(100 * HOUR),
            },
            {
              nftAddress: recentMint,
              lastTransferredAt: isoAgo(HOUR),
            },
          ]),
        );
      return response(200, buybackAvailable);
    });

    const cards = await ui.fetchQuery<PackPartnerCard[]>({
      queryKey: packPartnerQueries.getOwnedCards(
        PACK_PARTNER_ENVIRONMENT,
        ADDRESS,
      ).queryKey,
    });

    expect(cards.map(({ mint, buyback }) => ({ mint, buyback }))).toEqual([
      { mint: recentMint, buyback: { status: 'unknown' } },
      { mint: oldMint, buyback: { status: 'unavailable' } },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      `https://cards.test/cards/${ADDRESS}/`,
    );
    expect(calls('/buyback/available')).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves the offer of a recent owned card through its own UI read', async () => {
    const { ui, fetchMock, calls } = setup();
    const recentMint = 'RecentMint1111111111111111111111111111111111';
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/cards/'))
        return response(
          200,
          cardsPage([
            { nftAddress: recentMint, lastTransferredAt: isoAgo(HOUR) },
          ]),
        );
      return response(200, buybackAvailable);
    });
    await ui.fetchQuery<PackPartnerCard[]>({
      queryKey: packPartnerQueries.getOwnedCards(
        PACK_PARTNER_ENVIRONMENT,
        ADDRESS,
      ).queryKey,
    });

    const offer = await ui.fetchQuery({
      queryKey: packPartnerQueries.getBuybackOffer(
        PACK_PARTNER_ENVIRONMENT,
        recentMint,
      ).queryKey,
    });

    expect(offer).toEqual({ status: 'available', amount: '42500000' });
    expect(calls('/buyback/available')).toBe(1);
    expect(String(fetchMock.mock.calls[1][0])).toContain(`nft=${recentMint}`);
  });

  it('refreshes a UI observer of the owned cards after a family invalidation on the messenger', async () => {
    const { ui, messenger, fetchMock, calls } = setup();
    const keptMint = 'KeptMint11111111111111111111111111111111111';
    const awardedMint = 'AwardedMint1111111111111111111111111111111';
    const kept = {
      nftAddress: keptMint,
      lastTransferredAt: isoAgo(100 * HOUR),
    };
    let owned = [kept];
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/cards/')) return response(200, cardsPage(owned));
      return response(200, buybackAvailable);
    });
    const descriptor = packPartnerQueries.getOwnedCards(
      PACK_PARTNER_ENVIRONMENT,
      ADDRESS,
    );
    const observer = new QueryObserver<PackPartnerCard[]>(ui, {
      queryKey: descriptor.queryKey,
      retry: false,
    });
    const results: QueryObserverResult<PackPartnerCard[]>[] = [];
    cleanups.push(observer.subscribe((result) => results.push(result)));
    const mints = () =>
      observer.getCurrentResult().data?.map(({ mint }) => mint) ?? [];
    await waitFor(() => mints().length === 1);
    owned = [
      {
        nftAddress: awardedMint,
        lastTransferredAt: isoAgo(0),
      },
      kept,
    ];
    // The UI only hydrates an entry newer than its own read.
    jest.setSystemTime(Date.now() + 1_000);

    await Promise.all(
      packPartnerQueryFamilies
        .opened(PACK_PARTNER_ENVIRONMENT, ADDRESS)
        .map((family) =>
          messenger.call('PackPartnerDataService:invalidateQueries', {
            queryKey: family,
          }),
        ),
    );
    await waitFor(() => mints().length === 2);

    expect(observer.getCurrentResult().data).toEqual([
      expect.objectContaining({
        mint: awardedMint,
        buyback: { status: 'unknown' },
      }),
      expect.objectContaining({
        mint: keptMint,
        buyback: { status: 'unavailable' },
      }),
    ]);
    // The service refreshed its own entry; the UI did not read again.
    expect(calls('/cards/')).toBe(2);
    expect(results.some(({ isError }) => isError)).toBe(false);
  });

  it('refreshes a UI observer of the owned cards whose background entry was garbage-collected', async () => {
    const { ui, messenger, fetchMock, calls } = setup();
    const keptMint = 'KeptMint11111111111111111111111111111111111';
    const awardedMint = 'AwardedMint1111111111111111111111111111111';
    const kept = {
      nftAddress: keptMint,
      lastTransferredAt: isoAgo(100 * HOUR),
    };
    let owned = [kept];
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/cards/')) return response(200, cardsPage(owned));
      return response(200, buybackAvailable);
    });
    const descriptor = packPartnerQueries.getOwnedCards(
      PACK_PARTNER_ENVIRONMENT,
      ADDRESS,
    );
    const observer = new QueryObserver<PackPartnerCard[]>(ui, {
      queryKey: descriptor.queryKey,
      retry: false,
    });
    cleanups.push(observer.subscribe(() => undefined));
    const mints = () =>
      observer.getCurrentResult().data?.map(({ mint }) => mint) ?? [];
    await waitFor(() => mints().length === 1);
    const removals: string[] = [];
    messenger.subscribe('PackPartnerDataService:cacheUpdated', (event) => {
      if (event.type === 'removed') removals.push(event.hash);
    });
    // The background cache collects an entry nothing observes after 5 minutes.
    jest.advanceTimersByTime(5 * 60_000);
    owned = [{ nftAddress: awardedMint, lastTransferredAt: isoAgo(0) }, kept];

    await Promise.all(
      packPartnerQueryFamilies
        .opened(PACK_PARTNER_ENVIRONMENT, ADDRESS)
        .map((family) =>
          messenger.call('PackPartnerDataService:invalidateQueries', {
            queryKey: family,
          }),
        ),
    );
    await waitFor(() => mints().length === 2);

    expect(removals).toEqual([hashKey(descriptor.queryKey)]);
    expect(mints()).toEqual([awardedMint, keptMint]);
    expect(calls('/cards/')).toBe(2);
  });

  it('reads the recent openings of a pack from the winners feed and refreshes each sequential read', async () => {
    const { ui, messenger, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      response(200, {
        success: true,
        data: [
          recentOpening,
          {
            ...recentOpening,
            nft_address: 'OtherPackMint11111111111111111111111111111',
            pack_type: 'onepiece_50',
          },
        ],
      }),
    );

    const openings = await ui.fetchQuery<PackPartnerOpening[]>({
      queryKey: packPartnerQueries.getRecentOpenings(PACK_PARTNER_ENVIRONMENT, {
        packType: machinePokemon50.code,
      }).queryKey,
    });
    const cached = await messenger.call(
      'PackPartnerDataService:getRecentOpenings',
      PACK_PARTNER_ENVIRONMENT,
      { packType: machinePokemon50.code },
    );

    expect(openings).toEqual([
      expect.objectContaining({
        mint: recentOpening.nft_address,
        sourcePackCode: machinePokemon50.code,
        openerAddress: recentOpening.winner,
      }),
    ]);
    expect(cached).toEqual(openings);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      `/getAllWinners?packType=${machinePokemon50.code}&count=20`,
    );
  });

  it('caches buyback offers and maps PackPartner availability', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(response(200, buybackAvailable));
    fetchMock.mockResolvedValueOnce(response(200, { available: false }));

    const offer = await service.getBuybackOffer(
      PACK_PARTNER_ENVIRONMENT,
      'mint',
    );
    const cached = await service.getBuybackOffer(
      PACK_PARTNER_ENVIRONMENT,
      'mint',
    );
    const other = await service.getBuybackOffer(
      PACK_PARTNER_ENVIRONMENT,
      'other-mint',
    );

    expect(offer).toEqual({ status: 'available', amount: '42500000' });
    expect(cached).toEqual(offer);
    expect(other).toEqual({ status: 'unavailable' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/buyback/available?nft=mint',
    );
  });

  it('caches public inventory, preserves cursor boundaries and re-reads every page after an invalidation', async () => {
    const { service, fetchMock } = setup();
    const first = { nfts: [inventoryNft], hasMore: true, nextCursor: 'older' };
    const last = { nfts: [], hasMore: false, nextCursor: null };
    fetchMock.mockImplementation(async (input) =>
      response(200, String(input).includes('cursor=older') ? last : first),
    );
    const page = await service.getPackInventory(
      PACK_PARTNER_ENVIRONMENT,
      'pokemon_25',
    );
    await service.getPackInventory(PACK_PARTNER_ENVIRONMENT, 'pokemon_25');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(page.cards[0]).toMatchObject({
      mint: inventoryNft.nft_address,
      sourcePackCode: 'pokemon_25',
    });

    const older = await service.getPackInventory(
      PACK_PARTNER_ENVIRONMENT,
      'pokemon_25',
      page.nextCursor,
    );
    expect(older.cards).toEqual([]);
    expect(String(fetchMock.mock.calls[1][0])).toContain('cursor=older');

    await service.invalidateQueries({
      queryKey: packPartnerQueries.getPackInventory(
        PACK_PARTNER_ENVIRONMENT,
        'pokemon_25',
      ).family,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[2][0])).not.toContain('cursor=');
    expect(String(fetchMock.mock.calls[3][0])).toContain('cursor=older');
  });

  it('returns the twenty highest current pool values with unique mints and their actual source pack', async () => {
    const { service, fetchMock } = setup();
    const nfts = Array.from({ length: 25 }, (_, index) => ({
      ...inventoryNft,
      nft_address: `mint-${index}`,
      insured_value: index,
    }));
    fetchMock
      .mockResolvedValueOnce(response(200, { machines: [machinePokemon50] }))
      .mockResolvedValueOnce(response(200, statusFixture))
      .mockResolvedValueOnce(
        response(200, { nfts: [...nfts, nfts[24]], hasMore: false }),
      );

    const cards = await service.getGreatestHits(PACK_PARTNER_ENVIRONMENT);
    const cachedCards = await service.getGreatestHits(PACK_PARTNER_ENVIRONMENT);

    expect(cards).toHaveLength(20);
    expect(cards[0]).toMatchObject({
      mint: 'mint-24',
      insuredValue: 24,
      sourcePackCode: machinePokemon50.code,
    });
    expect(cards[19].insuredValue).toBe(5);
    expect(new Set(cards.map(({ mint }) => mint)).size).toBe(20);
    expect(cachedCards).toEqual(cards);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a transient read but never malformed data', async () => {
    const { service, fetchMock } = setup();
    fetchMock
      .mockResolvedValueOnce(response(503, {}))
      .mockResolvedValueOnce(response(200, { available: false }));
    await expect(
      service.getBuybackOffer(PACK_PARTNER_ENVIRONMENT, 'retry-mint'),
    ).resolves.toEqual({ status: 'unavailable' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValue(response(200, { invalid: 'schema' }));
    await expect(
      service.getPackInventory(PACK_PARTNER_ENVIRONMENT, 'bad-data'),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a network failure of the HTTP client', async () => {
    const { service, fetchMock } = setup();
    fetchMock
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(response(200, cardsPage([])));

    const cards = await service.getOwnedCards(
      PACK_PARTNER_ENVIRONMENT,
      ADDRESS,
    );

    expect(cards).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reads the catalogue once when a screen loads it with Greatest Hits, and fills the first pool page', async () => {
    const { ui, service, calls, fetchMock } = setup();
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/machines'))
        return response(200, { machines: [machinePokemon50] });
      if (url.includes('/status')) return response(200, statusFixture);
      return response(200, { nfts: [inventoryNft], hasMore: false });
    });

    const [packs, greatestHits] = await Promise.all([
      ui.fetchQuery({
        queryKey: packPartnerQueries.getPacks(PACK_PARTNER_ENVIRONMENT)
          .queryKey,
      }),
      ui.fetchQuery({
        queryKey: packPartnerQueries.getGreatestHits(PACK_PARTNER_ENVIRONMENT)
          .queryKey,
      }),
    ]);
    const pool = await service.getPackInventory(
      PACK_PARTNER_ENVIRONMENT,
      machinePokemon50.code,
    );

    expect(packs).toEqual([
      expect.objectContaining({ code: machinePokemon50.code }),
    ]);
    expect(greatestHits).toEqual(pool.cards);
    expect(calls('/machines')).toBe(1);
    expect(calls('/status')).toBe(1);
    expect(calls('/getNfts')).toBe(1);
  });

  it('fails the owned cards when the cards API fails, so no partial inventory is cached', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(response(400, { error: 'Bad request' }));

    await expect(
      service.getOwnedCards(PACK_PARTNER_ENVIRONMENT, ADDRESS),
    ).rejects.toMatchObject({ code: 'UNKNOWN', status: 400 });

    fetchMock.mockResolvedValueOnce(response(200, cardsPage([])));
    await expect(
      service.getOwnedCards(PACK_PARTNER_ENVIRONMENT, ADDRESS),
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('removes every read on wallet reset so the next read fetches again', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockImplementation(async () => response(200, cardsPage([])));
    await service.getOwnedCards(PACK_PARTNER_ENVIRONMENT, ADDRESS);

    await service.clearCache();
    await service.invalidateQueries();
    const callsAfterReset = fetchMock.mock.calls.length;
    await service.getOwnedCards(PACK_PARTNER_ENVIRONMENT, ADDRESS);

    expect(callsAfterReset).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('exposes no workflow action and validates the requested environment', () => {
    const { service, messenger, fetchMock } = setup();
    const untypedMessenger = messenger as unknown as {
      call: (action: string) => unknown;
    };

    expect(() =>
      untypedMessenger.call('PackPartnerDataService:submitTransaction'),
    ).toThrow('has not been registered');
    expect(() => service.getPacks(OTHER_ENVIRONMENT)).toThrow(
      'environment mismatch',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
