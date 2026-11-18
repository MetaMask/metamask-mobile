/** Real Collectibles controller, PackPartner provider, data services, HTTP clients and Snap adapter across purchase, buyback and public openings flows. */
import type {
  DataServiceGranularCacheUpdatedPayload,
  QueryKey,
} from '@metamask/base-data-service';
import { SolScope } from '@metamask/keyring-api';
import { HandlerType } from '@metamask/snaps-utils';
import { assert, createDeferredPromise } from '@metamask/utils';
import { hashKey, QueryObserver } from '@tanstack/query-core';
import { getPersistentState } from '../../../../store/getPersistentState/getPersistentState';
import {
  PACK_PARTNER_ENVIRONMENT,
  PACK_PARTNER_SCOPE,
  PACK_PARTNER_TIMINGS,
} from '../providers/pack-partner/constants';
import {
  buybackAvailable,
  inventoryNft,
  machinePokemon50,
  openPackAwarded,
  packStatus,
  packStatusUnknown,
  recentOpening,
} from '../providers/pack-partner/services/api.fixtures';
import type {
  CollectiblesBuybackOperation,
  CollectiblesBuyback,
  CollectiblesCard,
  CollectiblesPackOperation,
  CollectiblesPackOperationStatus,
  CollectiblesOpening,
} from '../types';
import { packPartnerQueries } from '../services/data/packPartnerQueries';
import {
  ACCOUNT,
  buildPackPartnerIntegrationHarness,
  CARD_MINT,
  MEMO,
  PACK,
  PURCHASE_TRANSACTION,
  SALE_TRANSACTION,
  SIGNED_PURCHASE,
  SIGNED_SALE,
} from '../../../../../tests/integration/harnesses/pack-partner/pack-partner';
import {
  getDefaultCollectiblesControllerState,
  type CollectiblesControllerState,
} from './CollectiblesController';

type Harness = ReturnType<typeof buildPackPartnerIntegrationHarness>;

const SALE_AMOUNT = String(buybackAvailable.amount);
const SALE_MEMO = 'cc-buyback-3b9d0c1e-6f2a-4d8e-9a71-5c4b2e1f0a93';
const CREATED_AT = Date.parse('2026-09-29T12:00:00.000Z');
/** Background cache lifetime of an entry nobody observes (gcTime). */
const BACKGROUND_GC_TIME = 5 * 60_000;
const PAST_OPEN_WINDOW = CREATED_AT + PACK_PARTNER_TIMINGS.OPEN_WINDOW + 1;
const WITHIN_OPEN_WINDOW = CREATED_AT + 10 * 60_000;
const OTHER_MINT = '9iQWVTEBXJmw7N5ZoPE1njuijtfAcXsDhUzwDY88ZBoh';
const DELIVERED_MINT = packStatus.send.nft_address;

/** `/pack/status` of a pack whose payment PackPartner received, not yet delivered. */
const PAID_PACK_STATUS = {
  memo: MEMO,
  pack: { ...packStatus.pack, refunded: null, turbo_mode: false },
  send: null,
  buyback: [],
};

/** `/pack/status` of a delivered pack. */
const DELIVERED_PACK_STATUS = {
  ...packStatus,
  memo: MEMO,
  pack: { ...packStatus.pack, turbo_mode: false },
  buyback: [],
};

/** `/pack/status` of a memo PackPartner never saw paid. */
const UNPAID_PACK_STATUS = { ...packStatusUnknown, memo: MEMO };

/**
 * A PackPartner cards API item.
 *
 * @param mint - Card mint.
 * @returns The wallet card.
 */
const walletCard = (mint: string) => ({
  nftAddress: mint,
  itemName: `Owned ${mint.slice(0, 4)}`,
  insuredValue: '50',
});

/**
 * What a restart reads back: the state projected by the `persist` metadata,
 * as passed to the Engine writer. This is not a disk-flush or process-crash test.
 *
 * @param harness - Running harness.
 * @returns The persisted state.
 */
const toPersistedState = ({
  controller,
}: Harness): CollectiblesControllerState =>
  JSON.parse(
    JSON.stringify(getPersistentState(controller.state, controller.metadata)),
  );

/**
 * The operation of the harness account for a memo.
 *
 * @param harness - Running harness.
 * @param memo - Pack memo.
 * @returns The operation, if any.
 */
const getOperation = (
  { controller }: Harness,
  memo: string = MEMO,
): CollectiblesPackOperation | undefined =>
  controller.state.packPartner.operations[ACCOUNT.address]?.[memo];

/**
 * HTTP calls whose URL contains a fragment.
 *
 * @param harness - Running harness.
 * @param fragment - URL fragment.
 * @returns The matching calls.
 */
const getRequests = ({ fetchMock }: Harness, fragment: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes(fragment));

/**
 * Resolves with the data a cached read republishes through
 * `PackPartnerDataService:cacheUpdated:<hash>`, once it satisfies
 * `isExpected`. The refresh after a workflow outcome is fire-and-forget.
 *
 * @param harness - Running harness.
 * @param queryKey - Key of the cached read.
 * @param isExpected - Accepts the republished data.
 * @returns The republished data.
 */
const waitForCachedData = <Data>(
  { messenger }: Harness,
  queryKey: QueryKey,
  isExpected: (data: Data) => boolean,
): Promise<Data> =>
  new Promise((resolve) => {
    const eventType =
      `PackPartnerDataService:cacheUpdated:${hashKey(queryKey)}` as const;
    const listener = (payload: DataServiceGranularCacheUpdatedPayload) => {
      const query = payload.state?.queries[0];
      const data = query?.state.data as Data;
      if (query?.state.status === 'success' && isExpected(data)) {
        messenger.unsubscribe(eventType, listener);
        resolve(data);
      }
    };
    messenger.subscribe(eventType, listener);
  });

/**
 * Resolves once the harness account's operation reaches a status.
 *
 * @param harness - Running harness.
 * @param memo - Pack memo.
 * @param status - Expected status.
 * @returns The operation.
 */
const waitForOperation = (
  { messenger }: Harness,
  memo: string,
  status: CollectiblesPackOperationStatus,
): Promise<CollectiblesPackOperation> =>
  new Promise((resolve) => {
    const listener = (state: CollectiblesControllerState) => {
      const operation = state.packPartner.operations[ACCOUNT.address]?.[memo];
      if (operation?.status === status) {
        messenger.unsubscribe('CollectiblesController:stateChanged', listener);
        resolve(operation);
      }
    };
    messenger.subscribe('CollectiblesController:stateChanged', listener);
  });

/**
 * Polls a condition on a 10 ms interval, for at most 2 s. With fake timers
 * created with `advanceTimers: true`, the interval still elapses.
 *
 * @param predicate - Condition to reach.
 */
const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });
  }
  throw new Error('Timed out waiting for the condition');
};

