import { InMemoryStorageAdapter } from '@metamask/storage-service';
import { createDeferredPromise } from '@metamask/utils';
import { onlineManager, QueryObserver } from '@tanstack/query-core';
import { buildPackPartnerPersistenceHarness } from '../../../../../../tests/integration/harnesses/pack-partner/storage';
import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../../providers/pack-partner/constants/environment';
import {
  machinePokemon50,
  status,
  walletCards,
} from '../../providers/pack-partner/services/api.fixtures';
import type { PackPartnerCard } from '../../providers/pack-partner/types/packPartner';
import {
  packPartnerQueries,
  PACK_PARTNER_OWNED_CARDS_STALE_TIME,
} from './packPartnerQueries';

const ENVIRONMENT = PACK_PARTNER_ENVIRONMENT;
const OTHER_ENVIRONMENT: PackPartnerEnvironment =
  ENVIRONMENT === 'mainnet' ? 'devnet' : 'mainnet';
const ADDRESS = walletCards.filterNFtCard[0].owner.wallet;
const OTHER_ADDRESS = 'AnotherWallet1111111111111111111111111111111';
const NOW = Date.parse('2026-11-12T10:00:00.000Z');
const NAMESPACE = 'PackPartnerDataService';
const storageKey = (environment = ENVIRONMENT, address = ADDRESS) =>
  `ownedCards:${environment}:${address}`;
const card = (mint = 'owned-mint') => ({
  ...walletCards.filterNFtCard[0],
  nftAddress: mint,
});
const response = (body: unknown, httpStatus = 200): Response =>
  ({
    ok: httpStatus >= 200 && httpStatus < 300,
    status: httpStatus,
    text: async () => JSON.stringify(body),
  }) as Response;
const cardsResponse = (cards = [card()]) =>
  response({ filterNFtCard: cards, nextCursor: null });

