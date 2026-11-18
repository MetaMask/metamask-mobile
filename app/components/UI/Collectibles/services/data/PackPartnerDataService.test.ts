import {
  BrokenCircuitError,
  type DataServiceGranularCacheUpdatedPayload,
} from '@metamask/base-data-service';
import { create } from '@metamask/superstruct';
import type { Json } from '@metamask/utils';
import { hashKey, onlineManager } from '@tanstack/query-core';
import Logger from '../../../../../util/Logger';
import { buildPackPartnerStorageHarness } from '../../../../../../tests/integration/harnesses/pack-partner/storage';
import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../../providers/pack-partner/constants/environment';
import { PACK_PARTNER_TIMINGS } from '../../providers/pack-partner/constants/packPartner';
import {
  PpWinnerStruct,
  type PpWalletCard,
  type PpWinner,
} from '../../providers/pack-partner/schemas/packPartner';
import {
  inventoryNft,
  machinePokemon50,
  machinePrivate,
  machineSealed80,
  recentOpening,
  status as statusFixture,
  walletCards,
} from '../../providers/pack-partner/services/api.fixtures';
import type { PackPartnerApi } from '../clients/PackPartnerApiClient';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceMessenger,
} from './PackPartnerDataService';
import {
  PACK_PARTNER_BUYBACK_OFFER_STALE_TIME,
  PACK_PARTNER_GREATEST_HITS_STALE_TIME,
  PACK_PARTNER_INVENTORY_STALE_TIME,
  PACK_PARTNER_OWNED_CARDS_STALE_TIME,
  PACK_PARTNER_RECENT_OPENINGS_STALE_TIME,
  packPartnerQueries,
} from './packPartnerQueries';

const NOW = Date.parse('2026-09-27T12:00:00.000Z');
const HOUR = 60 * 60_000;
const ENVIRONMENT = PACK_PARTNER_ENVIRONMENT;
const OTHER_ENVIRONMENT: PackPartnerEnvironment =
  ENVIRONMENT === 'mainnet' ? 'devnet' : 'mainnet';
const ADDRESS = 'So1anaWa11etAddre55';
const OTHER_ADDRESS = 'AnotherSo1anaWa11et';
const PACK_CODE = machinePokemon50.code;
const OTHER_PACK_CODE = 'pokemon_25';
/** Two retries with the default exponential backoff take well under a second. */
const RETRY_BACKOFF_BUDGET = 5_000;
/** How long the background cache keeps an entry nothing observes. */
const GC_TIME = 5 * 60_000;
/** How long a read's circuit stays open after it breaks. */
const CIRCUIT_BREAK_DURATION = 30_000;
/** How many served reads invalidation remembers. */
const MAX_READ_KEYS = 128;
/** Consecutive retryable failures that open a read's circuit. */
const FAILURES_TO_BREAK = 12;
/** Reads, of three attempts each, that open a read's circuit. */
const READS_TO_BREAK = FAILURES_TO_BREAK / 3;

const fixtureWalletCard = walletCards.filterNFtCard[0];

/** The recorded calls of an API mock, whatever its signature. */
type RecordedMock = Pick<
  jest.MockInstance<unknown, unknown[], unknown>,
  'mock'
>;

const createApi = (): jest.Mocked<PackPartnerApi> => ({
  getRecentOpenings: jest.fn(),
  getInventory: jest.fn(),
  getMachines: jest.fn(),
  getStatus: jest.fn(),
  generatePack: jest.fn(),
  generatePacks: jest.fn(),
  submitTransaction: jest.fn(),
  openPack: jest.fn(),
  getPackStatus: jest.fn(),
  getBuybackAvailability: jest.fn(),
  createBuyback: jest.fn(),
  checkBuyback: jest.fn(),
  getWalletCards: jest.fn(),
});

const createMessenger = (): PackPartnerDataServiceMessenger =>
  buildPackPartnerStorageHarness().messenger;

const isoAgo = (age: number): string => new Date(NOW - age).toISOString();

const walletCard = (
  nftAddress: string,
  lastTransferredAt?: string,
): PpWalletCard => ({
  nftAddress,
  itemName: `Card ${nftAddress}`,
  ...(lastTransferredAt ? { lastTransferredAt } : {}),
});

const retryableError = () =>
  createPackPartnerError({
    code: 'RATE_LIMITED',
    retryable: true,
    status: 503,
  });

const nonRetryableError = () =>
  createPackPartnerError({
    code: 'INVALID_RESPONSE',
  });

const winner = (overrides: Partial<PpWinner> = {}): PpWinner => ({
  ...create(recentOpening, PpWinnerStruct),
  ...overrides,
});

/** Network failure as the HTTP client raises it. */
const networkError = () =>
  createPackPartnerError({
    code: 'NETWORK_ERROR',
    retryable: true,
  });

/** A service whose cache holds an entry no read of the service names. */
class ServiceWithForeignEntry extends PackPartnerDataService {
  seedForeignEntry(queryFn: () => Promise<Json>): Promise<Json> {
    return this.fetchQuery({
      queryKey: ['PackPartnerDataService:getRetiredRead', ENVIRONMENT],
      queryFn,
    });
  }
}

const inventoryPage = (nfts: (typeof inventoryNft)[], nextCursor?: string) => ({
  nfts,
  hasMore: nextCursor !== undefined,
  ...(nextCursor ? { nextCursor } : {}),
});

/** Runs all pending microtasks and zero-delay timers. */
const flush = async (): Promise<void> => {
  await jest.advanceTimersByTimeAsync(0);
};

/**
 * Starts a read and lets the backoff of its retries elapse.
 *
 * @param read - Read to start.
 * @returns The read promise, settled.
 */
const withBackoffElapsed = async <Result>(
  read: () => Promise<Result>,
): Promise<Result> => {
  const promise = read();
  promise.catch(() => undefined);
  await jest.advanceTimersByTimeAsync(RETRY_BACKOFF_BUDGET);
  return promise;
};

/**
 * Holds every offer read until it is released, and records how many offer
 * reads run at once.
 *
 * @param api - API whose offer reads are held.
 * @returns The concurrency record and release controls.
 */
const holdOfferReads = (api: jest.Mocked<PackPartnerApi>) => {
  const releases: (() => void)[] = [];
  const concurrency = { running: 0, max: 0 };
  api.getBuybackAvailability.mockImplementation(async () => {
    concurrency.running += 1;
    concurrency.max = Math.max(concurrency.max, concurrency.running);
    await new Promise<void>((resolve) => {
      releases.push(resolve);
    });
    concurrency.running -= 1;
    return { available: false };
  });
  return {
    concurrency,
    releaseOldest: async (): Promise<void> => {
      releases.shift()?.();
      await flush();
    },
    releaseAll: async (): Promise<void> => {
      while (releases.length > 0) {
        releases.splice(0).forEach((release) => release());
        await flush();
      }
    },
  };
};