describe('PackPartner purchase and buyback integration', () => {
  const harnesses: Harness[] = [];
  const setup = (
    options?: Parameters<typeof buildPackPartnerIntegrationHarness>[0],
  ) => {
    const harness = buildPackPartnerIntegrationHarness(options);
    harnesses.push(harness);
    return harness;
  };
  const buyPack = async ({ messenger }: Harness) => {
    const memo = await messenger.call('CollectiblesController:generatePack', {
      account: ACCOUNT,
      pack: PACK,
    });
    return messenger.call('CollectiblesController:completePack', {
      account: ACCOUNT,
      memo,
    });
  };
  const ownedCardsKey = packPartnerQueries.getOwnedCards(
    PACK_PARTNER_ENVIRONMENT,
    ACCOUNT.address,
  ).queryKey;
  const offerKey = packPartnerQueries.getBuybackOffer(
    PACK_PARTNER_ENVIRONMENT,
    CARD_MINT,
  ).queryKey;

  afterEach(() => {
    harnesses.splice(0).forEach((harness) => harness.cleanup());
  });

  describe('public reads', () => {
    it('reads inventory through the data service messenger without writing the journal or signing', async () => {
      const harness = setup({
        respond: (url) =>
          url.includes('/getNfts?')
            ? {
                body: {
                  nfts: [inventoryNft],
                  hasMore: true,
                  nextCursor: 'next-page',
                },
              }
            : undefined,
      });
      const before = harness.controller.state;

      const page = await harness.messenger.call(
        'PackPartnerDataService:getPackInventory',
        PACK_PARTNER_ENVIRONMENT,
        'pokemon_25',
        'previous-page',
      );

      expect(page).toEqual({
        cards: [
          expect.objectContaining({
            mint: inventoryNft.nft_address,
            name: inventoryNft.description,
            rarity: 'epic',
            insuredValue: 450,
            grade: 'GEM-MT 10',
            gradingCompany: 'PSA',
            image: inventoryNft.content.files[0].uri,
            mediumImage: inventoryNft.content.files[0].cc_cdn,
          }),
        ],
        nextCursor: 'next-page',
      });
      expect(page.cards[0]).not.toHaveProperty('buyback');
      expect(harness.controller.state).toBe(before);
      expect(harness.snapMock).not.toHaveBeenCalled();
      expect(harness.fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          '/getNfts?code=pokemon_25&cursor=previous-page&limit=20',
        ),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('reads owned cards per account from the PackPartner cards API without offers or controller state writes', async () => {
      const secondAddress = 'H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1';
      const harness = setup({
        respond: (url) =>
          url.includes('/cards/')
            ? {
                body: {
                  nextCursor: null,
                  filterNFtCard: [
                    url.includes(secondAddress)
                      ? walletCard(OTHER_MINT)
                      : walletCard(CARD_MINT),
                  ],
                },
              }
            : undefined,
      });
      harness.messenger.call('CollectiblesController:completeOnboarding');
      const before = harness.controller.state;

      const [cards, secondCards] = await Promise.all([
        harness.messenger.call(
          'PackPartnerDataService:getOwnedCards',
          PACK_PARTNER_ENVIRONMENT,
          ACCOUNT.address,
        ),
        harness.messenger.call(
          'PackPartnerDataService:getOwnedCards',
          PACK_PARTNER_ENVIRONMENT,
          secondAddress,
        ),
      ]);

      // Each offer is its own getBuybackOffer read.
      expect(cards).toEqual([
        expect.objectContaining({
          mint: CARD_MINT,
          buyback: { status: 'unknown' },
        }),
      ]);
      expect(cards[0]).not.toHaveProperty('source');
      expect(secondCards).toEqual([
        expect.objectContaining({ mint: OTHER_MINT }),
      ]);
      expect(harness.controller.state).toBe(before);
      expect(harness.controller.state.hasCompletedOnboarding).toBe(true);
      expect(getRequests(harness, '/buyback/available')).toHaveLength(0);
      expect(getRequests(harness, '/solana-tokens')).toHaveLength(0);
    });
  });

  describe('purchases', () => {
    it('buys a public pack and reveals the card through the API and Snap adapters without storing signed bytes', async () => {
      const harness = setup();
      const published: string[] = [];
      harness.messenger.subscribe(
        'CollectiblesController:stateChanged',
        (state) => {
          published.push(JSON.stringify(state));
        },
      );
      const packs = await harness.messenger.call(
        'PackPartnerDataService:getPacks',
        PACK_PARTNER_ENVIRONMENT,
      );

      const card = await buyPack(harness);

      expect(packs.map((pack) => pack.code)).toEqual([PACK.code]);
      expect(card).toMatchObject({
        mint: CARD_MINT,
        memo: MEMO,
        rarity: 'common',
        buyback: { status: 'available', amount: '42500000' },
      });
      expect(getOperation(harness)).toMatchObject({
        status: 'opened',
        mint: CARD_MINT,
        result: card,
      });
      expect(harness.fetchMock).toHaveBeenCalledWith(
        `${harness.apiUrl}/generatePack`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            playerAddress: ACCOUNT.address,
            packType: PACK.code,
          }),
        }),
      );
      expect(harness.snapMock).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: 'metamask',
          snapId: 'npm:@metamask/solana-wallet-snap',
          handler: HandlerType.OnClientRequest,
          request: expect.objectContaining({
            method: 'signPackPartnerBuy',
            params: {
              accountId: ACCOUNT.id,
              transaction: PURCHASE_TRANSACTION,
              scope: SolScope.Mainnet,
              context: { amount: PACK.priceAmount },
            },
          }),
        }),
      );
      expect(harness.fetchMock).toHaveBeenCalledWith(
        `${harness.apiUrl}/submitTransaction`,
        expect.objectContaining({
          body: JSON.stringify({ signedTransaction: SIGNED_PURCHASE }),
        }),
      );
      expect(harness.fetchMock).toHaveBeenCalledWith(
        `${harness.apiUrl}/openPack`,
        expect.objectContaining({ body: JSON.stringify({ memo: MEMO }) }),
      );
      expect(published.some((state) => state.includes('"submitted"'))).toBe(
        true,
      );
      expect(published.some((state) => state.includes(SIGNED_PURCHASE))).toBe(
        false,
      );
      expect(getRequests(harness, '/buyback/available')).toHaveLength(0);
    });

    it('signs the catalogue price of a pack as its USDC base units', async () => {
      const harness = setup({
        respond: (url) =>
          url.endsWith('/machines')
            ? { body: { machines: [{ ...machinePokemon50, price: 24.99 }] } }
            : undefined,
      });
      const [pack] = await harness.messenger.call(
        'PackPartnerDataService:getPacks',
        PACK_PARTNER_ENVIRONMENT,
      );

      const memo = await harness.messenger.call(
        'CollectiblesController:generatePack',
        { account: ACCOUNT, pack },
      );
      await harness.messenger.call('CollectiblesController:completePack', {
        account: ACCOUNT,
        memo,
      });

      expect(pack).toMatchObject({
        code: PACK.code,
        price: 24.99,
        priceAmount: '24990000',
      });
      expect(getOperation(harness, memo)).toMatchObject({
        status: 'opened',
        price: 24.99,
        priceAmount: '24990000',
      });
      expect(harness.snapMock).toHaveBeenCalledTimes(1);
      expect(harness.snapMock).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'signPackPartnerBuy',
            params: expect.objectContaining({
              context: { amount: '24990000' },
            }),
          }),
        }),
      );
    });

    it.each(['0', '', '24.99', '-1', '1e6'])(
      'rejects a pack whose price amount is %j before HTTP or signing',
      async (priceAmount) => {
        const harness = setup();

        await expect(
          harness.controller.generatePack({
            account: ACCOUNT,
            pack: { ...PACK, priceAmount },
          }),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

        expect(harness.fetchMock).not.toHaveBeenCalled();
        expect(harness.snapMock).not.toHaveBeenCalled();
        expect(harness.controller.state.packPartner.operations).toEqual({});
      },
    );

    it.each([
      { success: false },
      { nft_address: '' },
      { nft_address: ' \n ' },
      { transactionSignature: '' },
      { transactionSignature: ' \n ' },
    ])(
      'keeps an award containing %j resumable without another payment',
      async (fields) => {
        let rejectedAward = true;
        const harness = setup({
          respond: (url) =>
            url.endsWith('/openPack') && rejectedAward
              ? { body: { ...openPackAwarded, ...fields } }
              : undefined,
        });

        await expect(buyPack(harness)).rejects.toMatchObject({
          code: 'INVALID_RESPONSE',
        });

        expect(getOperation(harness)).toMatchObject({ status: 'paid' });
        expect(getOperation(harness)?.result).toBeUndefined();
        rejectedAward = false;
        await expect(
          harness.messenger.call('CollectiblesController:completePack', {
            account: ACCOUNT,
            memo: MEMO,
          }),
        ).resolves.toMatchObject({ mint: CARD_MINT });
        expect(harness.snapMock).toHaveBeenCalledTimes(1);
        expect(getRequests(harness, '/submitTransaction')).toHaveLength(1);
      },
    );

    it('refreshes a cached owned-card read after an award', async () => {
      let delivered = false;
      const harness = setup({
        respond: (url) =>
          url.includes('/cards/')
            ? {
                body: {
                  nextCursor: null,
                  filterNFtCard: delivered
                    ? [walletCard(OTHER_MINT), walletCard(CARD_MINT)]
                    : [walletCard(OTHER_MINT)],
                },
              }
            : undefined,
      });
      const before = await harness.messenger.call(
        'PackPartnerDataService:getOwnedCards',
        PACK_PARTNER_ENVIRONMENT,
        ACCOUNT.address,
      );
      const refreshed = waitForCachedData<CollectiblesCard[]>(
        harness,
        ownedCardsKey,
        (cards) => cards.some(({ mint }) => mint === CARD_MINT),
      );
      delivered = true;

      await buyPack(harness);
      const cards = await refreshed;

      expect(before.map(({ mint }) => mint)).toEqual([OTHER_MINT]);
      expect(cards.map(({ mint }) => mint).sort()).toEqual(
        [CARD_MINT, OTHER_MINT].sort(),
      );
      expect(getRequests(harness, '/cards/')).toHaveLength(2);
      await expect(
        harness.messenger.call(
          'PackPartnerDataService:getOwnedCards',
          PACK_PARTNER_ENVIRONMENT,
          ACCOUNT.address,
        ),
      ).resolves.toEqual(cards);
      expect(getRequests(harness, '/cards/')).toHaveLength(2);
    });

    it('prepares a Turbo multipack, signs each reviewed price, and retains both results across restart', async () => {
      const secondMemo = `${MEMO}-second`;
      const harness = setup({
        respond: (url, init) => {
          if (url.endsWith('/generateYoloPacks'))
            return {
              body: {
                yoloId: 'batch',
                count: 2,
                transactions: [MEMO, secondMemo].map((memo) => ({
                  memo,
                  transaction: PURCHASE_TRANSACTION,
                })),
              },
            };
          if (url.endsWith('/openPack')) {
            const body: { memo: string } = JSON.parse(String(init?.body));
            return {
              body: {
                ...openPackAwarded,
                nft_address: body.memo === MEMO ? CARD_MINT : OTHER_MINT,
                rarity: body.memo === MEMO ? 'Common' : 'Epic',
                code: 'TURBO_MODE_BUYBACK',
                ...(body.memo === MEMO ? { buybackAmount: 11050000 } : {}),
              },
            };
          }
          return undefined;
        },
      });

      const memo = await harness.messenger.call(
        'CollectiblesController:generatePack',
        {
          account: ACCOUNT,
          pack: PACK,
          options: { quantity: 2, turbo: true },
        },
      );
      expect(harness.snapMock).not.toHaveBeenCalled();
      await harness.messenger.call('CollectiblesController:completePacks', {
        account: ACCOUNT,
        memo,
      });

      expect(harness.fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/generateYoloPacks'),
        expect.objectContaining({
          body: JSON.stringify({
            playerAddress: ACCOUNT.address,
            packType: PACK.code,
            turbo: true,
            count: 2,
          }),
        }),
      );
      expect(harness.snapMock).toHaveBeenCalledTimes(2);
      const first = getOperation(harness, memo);
      const second = getOperation(harness, secondMemo);
      expect(first?.result?.sale).toMatchObject({
        status: 'completed',
        automatic: true,
        amount: '11050000',
      });
      expect(second?.result).toMatchObject({
        mint: OTHER_MINT,
        batchId: 'batch',
      });
      expect(second?.result?.sale).toBeUndefined();
      expect(first?.batchId).toBe('batch');
      expect(first?.batchMemos).toEqual([MEMO, secondMemo]);
      harness.controller.markPackRevealed({
        account: ACCOUNT,
        memo,
        completed: true,
      });
      const persisted = toPersistedState(harness);
      expect(
        persisted.packPartner.operations[ACCOUNT.address][memo].revealCompleted,
      ).toBe(true);
      const restored = setup({ state: persisted });
      await restored.messenger.call('CollectiblesController:completePacks', {
        account: ACCOUNT,
        memo,
      });
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(restored.fetchMock).not.toHaveBeenCalled();
      expect(getOperation(restored, secondMemo)?.result?.mint).toBe(OTHER_MINT);
    });

    it('stops a batch after a signing rejection and resumes without signing its opened pack again', async () => {
      const secondMemo = `${MEMO}-second`;
      const harness = setup({
        respond: (url) =>
          url.endsWith('/generateYoloPacks')
            ? {
                body: {
                  yoloId: 'batch',
                  count: 2,
                  transactions: [MEMO, secondMemo].map((memo) => ({
                    memo,
                    transaction: PURCHASE_TRANSACTION,
                  })),
                },
              }
            : undefined,
      });
      const memo = await harness.controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
        options: { quantity: 2, turbo: false },
      });
      harness.snapMock
        .mockResolvedValueOnce({
          signedTransaction: SIGNED_PURCHASE,
          signature: 'first',
        })
        .mockRejectedValueOnce(new Error('rejected'));

      await expect(
        harness.controller.completePacks({ account: ACCOUNT, memo }),
      ).rejects.toBeDefined();
      expect(getOperation(harness, memo)?.status).toBe('opened');
      expect(getOperation(harness, secondMemo)?.status).toBe('generated');
      await harness.controller.completePacks({ account: ACCOUNT, memo });

      expect(harness.snapMock).toHaveBeenCalledTimes(3);
      expect(getRequests(harness, '/generateYoloPacks')).toHaveLength(1);
      expect(getOperation(harness, secondMemo)?.status).toBe('opened');
    });

    it('submits the maximum batch while its openings wait, sharing concurrent resume calls', async () => {
      const memos = Array.from({ length: 5 }, (_, index) => `${MEMO}-${index}`);
      const harness = setup({
        respond: (url) =>
          url.endsWith('/generateYoloPacks')
            ? {
                body: {
                  yoloId: 'large-batch',
                  count: memos.length,
                  transactions: memos.map((memo) => ({
                    memo,
                    transaction: PURCHASE_TRANSACTION,
                  })),
                },
              }
            : undefined,
      });
      const releaseOpenings = createDeferredPromise();
      const submittedAll = createDeferredPromise();
      const fetchResponse = harness.fetchMock.getMockImplementation();
      assert(fetchResponse, 'HTTP responder required');
      let submissions = 0;
      harness.fetchMock.mockImplementation(async (...args) => {
        const url = String(args[0]);
        if (url.endsWith('/openPack')) await releaseOpenings.promise;
        const result = await fetchResponse(...args);
        if (
          url.endsWith('/submitTransaction') &&
          ++submissions === memos.length
        )
          submittedAll.resolve();
        return result;
      });
      const memo = await harness.controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
        options: { quantity: memos.length, turbo: false },
      });

      const first = harness.controller.completePacks({
        account: ACCOUNT,
        memo,
      });
      const second = harness.controller.completePacks({
        account: ACCOUNT,
        memo: memos[1],
      });
      await submittedAll.promise;

      expect(harness.snapMock).toHaveBeenCalledTimes(memos.length);
      expect(
        Object.values(
          harness.controller.state.packPartner.operations[ACCOUNT.address],
        ).every((operation) => operation.status !== 'opened'),
      ).toBe(true);
      expect(getRequests(harness, '/openPack')).toHaveLength(4);
      releaseOpenings.resolve();
      await Promise.all([first, second]);
      expect(
        Object.values(
          harness.controller.state.packPartner.operations[ACCOUNT.address],
        ).every(
          (operation) =>
            operation.status === 'opened' &&
            operation.batchId === 'large-batch' &&
            operation.result?.batchId === 'large-batch',
        ),
      ).toBe(true);
      expect(submissions).toBe(5);
    });

    it('opens an already paid pack while another payment still waits for confirmation', async () => {
      const secondMemo = `${MEMO}-second`;
      const harness = setup({
        respond: (url) =>
          url.endsWith('/generateYoloPacks')
            ? {
                body: {
                  yoloId: 'batch',
                  count: 2,
                  transactions: [MEMO, secondMemo].map((memo) => ({
                    memo,
                    transaction: PURCHASE_TRANSACTION,
                  })),
                },
              }
            : undefined,
      });
      const releasePayment = createDeferredPromise();
      const opened = createDeferredPromise();
      const fetchResponse = harness.fetchMock.getMockImplementation();
      assert(fetchResponse, 'HTTP responder required');
      let submissions = 0;
      harness.fetchMock.mockImplementation(async (...args) => {
        const url = String(args[0]);
        if (url.endsWith('/submitTransaction') && ++submissions === 2)
          await releasePayment.promise;
        const response = await fetchResponse(...args);
        if (url.endsWith('/openPack')) opened.resolve();
        return response;
      });
      const memo = await harness.controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
        options: { quantity: 2, turbo: false },
      });

      const purchase = harness.controller.completePacks({
        account: ACCOUNT,
        memo,
      });
      await opened.promise;
      expect(submissions).toBe(2);
      expect(getOperation(harness, secondMemo)?.status).toBe('submitted');
      releasePayment.resolve();
      await purchase;

      expect(getOperation(harness, secondMemo)?.status).toBe('opened');
    });

    it('supports Turbo for one pack without requesting a batch', async () => {
      const harness = setup({
        respond: (url) =>
          url.endsWith('/openPack')
            ? {
                body: {
                  ...openPackAwarded,
                  rarity: 'Common',
                  code: 'TURBO_MODE_BUYBACK',
                  buybackAmount: '11050000',
                },
              }
            : undefined,
      });

      const memo = await harness.controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
        options: { quantity: 1, turbo: true },
      });
      await harness.controller.completePacks({ account: ACCOUNT, memo });

      expect(harness.fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/generatePack'),
        expect.objectContaining({
          body: JSON.stringify({
            playerAddress: ACCOUNT.address,
            packType: PACK.code,
            turbo: true,
          }),
        }),
      );
      expect(getOperation(harness, memo)?.result).toMatchObject({
        mint: CARD_MINT,
        buyback: { status: 'unavailable' },
        sale: { status: 'completed', automatic: true, amount: '11050000' },
      });
    });

    it('does not record an award or a completed Turbo sale without the payout amount', async () => {
      const harness = setup({
        respond: (url) =>
          url.endsWith('/openPack')
            ? {
                body: {
                  ...openPackAwarded,
                  rarity: 'Common',
                  code: 'TURBO_MODE_BUYBACK',
                  buybackAmount: undefined,
                },
              }
            : undefined,
      });
      const memo = await harness.controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
        options: { quantity: 1, turbo: true },
      });

      await expect(
        harness.controller.completePacks({ account: ACCOUNT, memo }),
      ).rejects.toMatchObject({ code: 'OPEN_PENDING' });

      const operation = getOperation(harness, memo);
      expect(operation?.status).toBe('paid');
      expect(operation?.result).toBeUndefined();
      expect(operation?.mint).toBeUndefined();
    });

    it.each([0, -1, 6, 101, 1.5])(
      'rejects quantity %s before HTTP or signing',
      async (quantity) => {
        const harness = setup();

        await expect(
          harness.controller.generatePack({
            account: ACCOUNT,
            pack: PACK,
            options: { quantity, turbo: false },
          }),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

        expect(harness.fetchMock).not.toHaveBeenCalled();
        expect(harness.snapMock).not.toHaveBeenCalled();
      },
    );

    it('retains an uncertain purchase even after an HTTP refusal', async () => {
      const harness = setup({
        respond: (url) => {
          if (url.endsWith('/submitTransaction')) {
            return { status: 400, body: { error: 'Blockhash not found' } };
          }
          if (url.includes('/pack/status?')) {
            return { body: UNPAID_PACK_STATUS };
          }
          return undefined;
        },
      });

      await expect(buyPack(harness)).rejects.toMatchObject({
        code: 'SUBMIT_FAILED',
        status: 400,
      });

      expect(getOperation(harness)).toMatchObject({
        status: 'submitted',
        error: { code: 'SUBMIT_FAILED' },
      });
      expect(getRequests(harness, '/openPack')).toHaveLength(0);
    });
  });

  describe('purchase recovery', () => {
    it('resumes an interrupted reveal after restart without buying the pack again', async () => {
      const harness = setup({
        respond: (url) =>
          url.endsWith('/openPack')
            ? { status: 503, body: { error: 'Temporarily unavailable' } }
            : undefined,
      });
      await expect(buyPack(harness)).rejects.toMatchObject({
        code: 'RATE_LIMITED',
      });
      const restored = setup({ state: toPersistedState(harness) });

      await restored.messenger.call(
        'CollectiblesController:recoverOperations',
        {
          address: ACCOUNT.address,
        },
      );

      expect(getOperation(restored)).toMatchObject({
        status: 'opened',
        mint: CARD_MINT,
        result: { mint: CARD_MINT, memo: MEMO },
      });
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(getRequests(restored, '/generatePack')).toHaveLength(0);
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
    });

    it('resumes a submitted purchase from its persisted projection by memo through its pack status, without paying twice', async () => {
      const harness = setup();
      const submitStarted = createDeferredPromise();
      const releaseSubmit = createDeferredPromise();
      const fetchResponse = harness.fetchMock.getMockImplementation();
      assert(fetchResponse, 'The harness must provide an HTTP responder');
      harness.fetchMock.mockImplementation(async (...args) => {
        if (String(args[0]).endsWith('/submitTransaction')) {
          submitStarted.resolve();
          await releaseSubmit.promise;
          throw new TypeError('Network request failed');
        }
        return fetchResponse(...args);
      });
      const purchase = buyPack(harness);
      await submitStarted.promise;
      // Restore the metadata projection while submission is still in flight; no disk-flush guarantee is asserted.
      const onDisk = toPersistedState(harness);
      const restored = setup({
        state: onDisk,
        respond: (url) => {
          if (url.endsWith('/openPack')) {
            return { status: 400, body: { error: 'Cannot open pack' } };
          }
          if (url.includes('/pack/status?')) {
            return { body: DELIVERED_PACK_STATUS };
          }
          return undefined;
        },
      });

      await restored.controller.recoverOperations({ address: ACCOUNT.address });

      expect(onDisk.packPartner.operations[ACCOUNT.address][MEMO]).toEqual({
        memo: MEMO,
        packCode: PACK.code,
        packName: PACK.name,
        price: PACK.price,
        priceAmount: PACK.priceAmount,
        status: 'submitted',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
      expect(JSON.stringify(onDisk)).not.toContain(SIGNED_PURCHASE);
      expect(getOperation(restored)).toMatchObject({
        status: 'opened',
        mint: DELIVERED_MINT,
        result: { mint: DELIVERED_MINT, memo: MEMO },
      });
      expect(restored.fetchMock).toHaveBeenCalledWith(
        `${restored.apiUrl}/pack/status?memo=${MEMO}`,
        expect.anything(),
      );
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
      expect(getRequests(restored, '/generatePack')).toHaveLength(0);
      releaseSubmit.resolve();
      await expect(purchase).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    });

    it('resumes a persisted submitted purchase when the wallet unlocks', async () => {
      const harness = setup({
        respond: (url) =>
          url.endsWith('/submitTransaction')
            ? { status: 500, body: { error: 'Response lost' } }
            : undefined,
      });
      await expect(buyPack(harness)).rejects.toMatchObject({
        code: 'SUBMIT_FAILED',
      });
      const restored = setup({ state: toPersistedState(harness) });
      const opened = waitForOperation(restored, MEMO, 'opened');

      restored.messenger.publish('KeyringController:unlock');
      const operation = await opened;
      await restored.controller.recoverOperations({ address: ACCOUNT.address });

      expect(getOperation(harness)?.status).toBe('submitted');
      expect(operation).toMatchObject({ status: 'opened', mint: CARD_MINT });
      expect(restored.fetchMock).toHaveBeenCalledWith(
        `${restored.apiUrl}/openPack`,
        expect.objectContaining({ body: JSON.stringify({ memo: MEMO }) }),
      );
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
      expect(getRequests(restored, '/generatePack')).toHaveLength(0);
    });

    it('records an attempted payment before HTTP and keeps it recoverable within the opening window', async () => {
      const harness = setup({
        now: () => CREATED_AT,
        respond: (url) => {
          if (url.endsWith('/submitTransaction')) {
            return { status: 500, body: { error: 'Response lost' } };
          }
          if (url.includes('/pack/status?')) {
            return { body: UNPAID_PACK_STATUS };
          }
          return undefined;
        },
      });
      const submitStarted = createDeferredPromise();
      const releaseSubmit = createDeferredPromise();
      const fetchResponse = harness.fetchMock.getMockImplementation();
      assert(fetchResponse, 'The harness must provide an HTTP responder');
      harness.fetchMock.mockImplementation(async (...args) => {
        if (String(args[0]).endsWith('/submitTransaction')) {
          submitStarted.resolve();
          await releaseSubmit.promise;
        }
        return fetchResponse(...args);
      });
      const purchase = buyPack(harness);
      await submitStarted.promise;
      const saved = toPersistedState(harness);
      releaseSubmit.resolve();
      await expect(purchase).rejects.toMatchObject({ code: 'SUBMIT_FAILED' });
      let awardReady = false;
      const restored = setup({
        state: saved,
        now: () => WITHIN_OPEN_WINDOW,
        respond: (url) => {
          if (url.endsWith('/openPack') && !awardReady) {
            return { status: 400, body: { error: 'Cannot open pack' } };
          }
          if (url.includes('/pack/status?')) {
            return { body: UNPAID_PACK_STATUS };
          }
          return undefined;
        },
      });

      await restored.controller.recoverOperations({ address: ACCOUNT.address });

      expect(saved.packPartner.operations[ACCOUNT.address][MEMO].status).toBe(
        'submitted',
      );
      expect(JSON.stringify(saved)).not.toContain(SIGNED_PURCHASE);
      expect(getOperation(restored)).toMatchObject({
        status: 'submitted',
        error: { code: 'OPEN_PENDING' },
      });
      restored.controller.dismissOperation({ account: ACCOUNT, memo: MEMO });
      expect(getOperation(restored)).toBeDefined();
      awardReady = true;
      await restored.controller.recoverOperations({ address: ACCOUNT.address });
      expect(getOperation(restored)?.status).toBe('opened');
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
    });

    it('expires a submitted purchase whose pack status stays unpaid after the opening window', async () => {
      const harness = setup({
        now: () => CREATED_AT,
        respond: (url) => {
          if (url.endsWith('/submitTransaction')) {
            return { status: 500, body: { error: 'Response lost' } };
          }
          if (url.includes('/pack/status?')) {
            return { body: UNPAID_PACK_STATUS };
          }
          return undefined;
        },
      });
      await expect(buyPack(harness)).rejects.toMatchObject({
        code: 'SUBMIT_FAILED',
      });
      const restored = setup({
        state: toPersistedState(harness),
        now: () => PAST_OPEN_WINDOW,
        respond: (url) =>
          url.includes('/pack/status?')
            ? { body: UNPAID_PACK_STATUS }
            : undefined,
      });

      await restored.controller.recoverOperations({ address: ACCOUNT.address });

      expect(getOperation(harness)?.status).toBe('submitted');
      expect(getOperation(restored)).toMatchObject({
        status: 'expired',
        error: { code: 'PACK_EXPIRED' },
      });
      expect(restored.fetchMock).toHaveBeenCalledWith(
        `${restored.apiUrl}/pack/status?memo=${MEMO}`,
        expect.anything(),
      );
      expect(getRequests(restored, '/openPack')).toHaveLength(0);
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
    });

    it.each(['confirmed', 'finalized'] as const)(
      'keeps a %s payment paid after the opening window until its pack status reports delivery',
      async (confirmationStatus) => {
        const harness = setup({
          now: () => CREATED_AT,
          respond: (url) => {
            if (url.endsWith('/submitTransaction')) {
              return {
                body: { signature: 'purchase-signature', confirmationStatus },
              };
            }
            if (url.endsWith('/openPack')) {
              return {
                status: 503,
                body: { error: 'Temporarily unavailable' },
              };
            }
            return undefined;
          },
        });
        await expect(buyPack(harness)).rejects.toMatchObject({
          code: 'RATE_LIMITED',
        });
        let delivered = false;
        const restored = setup({
          state: toPersistedState(harness),
          now: () => PAST_OPEN_WINDOW,
          respond: (url) =>
            url.includes('/pack/status?')
              ? { body: delivered ? DELIVERED_PACK_STATUS : PAID_PACK_STATUS }
              : undefined,
        });

        await restored.controller.recoverOperations({
          address: ACCOUNT.address,
        });

        expect(getOperation(harness)?.status).toBe('paid');
        expect(getOperation(restored)).toMatchObject({
          status: 'paid',
          error: { code: 'OPEN_PENDING' },
        });
        delivered = true;
        await restored.controller.recoverOperations({
          address: ACCOUNT.address,
        });
        expect(getOperation(restored)).toMatchObject({
          status: 'opened',
          mint: DELIVERED_MINT,
          result: { mint: DELIVERED_MINT },
        });
        expect(getRequests(restored, '/openPack')).toHaveLength(0);
        expect(restored.snapMock).not.toHaveBeenCalled();
        expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
        expect(getRequests(restored, '/generatePack')).toHaveLength(0);
      },
    );

    it('keeps a confirmed payment paid after the opening window while its pack status still reports it unpaid', async () => {
      const harness = setup({
        now: () => CREATED_AT,
        respond: (url) => {
          if (url.endsWith('/submitTransaction')) {
            return {
              body: {
                signature: 'purchase-signature',
                confirmationStatus: 'confirmed',
              },
            };
          }
          if (url.endsWith('/openPack')) {
            return { status: 503, body: { error: 'Temporarily unavailable' } };
          }
          return undefined;
        },
      });
      await expect(buyPack(harness)).rejects.toMatchObject({
        code: 'RATE_LIMITED',
      });
      const restored = setup({
        state: toPersistedState(harness),
        now: () => PAST_OPEN_WINDOW,
        respond: (url) =>
          url.includes('/pack/status?')
            ? { body: UNPAID_PACK_STATUS }
            : undefined,
      });

      await restored.controller.recoverOperations({ address: ACCOUNT.address });

      expect(getOperation(harness)?.status).toBe('paid');
      expect(getOperation(restored)).toMatchObject({
        status: 'paid',
        error: { code: 'OPEN_PENDING' },
      });
      expect(restored.fetchMock).toHaveBeenCalledWith(
        `${restored.apiUrl}/pack/status?memo=${MEMO}`,
        expect.anything(),
      );
      expect(getRequests(restored, '/openPack')).toHaveLength(0);
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
    });

    it('resumes a legacy signed purchase by memo with a price amount derived from its price, without submitting its saved bytes', async () => {
      const state = getDefaultCollectiblesControllerState();
      state.packPartner.operations[ACCOUNT.address] = {
        [MEMO]: {
          memo: MEMO,
          packCode: PACK.code,
          packName: PACK.name,
          price: PACK.price,
          status: 'signed',
          signature: 'purchase-signature',
          signedTransaction: SIGNED_PURCHASE,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        } as unknown as CollectiblesPackOperation,
      };
      const restored = setup({ state, now: () => CREATED_AT + 1000 });
      const migrated = getOperation(restored);

      await restored.controller.recoverOperations({ address: ACCOUNT.address });

      expect(migrated).toStrictEqual({
        memo: MEMO,
        packCode: PACK.code,
        packName: PACK.name,
        price: PACK.price,
        priceAmount: PACK.priceAmount,
        status: 'submitted',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      });
      expect(getOperation(restored)?.status).toBe('opened');
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
      expect(getRequests(restored, '/generatePack')).toHaveLength(0);
      expect(JSON.stringify(toPersistedState(restored))).not.toContain(
        SIGNED_PURCHASE,
      );
    });
  });

  describe('buybacks', () => {
    it.each(['core', 'cnft-core'] as const)(
      'sells a %s card after a fresh offer check and refreshes the owned-card and offer reads',
      async (nftStandard) => {
        let sold = false;
        const harness = setup({
          respond: (url, init) => {
            if (
              url.endsWith('/submitTransaction') &&
              init?.body === JSON.stringify({ signedTransaction: SIGNED_SALE })
            ) {
              sold = true;
              return undefined;
            }
            if (url.includes('/cards/')) {
              return {
                body: {
                  nextCursor: null,
                  filterNFtCard: sold
                    ? []
                    : [{ ...walletCard(CARD_MINT), nftStandard }],
                },
              };
            }
            if (url.includes('/buyback/available?') && sold) {
              return { body: { available: false } };
            }
            return undefined;
          },
        });
        const owned = await harness.messenger.call(
          'PackPartnerDataService:getOwnedCards',
          PACK_PARTNER_ENVIRONMENT,
          ACCOUNT.address,
        );
        const shownOffer = await harness.messenger.call(
          'PackPartnerDataService:getBuybackOffer',
          PACK_PARTNER_ENVIRONMENT,
          CARD_MINT,
        );
        const cardsRefreshed = waitForCachedData<CollectiblesCard[]>(
          harness,
          ownedCardsKey,
          (cards) => cards.length === 0,
        );
        const offerRefreshed = waitForCachedData<CollectiblesBuyback>(
          harness,
          offerKey,
          (offer) => offer.status === 'unavailable',
        );

        const sale = await harness.messenger.call(
          'CollectiblesController:sellCard',
          {
            account: ACCOUNT,
            mint: owned[0].mint,
            expectedAmount: SALE_AMOUNT,
            nftStandard: owned[0].nftStandard,
          },
        );
        await Promise.all([cardsRefreshed, offerRefreshed]);

        expect(owned).toEqual([
          expect.objectContaining({
            mint: CARD_MINT,
            nftStandard,
            buyback: { status: 'unknown' },
          }),
        ]);
        expect(shownOffer).toStrictEqual({
          status: 'available',
          amount: SALE_AMOUNT,
        });
        expect(sale).toStrictEqual({
          mint: CARD_MINT,
          amount: SALE_AMOUNT,
          signature: 'sale-signature',
        });
        expect(
          harness.controller.state.packPartner.sales[ACCOUNT.address][
            CARD_MINT
          ],
        ).toMatchObject({
          status: 'completed',
          amount: SALE_AMOUNT,
          signature: 'sale-signature',
          submissionAttempted: true,
        });
        expect(harness.snapMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              method: 'signPackPartnerBuyback',
              params: expect.objectContaining({
                accountId: ACCOUNT.id,
                scope: PACK_PARTNER_SCOPE,
                transaction: SALE_TRANSACTION,
                context: {
                  amount: SALE_AMOUNT,
                  assetAddress: CARD_MINT,
                  expectedStandard: nftStandard,
                },
              }),
            }),
          }),
        );
        expect(harness.fetchMock).toHaveBeenCalledWith(
          `${harness.apiUrl}/submitTransaction`,
          expect.objectContaining({
            body: JSON.stringify({ signedTransaction: SIGNED_SALE }),
          }),
        );
        expect(getRequests(harness, '/cards/')).toHaveLength(2);
        // The offer read, the sale's fresh check, then the offer refresh.
        expect(getRequests(harness, '/buyback/available?')).toHaveLength(3);
        expect(
          JSON.stringify(harness.controller.state.packPartner.sales),
        ).not.toContain(SIGNED_SALE);
      },
    );

    it('never submits a cnft-core buyback when the Snap rejects its proof or transfer', async () => {
      const harness = setup({
        respond: (url) =>
          url.includes('/cards/')
            ? {
                body: {
                  nextCursor: null,
                  filterNFtCard: [
                    { ...walletCard(CARD_MINT), nftStandard: 'cnft-core' },
                  ],
                },
              }
            : undefined,
      });
      const [card] = await harness.messenger.call(
        'PackPartnerDataService:getOwnedCards',
        PACK_PARTNER_ENVIRONMENT,
        ACCOUNT.address,
      );
      harness.snapMock.mockRejectedValueOnce(
        new Error('Invalid compressed NFT proof'),
      );

      await expect(
        harness.messenger.call('CollectiblesController:sellCard', {
          account: ACCOUNT,
          mint: card.mint,
          expectedAmount: SALE_AMOUNT,
          nftStandard: card.nftStandard,
        }),
      ).rejects.toMatchObject({ code: 'SIGNING_REJECTED' });

      expect(harness.snapMock).toHaveBeenCalledTimes(1);
      expect(harness.snapMock).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'signPackPartnerBuyback',
            params: {
              accountId: ACCOUNT.id,
              scope: PACK_PARTNER_SCOPE,
              transaction: SALE_TRANSACTION,
              context: {
                amount: SALE_AMOUNT,
                assetAddress: CARD_MINT,
                expectedStandard: 'cnft-core',
              },
            },
          }),
        }),
      );
      expect(getRequests(harness, '/submitTransaction')).toHaveLength(0);
      expect(
        harness.controller.state.packPartner.sales[ACCOUNT.address]?.[
          CARD_MINT
        ],
      ).toBeUndefined();
    });

    it('signs nothing when the fresh offer check is below the cached offer the user confirmed', async () => {
      let offerDropped = false;
      const harness = setup({
        respond: (url) =>
          url.includes('/buyback/available?') && offerDropped
            ? { body: { available: true, amount: 40_000_000 } }
            : undefined,
      });
      const cached = await harness.messenger.call(
        'PackPartnerDataService:getBuybackOffer',
        PACK_PARTNER_ENVIRONMENT,
        CARD_MINT,
      );
      const offerRefreshed = waitForCachedData<CollectiblesBuyback>(
        harness,
        offerKey,
        (offer) => offer.amount === '40000000',
      );
      offerDropped = true;

      await expect(
        harness.controller.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ).rejects.toMatchObject({ code: 'OFFER_CHANGED' });
      const refreshed = await offerRefreshed;

      expect(cached).toStrictEqual({
        status: 'available',
        amount: SALE_AMOUNT,
      });
      expect(refreshed).toStrictEqual({
        status: 'available',
        amount: '40000000',
      });
      expect(harness.snapMock).not.toHaveBeenCalled();
      expect(
        harness.fetchMock.mock.calls.filter(
          ([url]) => new URL(String(url)).pathname === '/api/buyback',
        ),
      ).toHaveLength(0);
      expect(harness.controller.state.packPartner.sales).toStrictEqual({});
    });

    it.each(['-1', '0'])(
      'rejects a buyback with a non-positive confirmed amount of %s before creating or signing a transaction',
      async (expectedAmount) => {
        const harness = setup();

        await expect(
          harness.messenger.call('CollectiblesController:sellCard', {
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount,
          }),
        ).rejects.toMatchObject({ code: 'OFFER_CHANGED' });

        expect(harness.snapMock).not.toHaveBeenCalled();
        expect(
          harness.fetchMock.mock.calls.filter(
            ([url]) => new URL(String(url)).pathname === '/api/buyback',
          ),
        ).toHaveLength(0);
        expect(getRequests(harness, '/submitTransaction')).toHaveLength(0);
        expect(harness.controller.state.packPartner.sales).toStrictEqual({});
      },
    );

    it.each([
      { memo: '' },
      { memo: ' \n ' },
      { serializedTransaction: '' },
      { success: false },
    ])(
      'rejects a buyback response containing %j before signing',
      async (fields) => {
        const harness = setup({
          respond: (url) =>
            new URL(url).pathname === '/api/buyback'
              ? {
                  body: {
                    success: true,
                    serializedTransaction: SALE_TRANSACTION,
                    refundAmount: SALE_AMOUNT,
                    memo: MEMO,
                    ...fields,
                  },
                }
              : undefined,
        });

        await expect(
          harness.messenger.call('CollectiblesController:sellCard', {
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: SALE_AMOUNT,
          }),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

        expect(harness.snapMock).not.toHaveBeenCalled();
        expect(getRequests(harness, '/submitTransaction')).toHaveLength(0);
        expect(harness.controller.state.packPartner.sales).toStrictEqual({});
      },
    );

    it('signs no buyback whose refund dropped below the confirmed amount', async () => {
      const harness = setup({
        respond: (url) =>
          new URL(url).pathname === '/api/buyback'
            ? {
                body: {
                  success: true,
                  serializedTransaction: SALE_TRANSACTION,
                  refundAmount: 40_000_000,
                  memo: MEMO,
                },
              }
            : undefined,
      });

      await expect(
        harness.messenger.call('CollectiblesController:sellCard', {
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ).rejects.toMatchObject({ code: 'OFFER_CHANGED' });

      expect(harness.snapMock).not.toHaveBeenCalled();
      expect(getRequests(harness, '/buyback/available?')).toHaveLength(1);
      expect(harness.controller.state.packPartner.sales).toStrictEqual({});
      expect(getRequests(harness, '/submitTransaction')).toHaveLength(0);
    });

    it('passes an unknown standard to the Snap when the caller gives none', async () => {
      const harness = setup();

      await harness.controller.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(harness.snapMock).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'signPackPartnerBuyback',
            params: expect.objectContaining({
              context: expect.objectContaining({ expectedStandard: 'unknown' }),
            }),
          }),
        }),
      );
    });

    it('keeps completed bulk sales and retries only unsold cards after a signing rejection', async () => {
      const harness = setup();
      const mints = [CARD_MINT, OTHER_MINT, DELIVERED_MINT];
      harness.snapMock
        .mockResolvedValueOnce({
          signedTransaction: SIGNED_SALE,
          signature: 'first-sale',
        })
        .mockRejectedValueOnce(new Error('rejected'));
      const cards = mints.map((mint) => ({
        mint,
        expectedAmount: SALE_AMOUNT,
      }));

      await expect(
        harness.controller.sellCards({ account: ACCOUNT, cards }),
      ).rejects.toBeDefined();

      const sales = harness.controller.state.packPartner.sales[ACCOUNT.address];
      expect(sales[mints[0]]?.status).toBe('completed');
      expect(sales[mints[1]]).toBeUndefined();
      expect(sales[mints[2]]).toBeUndefined();
      expect(harness.snapMock).toHaveBeenCalledTimes(2);
      await harness.controller.sellCards({ account: ACCOUNT, cards });
      expect(harness.snapMock).toHaveBeenCalledTimes(4);
      expect(
        mints.every(
          (mint) =>
            harness.controller.state.packPartner.sales[ACCOUNT.address][mint]
              ?.status === 'completed',
        ),
      ).toBe(true);
    });

    it('keeps a submitted buyback pending and reconciles it after restart without signing again', async () => {
      const harness = setup({
        now: () => CREATED_AT,
        respond: (url, init) => {
          if (
            url.endsWith('/submitTransaction') &&
            init?.body === JSON.stringify({ signedTransaction: SIGNED_SALE })
          ) {
            return {
              body: {
                success: true,
                signature: 'sale-signature',
                confirmationStatus: 'submitted',
              },
            };
          }
          if (url.includes('/buyback/check?')) {
            return { body: { exists: true, status: '' } };
          }
          return undefined;
        },
      });

      await expect(
        harness.messenger.call('CollectiblesController:sellCard', {
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });

      const persisted = toPersistedState(harness);
      expect(
        persisted.packPartner.sales[ACCOUNT.address][CARD_MINT],
      ).toStrictEqual({
        mint: CARD_MINT,
        memo: MEMO,
        status: 'pending',
        amount: SALE_AMOUNT,
        submissionAttempted: true,
        signature: 'sale-signature',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      });
      expect(JSON.stringify(persisted)).not.toContain(SIGNED_SALE);
      let confirmed = false;
      const restored = setup({
        state: persisted,
        now: () => CREATED_AT + 3 * 60 * 60 * 1000,
        respond: (url) =>
          url.includes('/buyback/check?') && !confirmed
            ? { body: { exists: true, status: '' } }
            : undefined,
      });

      await restored.controller.recoverOperations({ address: ACCOUNT.address });
      expect(
        restored.controller.state.packPartner.sales[ACCOUNT.address][CARD_MINT]
          .status,
      ).toBe('pending');
      confirmed = true;
      await restored.messenger.call(
        'CollectiblesController:recoverOperations',
        {
          address: ACCOUNT.address,
        },
      );

      expect(
        restored.controller.state.packPartner.sales[ACCOUNT.address][CARD_MINT],
      ).toMatchObject({ status: 'completed', signature: 'sale-signature' });
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(restored.fetchMock).toHaveBeenCalledWith(
        `${restored.apiUrl}/buyback/check?memo=${MEMO}`,
        expect.anything(),
      );
      expect(getRequests(restored, '/submitTransaction')).toHaveLength(0);
    });

    it('forgets a pending buyback that never landed so a new sale can start', async () => {
      const harness = setup({
        respond: (url, init) => {
          if (
            url.endsWith('/submitTransaction') &&
            init?.body === JSON.stringify({ signedTransaction: SIGNED_SALE })
          ) {
            return { status: 502, body: { error: 'Bad gateway' } };
          }
          if (url.includes('/buyback/check?')) {
            return { body: { exists: true, status: '' } };
          }
          return undefined;
        },
      });
      await expect(
        harness.controller.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });
      const restored = setup({
        state: toPersistedState(harness),
        respond: (url) =>
          url.includes('/buyback/check?')
            ? { body: { exists: false, message: 'No buyback transaction' } }
            : undefined,
      });

      await restored.controller.recoverOperations({ address: ACCOUNT.address });
      const afterRecovery = restored.controller.state.packPartner.sales;
      const sale = await restored.controller.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(
        harness.controller.state.packPartner.sales[ACCOUNT.address][CARD_MINT],
      ).toMatchObject({ status: 'pending', submissionAttempted: true });
      expect(afterRecovery).toStrictEqual({});
      expect(sale).toMatchObject({ mint: CARD_MINT, amount: SALE_AMOUNT });
      expect(restored.snapMock).toHaveBeenCalledTimes(1);
      expect(
        restored.controller.state.packPartner.sales[ACCOUNT.address][CARD_MINT]
          .status,
      ).toBe('completed');
    });

    it('retries a pending sale from the card without signing or submitting again', async () => {
      let confirmed = false;
      const harness = setup({
        respond: (url, init) => {
          if (
            url.endsWith('/submitTransaction') &&
            init?.body === JSON.stringify({ signedTransaction: SIGNED_SALE })
          ) {
            return {
              body: {
                signature: 'sale-signature',
                confirmationStatus: 'submitted',
              },
            };
          }
          if (url.includes('/buyback/check?') && !confirmed) {
            return { body: { exists: true, status: '' } };
          }
          return undefined;
        },
      });
      await expect(
        harness.controller.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ).rejects.toMatchObject({ code: 'SALE_PENDING' });
      harness.snapMock.mockClear();
      harness.fetchMock.mockClear();

      await expect(
        harness.controller.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });
      confirmed = true;
      const sale = await harness.controller.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(sale).toStrictEqual({
        mint: CARD_MINT,
        amount: SALE_AMOUNT,
        signature: 'sale-signature',
      });
      expect(
        harness.controller.state.packPartner.sales[ACCOUNT.address][CARD_MINT]
          .status,
      ).toBe('completed');
      expect(harness.snapMock).not.toHaveBeenCalled();
      expect(getRequests(harness, '/submitTransaction')).toHaveLength(0);
      expect(getRequests(harness, '/buyback/available?')).toHaveLength(0);
    });

    it('checks a pending sale by memo without waiting on a submitted purchase', async () => {
      const purchase: CollectiblesPackOperation = {
        memo: MEMO,
        packCode: PACK.code,
        packName: PACK.name,
        price: PACK.price,
        priceAmount: PACK.priceAmount,
        status: 'submitted',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      };
      const pendingSale: CollectiblesBuybackOperation = {
        mint: CARD_MINT,
        memo: SALE_MEMO,
        status: 'pending',
        amount: SALE_AMOUNT,
        submissionAttempted: true,
        signature: 'sale-signature',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      };
      const state = getDefaultCollectiblesControllerState();
      state.packPartner = {
        operations: { [ACCOUNT.address]: { [MEMO]: purchase } },
        sales: { [ACCOUNT.address]: { [CARD_MINT]: pendingSale } },
      };
      const harness = setup({ state, now: () => WITHIN_OPEN_WINDOW });

      await harness.messenger.call('CollectiblesController:checkSales', {
        address: ACCOUNT.address,
      });

      expect(
        harness.controller.state.packPartner.sales[ACCOUNT.address][CARD_MINT],
      ).toStrictEqual({
        ...pendingSale,
        status: 'completed',
        updatedAt: WITHIN_OPEN_WINDOW,
      });
      expect(getOperation(harness)).toStrictEqual(purchase);
      expect(harness.fetchMock).toHaveBeenCalledWith(
        `${harness.apiUrl}/buyback/check?memo=${SALE_MEMO}`,
        expect.anything(),
      );
      expect(getRequests(harness, '/buyback/check?')).toHaveLength(1);
      expect(getRequests(harness, '/openPack')).toHaveLength(0);
      expect(getRequests(harness, '/pack/status?')).toHaveLength(0);
      expect(harness.snapMock).not.toHaveBeenCalled();
      expect(getRequests(harness, '/submitTransaction')).toHaveLength(0);
    });

    it('replaces an unused buyback quote after interruption before signing', async () => {
      const harness = setup();
      const signingStarted = createDeferredPromise();
      const releaseSigning = createDeferredPromise();
      harness.snapMock.mockImplementationOnce(async () => {
        signingStarted.resolve();
        await releaseSigning.promise;
        return { signedTransaction: SIGNED_SALE, signature: 'sale-signature' };
      });
      const sale = harness.controller.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });
      await signingStarted.promise;
      const saved = toPersistedState(harness);
      await harness.resetWallet();
      releaseSigning.resolve();
      await expect(sale).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const restored = setup({
        state: saved,
        respond: (url) =>
          url.includes('/buyback/check?')
            ? { body: { exists: true, status: '' } }
            : undefined,
      });

      const result = await restored.controller.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(saved.packPartner.sales[ACCOUNT.address][CARD_MINT]).toMatchObject(
        { status: 'pending', submissionAttempted: false },
      );
      expect(result.signature).toBe('sale-signature');
      expect(
        restored.controller.state.packPartner.sales[ACCOUNT.address][CARD_MINT]
          .status,
      ).toBe('completed');
      expect(restored.snapMock).toHaveBeenCalledTimes(1);
      expect(getRequests(restored, '/buyback/check?')).toHaveLength(0);
    });
  });

  describe('UI refresh', () => {
    beforeEach(() => {
      // The global test setup pins `Date.now`: the UI hydrates only an entry
      // newer than its own read, and the background cache collects entries
      // on timers.
      jest.useFakeTimers({ advanceTimers: true, now: CREATED_AT });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('refreshes a UI observer of the owned cards after an award even once the background entry was collected', async () => {
      let delivered = false;
      const harness = setup({
        respond: (url) =>
          url.includes('/cards/')
            ? {
                body: {
                  nextCursor: null,
                  filterNFtCard: delivered
                    ? [walletCard(CARD_MINT), walletCard(OTHER_MINT)]
                    : [walletCard(OTHER_MINT)],
                },
              }
            : undefined,
      });
      const cacheEvents: string[] = [];
      harness.messenger.subscribe(
        `PackPartnerDataService:cacheUpdated:${hashKey(ownedCardsKey)}`,
        ({ type }) => cacheEvents.push(type),
      );
      const observer = new QueryObserver<CollectiblesCard[]>(harness.ui, {
        queryKey: ownedCardsKey,
        retry: false,
      });
      const stopObserving = observer.subscribe(() => undefined);
      const shownMints = () =>
        observer.getCurrentResult().data?.map(({ mint }) => mint) ?? [];
      await waitFor(() => shownMints().length === 1);
      const shownBefore = shownMints();
      // Nothing observes the background entry: past its gcTime it is collected.
      jest.advanceTimersByTime(BACKGROUND_GC_TIME + 1);
      await waitFor(() => cacheEvents.includes('removed'));
      delivered = true;

      await buyPack(harness);
      await waitFor(() => shownMints().includes(CARD_MINT));
      stopObserving();

      expect(shownBefore).toEqual([OTHER_MINT]);
      expect([...shownMints()].sort()).toEqual([CARD_MINT, OTHER_MINT].sort());
      expect(getRequests(harness, '/cards/')).toHaveLength(2);
      expect(observer.getCurrentResult().isError).toBe(false);
    });
  });

  describe('wallet reset', () => {
    it('discards a generated pack when the wallet resets during its HTTP request', async () => {
      const harness = setup();
      const release = createDeferredPromise();
      const fetchResponse = harness.fetchMock.getMockImplementation();
      assert(fetchResponse, 'The harness must provide an HTTP responder');
      harness.fetchMock.mockImplementationOnce(async (...args) => {
        await release.promise;
        return fetchResponse(...args);
      });

      const purchase = harness.controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
      });
      await harness.resetWallet();
      release.resolve();

      await expect(purchase).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(harness.controller.state).toEqual(
        getDefaultCollectiblesControllerState(),
      );
      expect(harness.snapMock).not.toHaveBeenCalled();
    });

    it.each(['purchase', 'sale'] as const)(
      'stops a %s before submission when the wallet resets during signing',
      async (flow) => {
        const harness = setup();
        const signed = createDeferredPromise();
        const signingStarted = createDeferredPromise();
        harness.snapMock.mockImplementationOnce(async () => {
          signingStarted.resolve();
          await signed.promise;
          return { signedTransaction: SIGNED_PURCHASE, signature: 'signature' };
        });
        const transaction =
          flow === 'sale'
            ? harness.controller.sellCard({
                account: ACCOUNT,
                mint: CARD_MINT,
                expectedAmount: SALE_AMOUNT,
              })
            : buyPack(harness);
        await signingStarted.promise;

        await harness.resetWallet();
        signed.resolve();

        await expect(transaction).rejects.toMatchObject({
          code: 'NOT_FOUND',
        });
        expect(harness.controller.state).toEqual(
          getDefaultCollectiblesControllerState(),
        );
        expect(getRequests(harness, '/submitTransaction')).toHaveLength(0);
      },
    );
  });
});