/** Storage, transport validation and the UI query bridge run for real. */
describe('PackPartner collection persistence', () => {
  const cleanups: (() => void)[] = [];
  const setup = (storage = new InMemoryStorageAdapter()) => {
    const harness = buildPackPartnerPersistenceHarness(storage);
    cleanups.push(harness.cleanup);
    return harness;
  };
  const flush = () => jest.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true });
    onlineManager.setOnline(true);
  });
  afterEach(() => {
    cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
    onlineManager.setOnline(true);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shares one owned collection read between observers on forced refresh', async () => {
    const harness = setup();
    harness.fetchMock.mockResolvedValue(cardsResponse());
    const queryKey = packPartnerQueries.getOwnedCards(
      ENVIRONMENT,
      ADDRESS,
    ).queryKey;
    const firstObserver = new QueryObserver<PackPartnerCard[]>(harness.ui, {
      queryKey,
    });
    const secondObserver = new QueryObserver<PackPartnerCard[]>(harness.ui, {
      queryKey,
    });
    cleanups.push(
      firstObserver.subscribe(() => undefined),
      secondObserver.subscribe(() => undefined),
    );
    await flush();
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    const original = firstObserver.getCurrentResult().data;
    expect(original).toHaveLength(1);
    expect(original?.[0].insuredValue).toBeGreaterThan(0);
    expect(secondObserver.getCurrentResult().data).toEqual(original);
    const refresh = createDeferredPromise<Response>();
    harness.fetchMock.mockReturnValue(refresh.promise);

    const refreshing = harness.ui.invalidateQueries({ queryKey, exact: true });
    await flush();

    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
    expect(firstObserver.getCurrentResult().data).toEqual(original);
    refresh.resolve(cardsResponse([]));
    await refreshing;
    await flush();
    expect(firstObserver.getCurrentResult().data).toEqual([]);
    expect(secondObserver.getCurrentResult().data).toEqual([]);
    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('restores the complete collection after an offline restart without HTTP', async () => {
    const storage = new InMemoryStorageAdapter();
    const first = setup(storage);
    first.fetchMock.mockResolvedValue(cardsResponse());
    const original = await first.service.getOwnedCards(ENVIRONMENT, ADDRESS);
    await flush();
    first.cleanup();
    onlineManager.setOnline(false);
    const restarted = setup(storage);

    const restored = await restarted.ui.fetchQuery<PackPartnerCard[]>({
      queryKey: packPartnerQueries.getOwnedCards(ENVIRONMENT, ADDRESS).queryKey,
      networkMode: 'always',
    });

    expect(restored).toEqual(original);
    expect(restarted.fetchMock).not.toHaveBeenCalled();
  });

  it('publishes a recent snapshot before the online restart refresh completes', async () => {
    const storage = new InMemoryStorageAdapter();
    const first = setup(storage);
    first.fetchMock.mockResolvedValue(cardsResponse());
    await first.service.getOwnedCards(ENVIRONMENT, ADDRESS);
    await flush();
    first.cleanup();
    const refreshed = createDeferredPromise<Response>();
    const restarted = setup(storage);
    restarted.fetchMock.mockReturnValue(refreshed.promise);
    const observer = new QueryObserver<PackPartnerCard[]>(restarted.ui, {
      queryKey: packPartnerQueries.getOwnedCards(ENVIRONMENT, ADDRESS).queryKey,
      networkMode: 'always',
    });
    const visibleMints: string[][] = [];
    cleanups.push(
      observer.subscribe(({ data }) => {
        if (data) visibleMints.push(data.map(({ mint }) => mint));
      }),
    );

    await flush();

    expect(visibleMints).toContainEqual(['owned-mint']);
    expect(restarted.fetchMock).toHaveBeenCalledTimes(1);
    refreshed.resolve(cardsResponse([card('new-mint')]));
    await flush();
    expect(observer.getCurrentResult().data?.map(({ mint }) => mint)).toEqual([
      'new-mint',
    ]);
  });

  it('persists a successful empty collection instead of restoring sold cards', async () => {
    const storage = new InMemoryStorageAdapter();
    const first = setup(storage);
    first.fetchMock
      .mockResolvedValueOnce(cardsResponse())
      .mockResolvedValueOnce(cardsResponse([]));
    await first.service.getOwnedCards(ENVIRONMENT, ADDRESS);

    await first.service.invalidateQueries({
      queryKey: packPartnerQueries.getOwnedCards(ENVIRONMENT, ADDRESS).family,
    });
    await flush();
    first.cleanup();
    onlineManager.setOnline(false);
    const restarted = setup(storage);

    await expect(
      restarted.service.getOwnedCards(ENVIRONMENT, ADDRESS),
    ).resolves.toEqual([]);
    expect(restarted.fetchMock).not.toHaveBeenCalled();
  });

  it('preserves the last complete snapshot when a later cursor page fails', async () => {
    const storage = new InMemoryStorageAdapter();
    const first = setup(storage);
    first.fetchMock
      .mockResolvedValueOnce(cardsResponse())
      .mockResolvedValueOnce(
        response({ filterNFtCard: [card('partial-mint')], nextCursor: 'next' }),
      )
      .mockResolvedValueOnce(response({}, 400));
    const original = await first.service.getOwnedCards(ENVIRONMENT, ADDRESS);
    await flush();
    jest.setSystemTime(NOW + PACK_PARTNER_OWNED_CARDS_STALE_TIME);

    await expect(
      first.service.getOwnedCards(ENVIRONMENT, ADDRESS),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
    first.cleanup();
    onlineManager.setOnline(false);
    const restarted = setup(storage);

    await expect(
      restarted.service.getOwnedCards(ENVIRONMENT, ADDRESS),
    ).resolves.toEqual(original);
    expect(restarted.fetchMock).not.toHaveBeenCalled();
  });

  it('isolates stored collections by wallet and network', async () => {
    const storage = new InMemoryStorageAdapter({
      [NAMESPACE]: {
        [storageKey(ENVIRONMENT, OTHER_ADDRESS)]: {
          version: 1,
          updatedAt: NOW,
          cards: [
            { ...card('other-wallet-mint'), owner: { wallet: OTHER_ADDRESS } },
          ],
        },
        [storageKey(OTHER_ENVIRONMENT, ADDRESS)]: {
          version: 1,
          updatedAt: NOW,
          cards: [card('other-network-mint')],
        },
      },
    });
    onlineManager.setOnline(false);
    const { service, fetchMock } = setup(storage);

    await expect(
      service.getOwnedCards(ENVIRONMENT, ADDRESS),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    const otherWallet = await service.getOwnedCards(ENVIRONMENT, OTHER_ADDRESS);

    expect(otherWallet.map(({ mint }) => mint)).toEqual(['other-wallet-mint']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed stored cards instead of displaying them offline', async () => {
    const storage = new InMemoryStorageAdapter({
      [NAMESPACE]: {
        [storageKey()]: {
          version: 1,
          updatedAt: NOW,
          cards: [{ nftAddress: 42 }],
        },
      },
    });
    onlineManager.setOnline(false);
    const { service, fetchMock } = setup(storage);

    await expect(
      service.getOwnedCards(ENVIRONMENT, ADDRESS),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores the saved collection after transient disk and HTTP failures', async () => {
    const storage = new InMemoryStorageAdapter({
      [NAMESPACE]: {
        [storageKey()]: { version: 1, updatedAt: NOW, cards: [card()] },
      },
    });
    jest.spyOn(storage, 'getItem').mockResolvedValueOnce({
      error: new Error('Transient disk read failure'),
    });
    const { service, fetchMock } = setup(storage);
    fetchMock.mockResolvedValue(response({}));
    await expect(
      service.getOwnedCards(ENVIRONMENT, ADDRESS),
    ).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    onlineManager.setOnline(false);

    const restored = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

    expect(restored.map(({ mint }) => mint)).toEqual(['owned-mint']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never persists the pack catalogue alongside the owned collection', async () => {
    const storage = new InMemoryStorageAdapter();
    const { service, fetchMock } = setup(storage);
    fetchMock.mockImplementation(async (input) => {
      if (String(input).includes('/machines'))
        return response({ machines: [machinePokemon50] });
      if (String(input).includes('/status')) return response(status);
      return cardsResponse();
    });

    await service.getPacks(ENVIRONMENT);
    await service.getOwnedCards(ENVIRONMENT, ADDRESS);
    await flush();

    expect(await storage.getAllKeys(NAMESPACE)).toEqual([storageKey()]);
  });

  it('clears a pending snapshot write before a reset can finish', async () => {
    const storage = new InMemoryStorageAdapter();
    const writeStarted = createDeferredPromise();
    const releaseWrite = createDeferredPromise();
    const write = storage.setItem.bind(storage);
    jest.spyOn(storage, 'setItem').mockImplementationOnce(async (...args) => {
      writeStarted.resolve();
      await releaseWrite.promise;
      await write(...args);
    });
    const clear = jest.spyOn(storage, 'clear');
    const first = setup(storage);
    first.fetchMock.mockResolvedValue(cardsResponse());
    await first.service.getOwnedCards(ENVIRONMENT, ADDRESS);
    await writeStarted.promise;

    const reset = first.service.clearCache();
    await flush();

    expect(clear).not.toHaveBeenCalled();
    releaseWrite.resolve();
    await reset;
    expect(clear).toHaveBeenCalledWith(NAMESPACE);
    expect(await storage.getAllKeys(NAMESPACE)).toEqual([]);
    first.cleanup();
    onlineManager.setOnline(false);
    const restarted = setup(storage);
    await expect(
      restarted.service.getOwnedCards(ENVIRONMENT, ADDRESS),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(restarted.fetchMock).not.toHaveBeenCalled();
  });
});