describe('PackPartnerDataService', () => {
  const services: PackPartnerDataService[] = [];

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    onlineManager.setOnline(true);
    jest.spyOn(Logger, 'error').mockImplementation(jest.fn());
  });

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const buildService = (api: PackPartnerApi = createApi()) => {
    const messenger = createMessenger();
    const service = new PackPartnerDataService({ messenger, api });
    services.push(service);
    return { service, messenger };
  };

  const arrangePacks = (api: jest.Mocked<PackPartnerApi>) => {
    api.getMachines.mockResolvedValue([
      machinePokemon50,
      machineSealed80,
      machinePrivate,
    ]);
    api.getStatus.mockResolvedValue(statusFixture);
  };

  describe('getPacks', () => {
    it('returns only public machines that are open, mapped to packs', async () => {
      const api = createApi();
      arrangePacks(api);
      const { service } = buildService(api);

      const packs = await service.getPacks(ENVIRONMENT);

      expect(packs).toEqual([
        {
          code: machinePokemon50.code,
          name: machinePokemon50.name,
          shortName: machinePokemon50.shortName,
          category: 'Pokemon',
          price: 50,
          priceAmount: '50000000',
          instantBuybackPercent: 85,
          odds: machinePokemon50.odds,
          tierRanges: machinePokemon50.tierRanges,
          expectedValue: machinePokemon50.ev,
          maxValue: 5001,
          menuOrder: 4,
        },
      ]);
      expect(api.getMachines).toHaveBeenCalledTimes(1);
      expect(api.getStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPackInventory', () => {
    it('maps a pool page to inventory cards of the pack, without a buyback offer', async () => {
      const api = createApi();
      api.getInventory.mockResolvedValue(
        inventoryPage([inventoryNft], 'older'),
      );
      const { service } = buildService(api);

      const page = await service.getPackInventory(ENVIRONMENT, PACK_CODE);

      expect(page.nextCursor).toBe('older');
      expect(page.cards).toHaveLength(1);
      expect(page.cards[0]).toMatchObject({
        mint: inventoryNft.nft_address,
        name: inventoryNft.description,
        insuredValue: 450,
        rarity: 'epic',
        sourcePackCode: PACK_CODE,
      });
      expect(page.cards[0]).not.toHaveProperty('buyback');
      expect(api.getInventory).toHaveBeenCalledWith(
        {
          code: PACK_CODE,
          cursor: undefined,
        },
        { signal: expect.any(Object) },
      );
    });

    it('omits the cursor of the last page', async () => {
      const api = createApi();
      api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
      const { service } = buildService(api);

      const page = await service.getPackInventory(ENVIRONMENT, PACK_CODE);

      expect(page).not.toHaveProperty('nextCursor');
    });

    it('reads a later page with its cursor', async () => {
      const api = createApi();
      const olderNft = { ...inventoryNft, nft_address: 'older-mint' };
      api.getInventory
        .mockResolvedValueOnce(inventoryPage([inventoryNft], 'older'))
        .mockResolvedValueOnce(inventoryPage([olderNft]));
      const { service } = buildService(api);
      const first = await service.getPackInventory(ENVIRONMENT, PACK_CODE);

      const older = await service.getPackInventory(
        ENVIRONMENT,
        PACK_CODE,
        first.nextCursor,
      );

      expect(older.cards.map(({ mint }) => mint)).toEqual(['older-mint']);
      expect(api.getInventory).toHaveBeenLastCalledWith(
        {
          code: PACK_CODE,
          cursor: 'older',
        },
        { signal: expect.any(Object) },
      );
    });
  });

  describe('getGreatestHits', () => {
    it('ranks the twenty highest current pool values of open packs, one entry per mint', async () => {
      const api = createApi();
      const otherPack = {
        ...machinePokemon50,
        code: OTHER_PACK_CODE,
        menuOrder: 5,
      };
      api.getMachines.mockResolvedValue([machinePokemon50, otherPack]);
      api.getStatus.mockResolvedValue({
        machineStatus: 'running',
        gachas: [
          { code: PACK_CODE, status: 'open' },
          { code: OTHER_PACK_CODE, status: 'open' },
        ],
      });
      const nfts = (prefix: string, base: number, count: number) =>
        Array.from({ length: count }, (_, index) => ({
          ...inventoryNft,
          nft_address: `${prefix}-${index}`,
          insured_value: base + index,
        }));
      const firstPool = nfts('first', 0, 15);
      const otherPool = [...nfts('other', 100, 10), firstPool[14]];
      api.getInventory.mockImplementation(async ({ code }) =>
        inventoryPage(code === PACK_CODE ? firstPool : otherPool),
      );
      const { service } = buildService(api);

      const cards = await service.getGreatestHits(ENVIRONMENT);

      expect(cards).toHaveLength(20);
      expect(new Set(cards.map(({ mint }) => mint)).size).toBe(20);
      expect(cards[0]).toMatchObject({
        mint: 'other-9',
        insuredValue: 109,
        sourcePackCode: OTHER_PACK_CODE,
      });
      expect(cards[19].insuredValue).toBe(5);
      expect(api.getInventory).toHaveBeenCalledTimes(2);
      expect(api.getInventory).toHaveBeenCalledWith(
        {
          code: PACK_CODE,
          cursor: undefined,
        },
        { signal: expect.any(Object) },
      );
      expect(api.getInventory).toHaveBeenCalledWith(
        {
          code: OTHER_PACK_CODE,
          cursor: undefined,
        },
        { signal: expect.any(Object) },
      );
    });

    it('shares its catalogue and first-page pool reads with the catalogue and pack pool reads', async () => {
      const api = createApi();
      arrangePacks(api);
      api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
      const { service } = buildService(api);

      const [packs, cards] = await Promise.all([
        service.getPacks(ENVIRONMENT),
        service.getGreatestHits(ENVIRONMENT),
      ]);
      const pool = await service.getPackInventory(ENVIRONMENT, PACK_CODE);

      expect(packs.map(({ code }) => code)).toEqual([PACK_CODE]);
      expect(cards.map(({ mint }) => mint)).toEqual([inventoryNft.nft_address]);
      expect(pool.cards).toEqual(cards);
      expect(api.getMachines).toHaveBeenCalledTimes(1);
      expect(api.getStatus).toHaveBeenCalledTimes(1);
      expect(api.getInventory).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOwnedCards', () => {
    it('maps every wallet card and leaves the offer of a recent card unknown', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([fixtureWalletCard]);
      const { service } = buildService(api);

      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(cards).toEqual([
        {
          mint: fixtureWalletCard.nftAddress,
          name: fixtureWalletCard.itemName,
          nftStandard: 'core',
          image: fixtureWalletCard.images.front,
          mediumImage: fixtureWalletCard.images.frontM,
          backImage: fixtureWalletCard.images.back,
          mediumBackImage: fixtureWalletCard.images.backM,
          grade: 'GEM-MT 10',
          gradingCompany: 'PSA',
          insuredValue: 800,
          category: 'One Piece',
          year: '2024',
          set: fixtureWalletCard.set,
          acquiredAt: Date.parse(fixtureWalletCard.lastTransferredAt),
          buyback: { status: 'unknown' },
        },
      ]);
      expect(api.getWalletCards).toHaveBeenCalledWith(
        { address: ADDRESS },
        { signal: expect.any(Object) },
      );
    });

    it('reads no buyback offer while reading the owned cards', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([
        walletCard('recent-mint', isoAgo(HOUR)),
        walletCard('undated-mint'),
        walletCard('expired-mint', isoAgo(100 * HOUR)),
      ]);
      const { service } = buildService(api);

      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(api.getBuybackAvailability).not.toHaveBeenCalled();
    });

    it('leaves the offer of a card whose acquisition date is unknown to be read', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([walletCard('undated-mint')]);
      const { service } = buildService(api);

      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(cards).toEqual([
        expect.objectContaining({
          mint: 'undated-mint',
          acquiredAt: 0,
          buyback: { status: 'unknown' },
        }),
      ]);
    });

    it('marks a card acquired 72 hours ago or more unavailable', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([
        walletCard(
          'last-moment-mint',
          isoAgo(PACK_PARTNER_TIMINGS.BUYBACK_WINDOW - 1),
        ),
        walletCard('expired-mint', isoAgo(PACK_PARTNER_TIMINGS.BUYBACK_WINDOW)),
      ]);
      const { service } = buildService(api);

      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(cards.map(({ mint, buyback }) => ({ mint, buyback }))).toEqual([
        { mint: 'last-moment-mint', buyback: { status: 'unknown' } },
        { mint: 'expired-mint', buyback: { status: 'unavailable' } },
      ]);
    });

    it('sorts owned cards newest first, then by mint', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([
        walletCard('undated-mint'),
        walletCard('older-mint', isoAgo(3 * HOUR)),
        walletCard('mint-b', isoAgo(HOUR)),
        walletCard('expired-mint', isoAgo(100 * HOUR)),
        walletCard('mint-a', isoAgo(HOUR)),
      ]);
      const { service } = buildService(api);

      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(cards.map(({ mint }) => mint)).toEqual([
        'mint-a',
        'mint-b',
        'older-mint',
        'expired-mint',
        'undated-mint',
      ]);
    });

    it('fails the query when the wallet read fails', async () => {
      const api = createApi();
      const error = nonRetryableError();
      api.getWalletCards.mockRejectedValue(error);
      const { service } = buildService(api);

      const read = service.getOwnedCards(ENVIRONMENT, ADDRESS);

      await expect(read).rejects.toBe(error);
      expect(api.getBuybackAvailability).not.toHaveBeenCalled();
    });

    it('returns an empty inventory for a wallet without cards', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([]);
      const { service } = buildService(api);

      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(cards).toEqual([]);
    });

    it('keeps the inventories of two wallets apart', async () => {
      const api = createApi();
      api.getWalletCards.mockImplementation(async ({ address }) => [
        walletCard(`${address}-mint`, isoAgo(100 * HOUR)),
      ]);
      const { service } = buildService(api);

      const mine = await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      const theirs = await service.getOwnedCards(ENVIRONMENT, OTHER_ADDRESS);

      expect(mine.map(({ mint }) => mint)).toEqual([`${ADDRESS}-mint`]);
      expect(theirs.map(({ mint }) => mint)).toEqual([`${OTHER_ADDRESS}-mint`]);
      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
    });

    it('leaves the cached inventory unchanged when the offer of one of its cards is read', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([
        walletCard('recent-mint', isoAgo(HOUR)),
      ]);
      api.getBuybackAvailability.mockResolvedValue({
        available: true,
        amount: '3000000',
      });
      const { service } = buildService(api);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      const offer = await service.getBuybackOffer(ENVIRONMENT, 'recent-mint');
      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(offer).toEqual({ status: 'available', amount: '3000000' });
      expect(cards[0].buyback).toEqual({ status: 'unknown' });
      expect(api.getWalletCards).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBuybackOffer', () => {
    it('maps an available offer with its amount', async () => {
      const api = createApi();
      api.getBuybackAvailability.mockResolvedValue({
        available: true,
        amount: '42500000',
      });
      const { service } = buildService(api);

      const offer = await service.getBuybackOffer(ENVIRONMENT, 'mint');

      expect(offer).toEqual({ status: 'available', amount: '42500000' });
      expect(api.getBuybackAvailability).toHaveBeenCalledWith(
        { mint: 'mint' },
        { signal: expect.any(Object) },
      );
    });

    it('maps a missing offer to unavailable', async () => {
      const api = createApi();
      api.getBuybackAvailability.mockResolvedValue({ available: false });
      const { service } = buildService(api);

      const offer = await service.getBuybackOffer(ENVIRONMENT, 'mint');

      expect(offer).toEqual({ status: 'unavailable' });
    });

    it('runs at most four offer reads at a time and starts a waiting one when a slot frees', async () => {
      const api = createApi();
      const held = holdOfferReads(api);
      const { service } = buildService(api);
      const mints = Array.from({ length: 6 }, (_, index) => `mint-${index}`);

      const reads = mints.map((mint) =>
        service.getBuybackOffer(ENVIRONMENT, mint),
      );
      await flush();
      const startedAtOnce = api.getBuybackAvailability.mock.calls.length;
      await held.releaseOldest();
      const startedAfterOneSettled =
        api.getBuybackAvailability.mock.calls.length;
      await held.releaseAll();
      const offers = await Promise.all(reads);

      expect(startedAtOnce).toBe(
        PACK_PARTNER_TIMINGS.BUYBACK_CHECK_CONCURRENCY,
      );
      expect(startedAfterOneSettled).toBe(5);
      expect(held.concurrency.max).toBe(4);
      expect(offers).toEqual(mints.map(() => ({ status: 'unavailable' })));
      expect(
        api.getBuybackAvailability.mock.calls.map(([params]) => params),
      ).toEqual(mints.map((mint) => ({ mint })));
    });

    it('frees the slot of an offer read that fails', async () => {
      const api = createApi();
      const error = nonRetryableError();
      const releases: (() => void)[] = [];
      api.getBuybackAvailability.mockImplementation(async ({ mint }) => {
        if (mint === 'failing-mint') {
          throw error;
        }
        await new Promise<void>((resolve) => {
          releases.push(resolve);
        });
        return { available: false };
      });
      const { service } = buildService(api);
      const mints = ['failing-mint', 'mint-1', 'mint-2', 'mint-3', 'mint-4'];

      const reads = mints.map((mint) =>
        service.getBuybackOffer(ENVIRONMENT, mint),
      );
      reads.forEach((read) => read.catch(() => undefined));
      await flush();

      await expect(reads[0]).rejects.toBe(error);
      expect(api.getBuybackAvailability).toHaveBeenCalledTimes(5);
      expect(api.getBuybackAvailability).toHaveBeenLastCalledWith(
        {
          mint: 'mint-4',
        },
        { signal: expect.any(Object) },
      );
      expect(releases).toHaveLength(4);
    });

    describe('with four offer reads retrying a transient failure', () => {
      const failingMints = ['mint-0', 'mint-1', 'mint-2', 'mint-3'];

      const arrangeRetryingReads = () => {
        const api = createApi();
        const error = retryableError();
        api.getBuybackAvailability.mockImplementation(async ({ mint }) => {
          if (mint === 'waiting-mint') {
            return { available: false };
          }
          throw error;
        });
        const { service } = buildService(api);
        const failing = failingMints.map((mint) =>
          service.getBuybackOffer(ENVIRONMENT, mint),
        );
        failing.forEach((read) => read.catch(() => undefined));
        return { api, error, service, failing };
      };

      it('keeps their slots while they back off before a retry', async () => {
        const { api, service } = arrangeRetryingReads();

        const waiting = service.getBuybackOffer(ENVIRONMENT, 'waiting-mint');
        waiting.catch(() => undefined);
        await flush();

        expect(
          api.getBuybackAvailability.mock.calls.map(([params]) => params),
        ).toEqual(failingMints.map((mint) => ({ mint })));
      });

      it('starts a waiting offer read once a retrying read gives up', async () => {
        const { api, error, service, failing } = arrangeRetryingReads();

        const waiting = await withBackoffElapsed(() =>
          service.getBuybackOffer(ENVIRONMENT, 'waiting-mint'),
        );

        expect(waiting).toEqual({ status: 'unavailable' });
        await Promise.all(
          failing.map((read) => expect(read).rejects.toBe(error)),
        );
        expect(api.getBuybackAvailability).toHaveBeenCalledTimes(
          failingMints.length * 3 + 1,
        );
      });
    });
  });

  describe('getRecentOpenings', () => {
    it.each([{ wallet: 'wallet' }, { perTier: 2 }])(
      'preserves server precedence over packType for %p',
      async (priority) => {
        const api = createApi();
        api.getRecentOpenings.mockResolvedValue([
          winner({ pack_type: 'other' }),
        ]);
        const { service } = buildService(api);
        const filters = { packType: PACK_CODE, ...priority };

        const result = await service.getRecentOpenings(ENVIRONMENT, filters);

        expect(result).toHaveLength(1);
        expect(api.getRecentOpenings).toHaveBeenCalledWith(filters, {
          signal: expect.any(Object),
        });
      },
    );

    it('coalesces concurrent polls but refreshes sequential reads of the same filters', async () => {
      const api = createApi();
      api.getRecentOpenings.mockResolvedValue([winner()]);
      const { service } = buildService(api);

      await Promise.all([
        service.getRecentOpenings(ENVIRONMENT, {}),
        service.getRecentOpenings(ENVIRONMENT, {}),
      ]);
      expect(api.getRecentOpenings).toHaveBeenCalledTimes(1);
      await service.getRecentOpenings(ENVIRONMENT, {});

      expect(api.getRecentOpenings).toHaveBeenCalledTimes(2);
    });

    it('isolates cached snapshots by every filter', async () => {
      const api = createApi();
      api.getRecentOpenings.mockResolvedValue([winner()]);
      const { service } = buildService(api);
      const filters = [
        {},
        { wallet: 'wallet' },
        { epic: true },
        { slug: 'mm' },
        { perTier: 2 },
        { timestamp: '2026-11-01' },
        { cursor: 'next' },
        { count: 40 },
      ];

      await Promise.all(
        filters.map((filter) => service.getRecentOpenings(ENVIRONMENT, filter)),
      );

      expect(api.getRecentOpenings).toHaveBeenCalledTimes(filters.length);
    });

    it('reads the openings of one pack and maps them to public openings', async () => {
      const api = createApi();
      api.getRecentOpenings.mockResolvedValue([
        winner({ created_at: '2026-10-13T20:00:00.000Z' }),
        winner({ nft_address: 'other-pack-mint', pack_type: 'onepiece_50' }),
        winner({
          nft_address: 'newer-mint',
          created_at: '2026-10-13T21:00:00.000Z',
        }),
      ]);
      const { service } = buildService(api);

      const openings = await service.getRecentOpenings(ENVIRONMENT, {
        packType: PACK_CODE,
      });

      expect(api.getRecentOpenings).toHaveBeenCalledWith(
        {
          packType: PACK_CODE,
        },
        { signal: expect.any(Object) },
      );
      expect(openings.map(({ mint }) => mint)).toEqual([
        'newer-mint',
        recentOpening.nft_address,
      ]);
      expect(openings[1]).toMatchObject({
        id: `${recentOpening.nft_address}:2026-10-13T20:00:00.000Z:${recentOpening.winner}`,
        openedAt: Date.parse('2026-10-13T20:00:00.000Z'),
        sourcePackCode: PACK_CODE,
        openerAddress: recentOpening.winner,
        rarity: 'epic',
      });
      expect(openings[1]).not.toHaveProperty('buyback');
    });

    it('reads the openings of every pack for an empty pack code', async () => {
      const api = createApi();
      api.getRecentOpenings.mockResolvedValue([
        winner(),
        winner({ nft_address: 'other-pack-mint', pack_type: 'onepiece_50' }),
      ]);
      const { service } = buildService(api);

      const openings = await service.getRecentOpenings(ENVIRONMENT, {});

      expect(api.getRecentOpenings).toHaveBeenCalledWith(
        {
          packType: undefined,
        },
        { signal: expect.any(Object) },
      );
      expect(openings.map(({ sourcePackCode }) => sourcePackCode)).toEqual([
        PACK_CODE,
        'onepiece_50',
      ]);
    });

    it('re-reads every cached pack feed on a family invalidation', async () => {
      const api = createApi();
      api.getRecentOpenings.mockResolvedValue([winner()]);
      const { service } = buildService(api);
      await service.getRecentOpenings(ENVIRONMENT, {});
      await service.getRecentOpenings(ENVIRONMENT, { packType: PACK_CODE });
      api.getRecentOpenings.mockResolvedValue([
        winner({
          nft_address: 'newer-mint',
          created_at: '2026-10-13T21:00:00.000Z',
        }),
        winner(),
      ]);

      await service.invalidateQueries({
        queryKey: packPartnerQueries.getRecentOpenings(ENVIRONMENT, {}).family,
      });
      const openings = await service.getRecentOpenings(ENVIRONMENT, {
        packType: PACK_CODE,
      });

      expect(api.getRecentOpenings).toHaveBeenCalledTimes(5);
      expect(openings.map(({ mint }) => mint)).toEqual([
        'newer-mint',
        recentOpening.nft_address,
      ]);
    });
  });

  describe('caching', () => {
    it('reloads the catalogue on each sequential read', async () => {
      const api = createApi();
      arrangePacks(api);
      const { service } = buildService(api);

      await service.getPacks(ENVIRONMENT);
      await service.getPacks(ENVIRONMENT);

      expect(api.getMachines).toHaveBeenCalledTimes(2);
      expect(api.getStatus).toHaveBeenCalledTimes(2);
    });

    interface StaleTimeCase {
      read: string;
      staleTime: number;
      arrange: (api: jest.Mocked<PackPartnerApi>) => RecordedMock;
      run: (service: PackPartnerDataService) => Promise<unknown>;
    }

    const cases: StaleTimeCase[] = [
      {
        read: 'getPackInventory',
        staleTime: PACK_PARTNER_INVENTORY_STALE_TIME,
        arrange: (api) => {
          api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
          return api.getInventory;
        },
        run: (service) => service.getPackInventory(ENVIRONMENT, PACK_CODE),
      },
      {
        read: 'getGreatestHits',
        staleTime: PACK_PARTNER_GREATEST_HITS_STALE_TIME,
        arrange: (api) => {
          arrangePacks(api);
          api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
          return api.getInventory;
        },
        run: (service) => service.getGreatestHits(ENVIRONMENT),
      },
      {
        read: 'getOwnedCards',
        staleTime: PACK_PARTNER_OWNED_CARDS_STALE_TIME,
        arrange: (api) => {
          api.getWalletCards.mockResolvedValue([
            walletCard('old-mint', isoAgo(100 * HOUR)),
          ]);
          return api.getWalletCards;
        },
        run: (service) => service.getOwnedCards(ENVIRONMENT, ADDRESS),
      },
      {
        read: 'getBuybackOffer',
        staleTime: PACK_PARTNER_BUYBACK_OFFER_STALE_TIME,
        arrange: (api) => {
          api.getBuybackAvailability.mockResolvedValue({ available: false });
          return api.getBuybackAvailability;
        },
        run: (service) => service.getBuybackOffer(ENVIRONMENT, 'mint'),
      },
    ];

    it.each(cases)(
      'serves $read from the cache until its stale time elapses',
      async ({ staleTime, arrange, run }) => {
        const api = createApi();
        const fetched = arrange(api);
        const { service } = buildService(api);
        await run(service);

        jest.setSystemTime(NOW + staleTime - 1);
        await run(service);
        const callsWhileFresh = fetched.mock.calls.length;
        jest.setSystemTime(NOW + staleTime);
        await run(service);

        expect(callsWhileFresh).toBe(1);
        expect(fetched).toHaveBeenCalledTimes(2);
      },
    );

    it('coalesces concurrent reads of the same key', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([]);
      const { service } = buildService(api);

      await Promise.all([
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
      ]);

      expect(api.getWalletCards).toHaveBeenCalledTimes(1);
    });

    interface MismatchCase {
      read: string;
      run: (service: PackPartnerDataService) => Promise<unknown>;
    }

    const mismatches: MismatchCase[] = [
      {
        read: 'getPacks',
        run: (service) => service.getPacks(OTHER_ENVIRONMENT),
      },
      {
        read: 'getPackInventory',
        run: (service) =>
          service.getPackInventory(OTHER_ENVIRONMENT, PACK_CODE),
      },
      {
        read: 'getGreatestHits',
        run: (service) => service.getGreatestHits(OTHER_ENVIRONMENT),
      },
      {
        read: 'getOwnedCards',
        run: (service) => service.getOwnedCards(OTHER_ENVIRONMENT, ADDRESS),
      },
      {
        read: 'getBuybackOffer',
        run: (service) => service.getBuybackOffer(OTHER_ENVIRONMENT, 'mint'),
      },
      {
        read: 'getRecentOpenings',
        run: (service) =>
          service.getRecentOpenings(OTHER_ENVIRONMENT, { packType: PACK_CODE }),
      },
    ];

    it.each(mismatches)(
      'throws on an environment mismatch in $read before reading',
      async ({ run }) => {
        const api = createApi();
        const { service } = buildService(api);

        await expect(
          Promise.resolve().then(() => run(service)),
        ).rejects.toThrow('PackPartner environment mismatch.');
        expect(api.getMachines).not.toHaveBeenCalled();
        expect(api.getInventory).not.toHaveBeenCalled();
        expect(api.getWalletCards).not.toHaveBeenCalled();
        expect(api.getBuybackAvailability).not.toHaveBeenCalled();
        expect(api.getRecentOpenings).not.toHaveBeenCalled();
      },
    );
  });

  describe('retry policies', () => {
    interface RetryCase {
      read: string;
      fail: (api: jest.Mocked<PackPartnerApi>, error: Error) => RecordedMock;
      run: (service: PackPartnerDataService) => Promise<unknown>;
    }

    const cases: RetryCase[] = [
      {
        read: 'getPacks',
        fail: (api, error) => {
          api.getMachines.mockRejectedValue(error);
          api.getStatus.mockResolvedValue(statusFixture);
          return api.getMachines;
        },
        run: (service) => service.getPacks(ENVIRONMENT),
      },
      {
        read: 'getPackInventory',
        fail: (api, error) => {
          api.getInventory.mockRejectedValue(error);
          return api.getInventory;
        },
        run: (service) => service.getPackInventory(ENVIRONMENT, PACK_CODE),
      },
      {
        read: 'getOwnedCards',
        fail: (api, error) => {
          api.getWalletCards.mockRejectedValue(error);
          return api.getWalletCards;
        },
        run: (service) => service.getOwnedCards(ENVIRONMENT, ADDRESS),
      },
      {
        read: 'getBuybackOffer',
        fail: (api, error) => {
          api.getBuybackAvailability.mockRejectedValue(error);
          return api.getBuybackAvailability;
        },
        run: (service) => service.getBuybackOffer(ENVIRONMENT, 'mint'),
      },
      {
        read: 'getRecentOpenings',
        fail: (api, error) => {
          api.getRecentOpenings.mockRejectedValue(error);
          return api.getRecentOpenings;
        },
        run: (service) =>
          service.getRecentOpenings(ENVIRONMENT, { packType: PACK_CODE }),
      },
    ];

    it.each(cases)(
      'retries a retryable $read error twice after the first attempt',
      async ({ fail, run }) => {
        const api = createApi();
        const error = retryableError();
        const fetched = fail(api, error);
        const { service } = buildService(api);

        const read = withBackoffElapsed(() => run(service));

        await expect(read).rejects.toBe(error);
        expect(fetched).toHaveBeenCalledTimes(3);
      },
    );

    it.each(cases)(
      'does not retry a non-retryable $read error',
      async ({ fail, run }) => {
        const api = createApi();
        const error = nonRetryableError();
        const fetched = fail(api, error);
        const { service } = buildService(api);

        const read = withBackoffElapsed(() => run(service));

        await expect(read).rejects.toBe(error);
        expect(fetched).toHaveBeenCalledTimes(1);
      },
    );

    it('does not retry an unexpected error', async () => {
      const api = createApi();
      const error = new Error('Unexpected failure');
      api.getBuybackAvailability.mockRejectedValue(error);
      const { service } = buildService(api);

      const read = withBackoffElapsed(() =>
        service.getBuybackOffer(ENVIRONMENT, 'mint'),
      );

      await expect(read).rejects.toBe(error);
      expect(api.getBuybackAvailability).toHaveBeenCalledTimes(1);
    });

    it('returns the data of a retry that succeeds', async () => {
      const api = createApi();
      api.getBuybackAvailability
        .mockRejectedValueOnce(retryableError())
        .mockResolvedValueOnce({ available: true, amount: '1000000' });
      const { service } = buildService(api);

      const offer = await withBackoffElapsed(() =>
        service.getBuybackOffer(ENVIRONMENT, 'mint'),
      );

      expect(offer).toEqual({ status: 'available', amount: '1000000' });
      expect(api.getBuybackAvailability).toHaveBeenCalledTimes(2);
    });

    it('opens the circuit of a failing read without opening the circuit of the others', async () => {
      const api = createApi();
      const error = retryableError();
      api.getWalletCards.mockRejectedValue(error);
      arrangePacks(api);
      api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
      api.getBuybackAvailability.mockResolvedValue({ available: false });
      api.getRecentOpenings.mockResolvedValue([winner()]);
      const { service } = buildService(api);
      // Four reads of three attempts reach the twelve consecutive failures
      // that open a read's circuit.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await expect(
          withBackoffElapsed(() => service.getOwnedCards(ENVIRONMENT, ADDRESS)),
        ).rejects.toBe(error);
      }

      const broken = withBackoffElapsed(() =>
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
      );

      await expect(broken).rejects.toBeInstanceOf(BrokenCircuitError);
      expect(api.getWalletCards).toHaveBeenCalledTimes(12);
      await expect(service.getPacks(ENVIRONMENT)).resolves.toHaveLength(1);
      await expect(
        service.getPackInventory(ENVIRONMENT, PACK_CODE),
      ).resolves.toMatchObject({ cards: [{ mint: inventoryNft.nft_address }] });
      await expect(
        service.getBuybackOffer(ENVIRONMENT, 'mint'),
      ).resolves.toEqual({ status: 'unavailable' });
      await expect(
        service.getRecentOpenings(ENVIRONMENT, { packType: PACK_CODE }),
      ).resolves.toHaveLength(1);
    });

    it('retries a network failure raised by the HTTP client twice', async () => {
      const api = createApi();
      const error = networkError();
      api.getWalletCards.mockRejectedValue(error);
      const { service } = buildService(api);

      const read = withBackoffElapsed(() =>
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
      );

      await expect(read).rejects.toBe(error);
      expect(api.getWalletCards).toHaveBeenCalledTimes(3);
    });

    it('retries a fetch failure that reached the read unmapped twice', async () => {
      const api = createApi();
      const error = new TypeError('Network request failed');
      api.getWalletCards.mockRejectedValue(error);
      const { service } = buildService(api);

      const read = withBackoffElapsed(() =>
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
      );

      await expect(read).rejects.toBe(error);
      expect(api.getWalletCards).toHaveBeenCalledTimes(3);
    });

    it('does not retry a caller-cancelled read', async () => {
      const api = createApi();
      const error = Object.assign(new Error('Read cancelled'), {
        name: 'AbortError',
      });
      api.getWalletCards.mockRejectedValue(error);
      const { service } = buildService(api);

      const read = withBackoffElapsed(() =>
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
      );

      await expect(read).rejects.toBe(error);
      expect(api.getWalletCards).toHaveBeenCalledTimes(1);
    });

    it('does not retry an invalid response raised by the HTTP client', async () => {
      const api = createApi();
      const error = createPackPartnerError({
        code: 'INVALID_RESPONSE',
        context: 'GET /cards',
      });
      api.getWalletCards.mockRejectedValue(error);
      const { service } = buildService(api);

      const read = withBackoffElapsed(() =>
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
      );

      await expect(read).rejects.toBe(error);
      expect(api.getWalletCards).toHaveBeenCalledTimes(1);
    });

    it('counts network failures toward the circuit of the read only', async () => {
      const api = createApi();
      const error = networkError();
      api.getWalletCards.mockRejectedValue(error);
      arrangePacks(api);
      const { service } = buildService(api);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await expect(
          withBackoffElapsed(() => service.getOwnedCards(ENVIRONMENT, ADDRESS)),
        ).rejects.toBe(error);
      }

      const broken = withBackoffElapsed(() =>
        service.getOwnedCards(ENVIRONMENT, ADDRESS),
      );

      await expect(broken).rejects.toBeInstanceOf(BrokenCircuitError);
      expect(api.getWalletCards).toHaveBeenCalledTimes(12);
      await expect(service.getPacks(ENVIRONMENT)).resolves.toHaveLength(1);
    });

    it('never opens a circuit for non-retryable errors', async () => {
      const api = createApi();
      api.getWalletCards.mockRejectedValue(nonRetryableError());
      const { service } = buildService(api);
      for (let attempt = 0; attempt < 13; attempt += 1) {
        await expect(
          service.getOwnedCards(ENVIRONMENT, ADDRESS),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
      }
      api.getWalletCards.mockResolvedValue([]);

      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(cards).toEqual([]);
      expect(api.getWalletCards).toHaveBeenCalledTimes(14);
    });

    describe('after the owned-cards circuit opened', () => {
      /**
       * Opens the circuit of the owned-cards read.
       *
       * @returns The API, the service and the instant the circuit opened.
       */
      const breakOwnedCardsCircuit = async () => {
        const api = createApi();
        const error = retryableError();
        let openedAt = 0;
        api.getWalletCards.mockImplementation(async () => {
          // The circuit opens on the failure of the last attempt.
          openedAt = Date.now();
          throw error;
        });
        const { service } = buildService(api);
        for (let attempt = 0; attempt < READS_TO_BREAK; attempt += 1) {
          await expect(
            withBackoffElapsed(() =>
              service.getOwnedCards(ENVIRONMENT, ADDRESS),
            ),
          ).rejects.toBe(error);
        }
        api.getWalletCards.mockResolvedValue([]);
        return { api, service, openedAt };
      };

      it('refuses the read until 30 seconds have passed', async () => {
        const { api, service, openedAt } = await breakOwnedCardsCircuit();
        jest.setSystemTime(openedAt + CIRCUIT_BREAK_DURATION - 1);

        const read = service.getOwnedCards(ENVIRONMENT, ADDRESS);

        await expect(read).rejects.toBeInstanceOf(BrokenCircuitError);
        expect(api.getWalletCards).toHaveBeenCalledTimes(FAILURES_TO_BREAK);
      });

      it('reads again 30 seconds after the circuit opened', async () => {
        const { api, service, openedAt } = await breakOwnedCardsCircuit();
        jest.setSystemTime(openedAt + CIRCUIT_BREAK_DURATION);

        const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

        expect(cards).toEqual([]);
        expect(api.getWalletCards).toHaveBeenCalledTimes(FAILURES_TO_BREAK + 1);
      });

      it('closes the circuit once the read after 30 seconds succeeds', async () => {
        const { api, service, openedAt } = await breakOwnedCardsCircuit();
        jest.setSystemTime(openedAt + CIRCUIT_BREAK_DURATION);
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        const error = retryableError();
        api.getWalletCards.mockRejectedValue(error);

        const read = withBackoffElapsed(() =>
          service.getOwnedCards(ENVIRONMENT, OTHER_ADDRESS),
        );

        await expect(read).rejects.toBe(error);
        expect(api.getWalletCards).toHaveBeenCalledTimes(
          FAILURES_TO_BREAK + 1 + 3,
        );
      });
    });
  });

  describe('connectivity', () => {
    afterEach(() => {
      onlineManager.setOnline(true);
    });

    it('reports offline without calling HTTP when no collection is stored', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([]);
      const { service } = buildService(api);
      onlineManager.setOnline(false);

      const read = service.getOwnedCards(ENVIRONMENT, ADDRESS);

      await expect(read).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
      expect(api.getWalletCards).not.toHaveBeenCalled();
    });

    it('keeps the last collection visible offline without another HTTP call', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([walletCard('owned-mint')]);
      const { service } = buildService(api);
      const original = await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      onlineManager.setOnline(false);

      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(cards).toEqual(original);
      expect(api.getWalletCards).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateQueries', () => {
    const ownedCards = packPartnerQueries.getOwnedCards(ENVIRONMENT, ADDRESS);

    it('marks a cached read stale and re-reads it with the newer data', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([
        walletCard('old-mint', isoAgo(100 * HOUR)),
      ]);
      const { service } = buildService(api);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      api.getWalletCards.mockResolvedValue([
        walletCard('awarded-mint', isoAgo(100 * HOUR)),
        walletCard('old-mint', isoAgo(100 * HOUR)),
      ]);

      await service.invalidateQueries({ queryKey: ownedCards.family });
      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      // One read plus one refresh: the next read is served by the refresh.
      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
      expect(cards.map(({ mint }) => mint)).toEqual([
        'awarded-mint',
        'old-mint',
      ]);
    });

    it('re-reads every cached read matching a family prefix', async () => {
      const api = createApi();
      api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
      arrangePacks(api);
      const { service } = buildService(api);
      await service.getPackInventory(ENVIRONMENT, PACK_CODE);
      await service.getPackInventory(ENVIRONMENT, OTHER_PACK_CODE);
      await service.getPacks(ENVIRONMENT);

      await service.invalidateQueries({
        queryKey: packPartnerQueries.getPackInventory(ENVIRONMENT, PACK_CODE)
          .family,
      });

      expect(api.getInventory).toHaveBeenCalledTimes(4);
      expect(api.getInventory).toHaveBeenCalledWith(
        {
          code: OTHER_PACK_CODE,
          cursor: undefined,
        },
        { signal: expect.any(Object) },
      );
      expect(api.getMachines).toHaveBeenCalledTimes(1);
    });

    it('re-reads every cached page of a paginated read from the first page', async () => {
      const api = createApi();
      const olderNft = { ...inventoryNft, nft_address: 'older-mint' };
      api.getInventory.mockImplementation(async ({ cursor }) =>
        cursor
          ? inventoryPage([olderNft])
          : inventoryPage([inventoryNft], 'older'),
      );
      const { service } = buildService(api);
      await service.getPackInventory(ENVIRONMENT, PACK_CODE);
      await service.getPackInventory(ENVIRONMENT, PACK_CODE, 'older');

      await service.invalidateQueries({
        queryKey: packPartnerQueries.getPackInventory(ENVIRONMENT, PACK_CODE)
          .queryKey,
      });

      expect(api.getInventory.mock.calls.map(([params]) => params)).toEqual([
        { code: PACK_CODE, cursor: undefined },
        { code: PACK_CODE, cursor: 'older' },
        { code: PACK_CODE, cursor: undefined },
        { code: PACK_CODE, cursor: 'older' },
      ]);
    });

    it('re-reads only the exactly matching read with exact filters', async () => {
      const api = createApi();
      api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
      const { service } = buildService(api);
      await service.getPackInventory(ENVIRONMENT, PACK_CODE);
      await service.getPackInventory(ENVIRONMENT, OTHER_PACK_CODE);

      await service.invalidateQueries({
        queryKey: packPartnerQueries.getPackInventory(ENVIRONMENT, PACK_CODE)
          .queryKey,
        exact: true,
      });
      const callsAfterExactKey = api.getInventory.mock.calls.length;
      await service.invalidateQueries({
        queryKey: packPartnerQueries.getPackInventory(ENVIRONMENT, PACK_CODE)
          .family,
        exact: true,
      });

      expect(callsAfterExactKey).toBe(3);
      expect(api.getInventory).toHaveBeenLastCalledWith(
        {
          code: PACK_CODE,
          cursor: undefined,
        },
        { signal: expect.any(Object) },
      );
      // The family is a prefix, never the exact key of a cached read.
      expect(api.getInventory).toHaveBeenCalledTimes(3);
    });

    it('re-reads every cached read when the filters carry no key', async () => {
      const api = createApi();
      arrangePacks(api);
      api.getWalletCards.mockResolvedValue([
        walletCard('recent-mint', isoAgo(HOUR)),
      ]);
      api.getBuybackAvailability.mockResolvedValue({ available: false });
      const { service } = buildService(api);
      await service.getPacks(ENVIRONMENT);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      await service.getBuybackOffer(ENVIRONMENT, 'recent-mint');

      await service.invalidateQueries();

      expect(api.getMachines).toHaveBeenCalledTimes(2);
      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
      expect(api.getBuybackAvailability).toHaveBeenCalledTimes(2);
    });

    it('reads nothing when no read is cached', async () => {
      const api = createApi();
      const { service } = buildService(api);

      await service.invalidateQueries({ queryKey: ownedCards.family });
      await service.invalidateQueries();

      expect(api.getMachines).not.toHaveBeenCalled();
      expect(api.getWalletCards).not.toHaveBeenCalled();
      expect(api.getBuybackAvailability).not.toHaveBeenCalled();
    });

    it('publishes cacheUpdated for the read with the newer data', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([
        walletCard('old-mint', isoAgo(100 * HOUR)),
      ]);
      const { service, messenger } = buildService(api);
      const hash = hashKey(ownedCards.queryKey);
      const listener = jest.fn<
        void,
        [DataServiceGranularCacheUpdatedPayload]
      >();
      messenger.subscribe(
        `PackPartnerDataService:cacheUpdated:${hash}`,
        listener,
      );
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      jest.setSystemTime(NOW + 1_000);
      api.getWalletCards.mockResolvedValue([
        walletCard('awarded-mint', isoAgo(100 * HOUR)),
      ]);

      await service.invalidateQueries({ queryKey: ownedCards.family });

      expect(listener).toHaveBeenLastCalledWith({
        objectType: 'query',
        type: 'updated',
        state: expect.objectContaining({
          queries: [
            expect.objectContaining({
              queryHash: hash,
              state: expect.objectContaining({
                data: [expect.objectContaining({ mint: 'awarded-mint' })],
                dataUpdatedAt: NOW + 1_000,
              }),
            }),
          ],
        }),
      });
    });

    it('is the invalidateQueries action of the messenger', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([]);
      const { service, messenger } = buildService(api);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      await messenger.call('PackPartnerDataService:invalidateQueries', {
        queryKey: ownedCards.family,
      });

      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
    });

    it('logs a sanitized failed refresh, resolves, and re-reads on the next read', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValueOnce([
        walletCard('old-mint', isoAgo(100 * HOUR)),
      ]);
      const error = Object.assign(new Error('private-transaction'), {
        cause: { transaction: 'private-transaction', apiKey: 'secret-key' },
      });
      api.getWalletCards.mockRejectedValueOnce(error);
      const { service } = buildService(api);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      const invalidation = service.invalidateQueries({
        queryKey: ownedCards.family,
      });

      await expect(invalidation).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNKNOWN', message: 'UNKNOWN' }),
        'Collectibles: failed to refresh a PackPartner read on invalidation',
      );
      const [loggedError] = jest.mocked(Logger.error).mock.calls[0];
      expect(loggedError).not.toBe(error);
      expect(loggedError).not.toHaveProperty('cause');
      expect(JSON.stringify(loggedError)).not.toContain('private-transaction');
      expect(JSON.stringify(loggedError)).not.toContain('secret-key');
      api.getWalletCards.mockResolvedValue([
        walletCard('awarded-mint', isoAgo(100 * HOUR)),
      ]);
      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      expect(cards.map(({ mint }) => mint)).toEqual(['awarded-mint']);
      expect(api.getWalletCards).toHaveBeenCalledTimes(3);
    });

    it('reads again after a read that was in flight when the cache was invalidated', async () => {
      const api = createApi();
      let releaseStaleRead: (cards: PpWalletCard[]) => void = () => undefined;
      api.getWalletCards.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseStaleRead = resolve;
          }),
      );
      api.getWalletCards.mockResolvedValue([
        walletCard('awarded-mint', isoAgo(100 * HOUR)),
      ]);
      const { service } = buildService(api);
      const staleRead = service.getOwnedCards(ENVIRONMENT, ADDRESS);
      await flush();

      const invalidation = service.invalidateQueries({
        queryKey: ownedCards.family,
      });
      await flush();
      releaseStaleRead([]);
      await invalidation;
      const cards = await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      await expect(staleRead).resolves.toEqual([]);
      expect(cards.map(({ mint }) => mint)).toEqual(['awarded-mint']);
      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
    });

    describe('read key registry', () => {
      /**
       * Serves distinct pack pool reads, each remembered as a newer read.
       *
       * @param service - Service serving the reads.
       * @param count - Number of distinct reads.
       * @param offset - Index of the first pack code.
       */
      const serveOtherReads = async (
        service: PackPartnerDataService,
        count: number,
        offset = 0,
      ): Promise<void> => {
        for (let index = offset; index < offset + count; index += 1) {
          await service.getPackInventory(ENVIRONMENT, `pack_${index}`);
        }
      };

      const arrangeRegistry = () => {
        const api = createApi();
        api.getWalletCards.mockResolvedValue([
          walletCard('old-mint', isoAgo(100 * HOUR)),
        ]);
        api.getInventory.mockResolvedValue(inventoryPage([inventoryNft]));
        const { service, messenger } = buildService(api);
        return { api, service, messenger };
      };

      it('restores and refreshes the owned collection after its query was garbage-collected', async () => {
        const { api, service, messenger } = arrangeRegistry();
        const hash = hashKey(ownedCards.queryKey);
        const listener = jest.fn<
          void,
          [DataServiceGranularCacheUpdatedPayload]
        >();
        messenger.subscribe(
          `PackPartnerDataService:cacheUpdated:${hash}`,
          listener,
        );
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await jest.advanceTimersByTimeAsync(GC_TIME);
        api.getWalletCards.mockResolvedValue([
          walletCard('awarded-mint', isoAgo(100 * HOUR)),
        ]);

        await service.invalidateQueries({ queryKey: ownedCards.family });

        expect(listener).toHaveBeenCalledWith({
          objectType: 'query',
          type: 'removed',
          state: null,
        });
        expect(api.getWalletCards).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenLastCalledWith({
          objectType: 'query',
          type: 'updated',
          state: expect.objectContaining({
            queries: [
              expect.objectContaining({
                queryHash: hash,
                state: expect.objectContaining({
                  data: [expect.objectContaining({ mint: 'awarded-mint' })],
                  dataUpdatedAt: NOW + GC_TIME,
                }),
              }),
            ],
          }),
        });
      });

      it('refreshes a read that is among the 128 most recently served reads', async () => {
        const { api, service } = arrangeRegistry();
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await serveOtherReads(service, MAX_READ_KEYS - 1);

        await service.invalidateQueries({ queryKey: ownedCards.family });

        expect(api.getWalletCards).toHaveBeenCalledTimes(2);
      });

      it('forgets the least recently served read once 128 newer reads were served', async () => {
        const { api, service } = arrangeRegistry();
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await serveOtherReads(service, MAX_READ_KEYS);

        await service.invalidateQueries({ queryKey: ownedCards.family });

        expect(api.getWalletCards).toHaveBeenCalledTimes(1);
      });

      it('re-reads a forgotten read on its next read, as invalidation marked it stale', async () => {
        const { api, service } = arrangeRegistry();
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await serveOtherReads(service, MAX_READ_KEYS);
        await service.invalidateQueries({ queryKey: ownedCards.family });

        await service.getOwnedCards(ENVIRONMENT, ADDRESS);

        expect(api.getWalletCards).toHaveBeenCalledTimes(2);
      });

      it('keeps a read served again from the cache as the most recent one', async () => {
        const { api, service } = arrangeRegistry();
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await serveOtherReads(service, MAX_READ_KEYS - 1);
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await serveOtherReads(service, 1, MAX_READ_KEYS - 1);

        await service.invalidateQueries({ queryKey: ownedCards.family });

        expect(api.getWalletCards).toHaveBeenCalledTimes(2);
      });

      it('forgets the oldest other read when a read served again stays remembered', async () => {
        const { api, service } = arrangeRegistry();
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await serveOtherReads(service, MAX_READ_KEYS - 1);
        await service.getOwnedCards(ENVIRONMENT, ADDRESS);
        await serveOtherReads(service, 1, MAX_READ_KEYS - 1);
        const inventoryReadsBefore = api.getInventory.mock.calls.length;

        await service.invalidateQueries({
          queryKey: packPartnerQueries.getPackInventory(ENVIRONMENT, 'pack_0')
            .queryKey,
          exact: true,
        });

        expect(api.getInventory).toHaveBeenCalledTimes(inventoryReadsBefore);
      });
    });

    it('never re-reads a cache entry that no read served', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([]);
      const service = new ServiceWithForeignEntry({
        messenger: createMessenger(),
        api,
      });
      services.push(service);
      const foreignRead = jest
        .fn<Promise<Json>, []>()
        .mockResolvedValue({ retired: true });
      await service.seedForeignEntry(foreignRead);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      const invalidation = service.invalidateQueries();

      await expect(invalidation).resolves.toBeUndefined();
      expect(foreignRead).toHaveBeenCalledTimes(1);
      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('stops an earlier invalidation from republishing wallet reads after reset', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([walletCard('old-wallet-mint')]);
      const { service, messenger } = buildService(api);
      const listener = jest.fn<
        void,
        [DataServiceGranularCacheUpdatedPayload]
      >();
      messenger.subscribe(
        `PackPartnerDataService:cacheUpdated:${hashKey(
          packPartnerQueries.getOwnedCards(ENVIRONMENT, ADDRESS).queryKey,
        )}`,
        listener,
      );
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      const invalidation = service.invalidateQueries();
      await service.clearCache();
      await invalidation;

      expect(api.getWalletCards).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith({
        objectType: 'query',
        type: 'removed',
        state: null,
      });
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
    });

    it('removes cached reads so the next read fetches again', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([]);
      const { service } = buildService(api);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      await service.clearCache();
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      expect(api.getWalletCards).toHaveBeenCalledTimes(2);
    });

    it('stops re-reading the reads it removed', async () => {
      const api = createApi();
      arrangePacks(api);
      api.getWalletCards.mockResolvedValue([
        walletCard('recent-mint', isoAgo(HOUR)),
      ]);
      api.getBuybackAvailability.mockResolvedValue({ available: false });
      const { service } = buildService(api);
      await service.getPacks(ENVIRONMENT);
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);
      await service.getBuybackOffer(ENVIRONMENT, 'recent-mint');

      await service.clearCache();
      await service.invalidateQueries();

      expect(api.getMachines).toHaveBeenCalledTimes(1);
      expect(api.getWalletCards).toHaveBeenCalledTimes(1);
      expect(api.getBuybackAvailability).toHaveBeenCalledTimes(1);
    });

    it('publishes the removal of every cached read', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([]);
      const { service, messenger } = buildService(api);
      const listener = jest.fn<
        void,
        [DataServiceGranularCacheUpdatedPayload]
      >();
      messenger.subscribe(
        `PackPartnerDataService:cacheUpdated:${hashKey(
          packPartnerQueries.getOwnedCards(ENVIRONMENT, ADDRESS).queryKey,
        )}`,
        listener,
      );
      await service.getOwnedCards(ENVIRONMENT, ADDRESS);

      await service.clearCache();

      expect(listener).toHaveBeenLastCalledWith({
        objectType: 'query',
        type: 'removed',
        state: null,
      });
    });
  });

  describe('messenger actions', () => {
    it('registers only the read actions and invalidateQueries', () => {
      const messenger = createMessenger();
      const register = jest.spyOn(messenger, 'registerActionHandler');

      services.push(
        new PackPartnerDataService({ messenger, api: createApi() }),
      );

      expect(register.mock.calls.map(([action]) => action).sort()).toEqual([
        'PackPartnerDataService:getBuybackOffer',
        'PackPartnerDataService:getGreatestHits',
        'PackPartnerDataService:getOwnedCards',
        'PackPartnerDataService:getPackInventory',
        'PackPartnerDataService:getPacks',
        'PackPartnerDataService:getRecentOpenings',
        'PackPartnerDataService:invalidateQueries',
      ]);
    });

    it('serves the owned cards through the messenger', async () => {
      const api = createApi();
      api.getWalletCards.mockResolvedValue([
        walletCard('old-mint', isoAgo(100 * HOUR)),
      ]);
      const { messenger } = buildService(api);

      const cards = await messenger.call(
        'PackPartnerDataService:getOwnedCards',
        ENVIRONMENT,
        ADDRESS,
      );

      expect(cards.map(({ mint }) => mint)).toEqual(['old-mint']);
    });

    it.each([
      'getMachines',
      'getStatus',
      'getInventory',
      'getPackStatus',
      'getBuybackAvailability',
      'checkBuyback',
      'getWalletCards',
      'generatePack',
      'submitTransaction',
      'openPack',
      'createBuyback',
    ])('exposes no %s action', (method) => {
      const api = createApi();
      const { messenger } = buildService(api);
      const untypedMessenger = messenger as unknown as {
        call: (action: string) => unknown;
      };

      expect(() =>
        untypedMessenger.call(`PackPartnerDataService:${method}`),
      ).toThrow('has not been registered');
    });
  });
});
