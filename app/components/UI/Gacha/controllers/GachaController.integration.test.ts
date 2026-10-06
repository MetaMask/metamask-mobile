/** Real Gacha controller, CollectorCrypt provider, HTTP services and Snap adapter across purchase and buyback flows. */
import { SolScope } from '@metamask/keyring-api';
import { HandlerType } from '@metamask/snaps-utils';
import { assert, createDeferredPromise } from '@metamask/utils';
import { getPersistentState } from '../../../../store/getPersistentState/getPersistentState';
import {
  buybackAvailable,
  nftApiCoreItem,
  packStatusUnknown,
} from '../providers/collector-crypt/services/api.fixtures';
import {
  ACCOUNT,
  buildCollectorCryptIntegrationHarness,
  CARD_MINT,
  MEMO,
  PACK,
  PURCHASE_TRANSACTION,
  SALE_TRANSACTION,
  SIGNED_PURCHASE,
  SIGNED_SALE,
} from '../../../../../tests/integration/harnesses/collector-crypt/collector-crypt';
import type { GachaControllerState } from './GachaController';

type Harness = ReturnType<typeof buildCollectorCryptIntegrationHarness>;

const SALE_AMOUNT = String(buybackAvailable.amount);

/**
 * What a restart reads back: the state projected by the `persist` metadata,
 * exactly as the Engine writes it to disk.
 *
 * @param harness - Running harness.
 * @returns The persisted state.
 */
const toPersistedState = ({ controller }: Harness): GachaControllerState =>
  JSON.parse(
    JSON.stringify(getPersistentState(controller.state, controller.metadata)),
  );

describe('CollectorCrypt purchase and buyback integration', () => {
  const harnesses: Harness[] = [];
  const setup = (
    options?: Parameters<typeof buildCollectorCryptIntegrationHarness>[0],
  ) => {
    const harness = buildCollectorCryptIntegrationHarness(options);
    harnesses.push(harness);
    return harness;
  };
  const buyPack = async ({ messenger }: Harness) => {
    const memo = await messenger.call('GachaController:generatePack', {
      account: ACCOUNT,
      pack: PACK,
    });
    return messenger.call('GachaController:completePack', {
      account: ACCOUNT,
      memo,
    });
  };

  afterEach(() => {
    harnesses.splice(0).forEach((harness) => harness.cleanup());
  });

  it('keeps onboarding complete when synchronizing cards for different accounts', async () => {
    const harness = setup();
    harness.messenger.call('GachaController:completeOnboarding');
    const secondAccount = {
      id: 'second-solana-account',
      address: 'H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1',
    };

    await harness.messenger.call('GachaController:syncCards', {
      account: ACCOUNT,
    });
    await harness.messenger.call('GachaController:syncCards', {
      account: secondAccount,
    });

    expect(harness.controller.state.hasCompletedOnboarding).toBe(true);
    expect(Object.keys(harness.controller.state.collectorCrypt.cards)).toEqual([
      ACCOUNT.address,
      secondAccount.address,
    ]);
  });

  it('buys a public pack and reveals the card through the API and Snap adapters', async () => {
    const harness = setup();
    const packs = await harness.messenger.call('GachaController:getPacks');

    const card = await buyPack(harness);

    expect(packs.map((pack) => pack.code)).toEqual([PACK.code]);
    expect(card).toMatchObject({
      mint: CARD_MINT,
      memo: MEMO,
      rarity: 'common',
      buyback: { status: 'available', amount: '42500000' },
    });
    expect(
      harness.controller.state.collectorCrypt.operations[ACCOUNT.address][MEMO]
        .status,
    ).toBe('opened');
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
          method: 'signTransaction',
          params: {
            accountId: ACCOUNT.id,
            transaction: PURCHASE_TRANSACTION,
            scope: SolScope.Mainnet,
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
  });

  it('removes a card after a confirmed buyback even while the NFT indexer is stale', async () => {
    const harness = setup();
    await buyPack(harness);

    const sale = await harness.messenger.call('GachaController:sellCard', {
      account: ACCOUNT,
      mint: CARD_MINT,
      expectedAmount: SALE_AMOUNT,
    });
    const cards = await harness.messenger.call('GachaController:syncCards', {
      account: ACCOUNT,
    });

    expect(sale).toMatchObject({
      amount: '42500000',
      signature: 'sale-signature',
    });
    expect(cards).toEqual([]);
    expect(
      harness.controller.state.collectorCrypt.cards[ACCOUNT.address][CARD_MINT]
        .sale?.status,
    ).toBe('completed');
    expect(harness.snapMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          params: expect.objectContaining({ transaction: SALE_TRANSACTION }),
        }),
      }),
    );
    expect(harness.fetchMock).toHaveBeenCalledWith(
      `${harness.apiUrl}/submitTransaction`,
      expect.objectContaining({
        body: JSON.stringify({ signedTransaction: SIGNED_SALE }),
      }),
    );
  });

  it('keeps a submitted buyback pending and reconciles it after restart without signing again', async () => {
    const createdAt = Date.parse('2026-09-29T12:00:00.000Z');
    const harness = setup({
      now: () => createdAt,
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
    await buyPack(harness);

    await expect(
      harness.messenger.call('GachaController:sellCard', {
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      }),
    ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });

    expect(
      harness.controller.state.collectorCrypt.cards[ACCOUNT.address][CARD_MINT]
        .sale,
    ).toMatchObject({
      status: 'pending',
      signedTransaction: SIGNED_SALE,
      signature: 'sale-signature',
      submissionAttempted: true,
    });
    let confirmed = false;
    const restored = setup({
      state: toPersistedState(harness),
      now: () => createdAt + 3 * 60 * 60 * 1000,
      respond: (url) =>
        url.includes('/buyback/check?') && !confirmed
          ? { body: { exists: false } }
          : undefined,
    });

    const pendingCards = await restored.controller.syncCards({
      account: ACCOUNT,
    });
    expect(pendingCards[0]?.sale).toMatchObject({
      status: 'pending',
      signedTransaction: SIGNED_SALE,
      submissionAttempted: true,
    });
    confirmed = true;
    const cards = await restored.messenger.call('GachaController:syncCards', {
      account: ACCOUNT,
    });

    expect(cards).toEqual([]);
    expect(
      restored.controller.state.collectorCrypt.cards[ACCOUNT.address][CARD_MINT]
        .sale?.status,
    ).toBe('completed');
    expect(restored.snapMock).not.toHaveBeenCalled();
    expect(restored.fetchMock).toHaveBeenCalledWith(
      `${restored.apiUrl}/buyback/check?memo=${MEMO}`,
      expect.anything(),
    );
    expect(restored.fetchMock).not.toHaveBeenCalledWith(
      `${restored.apiUrl}/submitTransaction`,
      expect.anything(),
    );
  });

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
    const restored = setup({
      state: toPersistedState(harness),
    });

    await restored.messenger.call('GachaController:recoverOperations', {
      account: ACCOUNT,
    });

    expect(
      restored.controller.state.collectorCrypt.operations[ACCOUNT.address][MEMO]
        .status,
    ).toBe('opened');
    expect(
      restored.controller.state.collectorCrypt.cards[ACCOUNT.address][
        CARD_MINT
      ],
    ).toMatchObject({ mint: CARD_MINT, memo: MEMO });
    expect(restored.snapMock).not.toHaveBeenCalled();
    expect(restored.fetchMock).not.toHaveBeenCalledWith(
      `${restored.apiUrl}/generatePack`,
      expect.anything(),
    );
    expect(restored.fetchMock).not.toHaveBeenCalledWith(
      `${restored.apiUrl}/submitTransaction`,
      expect.anything(),
    );
  });

  it('checks a pending sale from the card without signing or submitting again', async () => {
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
    await buyPack(harness);
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
      harness.controller.refreshBuyback({ account: ACCOUNT, mint: CARD_MINT }),
    ).rejects.toMatchObject({ code: 'SALE_PENDING' });
    confirmed = true;
    await harness.controller.refreshBuyback({
      account: ACCOUNT,
      mint: CARD_MINT,
    });

    expect(
      harness.controller.state.collectorCrypt.cards[ACCOUNT.address][CARD_MINT]
        .sale?.status,
    ).toBe('completed');
    expect(harness.snapMock).not.toHaveBeenCalled();
    expect(harness.fetchMock).not.toHaveBeenCalledWith(
      `${harness.apiUrl}/submitTransaction`,
      expect.anything(),
    );
  });

  it.each(['confirmed', 'finalized'] as const)(
    'retains a %s payment after restart while the payment webhook is delayed',
    async (confirmationStatus) => {
      const createdAt = Date.parse('2026-09-29T12:00:00.000Z');
      const harness = setup({
        now: () => createdAt,
        respond: (url) => {
          if (url.endsWith('/submitTransaction')) {
            return {
              body: { signature: 'purchase-signature', confirmationStatus },
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
      expect(
        harness.controller.state.collectorCrypt.operations[ACCOUNT.address][
          MEMO
        ],
      ).toMatchObject({ status: 'paid', signature: 'purchase-signature' });
      let awardReady = false;
      const restored = setup({
        state: toPersistedState(harness),
        now: () => createdAt + 3 * 60 * 60 * 1000,
        respond: (url) => {
          if (url.endsWith('/openPack') && !awardReady) {
            return { status: 400, body: { error: 'Cannot open pack' } };
          }
          if (url.includes('/pack/status?')) {
            return { body: { ...packStatusUnknown, memo: MEMO } };
          }
          return undefined;
        },
      });

      await restored.controller.recoverOperations({ account: ACCOUNT });

      expect(
        restored.controller.state.collectorCrypt.operations[ACCOUNT.address][
          MEMO
        ],
      ).toMatchObject({ status: 'paid', error: { code: 'OPEN_PENDING' } });
      awardReady = true;
      await restored.controller.recoverOperations({ account: ACCOUNT });
      expect(
        restored.controller.state.collectorCrypt.operations[ACCOUNT.address][
          MEMO
        ].status,
      ).toBe('opened');
      expect(restored.snapMock).not.toHaveBeenCalled();
      expect(restored.fetchMock).not.toHaveBeenCalledWith(
        `${restored.apiUrl}/submitTransaction`,
        expect.anything(),
      );
      expect(restored.fetchMock).not.toHaveBeenCalledWith(
        `${restored.apiUrl}/generatePack`,
        expect.anything(),
      );
    },
  );

  it('records an attempted payment before HTTP and retains it after a lost response and restart', async () => {
    const createdAt = Date.parse('2026-09-29T12:00:00.000Z');
    const harness = setup({
      now: () => createdAt,
      respond: (url) => {
        if (url.endsWith('/submitTransaction')) {
          return { status: 500, body: { error: 'Response lost' } };
        }
        if (url.includes('/pack/status?')) {
          return { body: { ...packStatusUnknown, memo: MEMO } };
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
    expect(
      saved.collectorCrypt.operations[ACCOUNT.address][MEMO],
    ).toMatchObject({
      status: 'submitted',
      signedTransaction: SIGNED_PURCHASE,
      signature: 'purchase-signature',
    });
    releaseSubmit.resolve();
    await expect(purchase).rejects.toMatchObject({ code: 'SUBMIT_FAILED' });
    let awardReady = false;
    const restored = setup({
      state: saved,
      now: () => createdAt + 3 * 60 * 60 * 1000,
      respond: (url) => {
        if (url.endsWith('/openPack') && !awardReady) {
          return { status: 400, body: { error: 'Cannot open pack' } };
        }
        if (url.includes('/pack/status?')) {
          return { body: { ...packStatusUnknown, memo: MEMO } };
        }
        return undefined;
      },
    });

    await restored.controller.recoverOperations({ account: ACCOUNT });

    expect(
      restored.controller.state.collectorCrypt.operations[ACCOUNT.address][
        MEMO
      ],
    ).toMatchObject({
      status: 'submitted',
      signedTransaction: SIGNED_PURCHASE,
      signature: 'purchase-signature',
    });
    restored.controller.dismissOperation({ account: ACCOUNT, memo: MEMO });
    expect(
      restored.controller.state.collectorCrypt.operations[ACCOUNT.address][
        MEMO
      ],
    ).toBeDefined();
    awardReady = true;
    await restored.controller.recoverOperations({ account: ACCOUNT });
    expect(
      restored.controller.state.collectorCrypt.operations[ACCOUNT.address][MEMO]
        .status,
    ).toBe('opened');
    expect(restored.snapMock).not.toHaveBeenCalled();
    expect(restored.fetchMock).not.toHaveBeenCalledWith(
      `${restored.apiUrl}/submitTransaction`,
      expect.anything(),
    );
  });

  it('resumes a submitted purchase from its normal persisted projection without paying twice', async () => {
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
    // Simulate the normal Engine write while submission is still in flight.
    const onDisk = toPersistedState(harness);
    expect(
      onDisk.collectorCrypt.operations[ACCOUNT.address][MEMO],
    ).toMatchObject({
      status: 'submitted',
      signedTransaction: SIGNED_PURCHASE,
    });
    const restored = setup({ state: onDisk });

    await restored.controller.recoverOperations({ account: ACCOUNT });

    expect(
      restored.controller.state.collectorCrypt.operations[ACCOUNT.address][MEMO]
        .status,
    ).toBe('opened');
    expect(restored.snapMock).not.toHaveBeenCalled();
    expect(restored.fetchMock).not.toHaveBeenCalledWith(
      `${restored.apiUrl}/submitTransaction`,
      expect.anything(),
    );
    expect(restored.fetchMock).not.toHaveBeenCalledWith(
      `${restored.apiUrl}/generatePack`,
      expect.anything(),
    );
    releaseSubmit.resolve();
    await expect(purchase).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

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
    await buyPack(harness);
    harness.snapMock.mockClear();

    await expect(
      harness.messenger.call('GachaController:sellCard', {
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      }),
    ).rejects.toMatchObject({ code: 'OFFER_CHANGED' });

    expect(harness.snapMock).not.toHaveBeenCalled();
    expect(
      harness.controller.state.collectorCrypt.cards[ACCOUNT.address][CARD_MINT],
    ).toMatchObject({
      buyback: { status: 'available', amount: '40000000' },
    });
    expect(
      harness.controller.state.collectorCrypt.cards[ACCOUNT.address][CARD_MINT]
        .sale,
    ).toBeUndefined();
  });

  it('replaces an unused buyback quote after interruption before signing', async () => {
    const harness = setup();
    await buyPack(harness);
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
    expect(
      saved.collectorCrypt.cards[ACCOUNT.address][CARD_MINT].sale,
    ).toMatchObject({
      status: 'pending',
      submissionAttempted: false,
    });
    harness.controller.clearState();
    releaseSigning.resolve();
    await expect(sale).rejects.toThrow('CollectorCrypt wallet was reset');
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

    expect(result.signature).toBe('sale-signature');
    expect(
      restored.controller.state.collectorCrypt.cards[ACCOUNT.address][CARD_MINT]
        .sale?.status,
    ).toBe('completed');
    expect(restored.snapMock).toHaveBeenCalledTimes(1);
    expect(restored.fetchMock).not.toHaveBeenCalledWith(
      `${restored.apiUrl}/buyback/check?memo=${MEMO}`,
      expect.anything(),
    );
  });

  it('uses CollectorCrypt holdings when NFT metadata makes the indexer response incomplete', async () => {
    const harness = setup({
      respond: (url) => {
        if (url.includes('/solana-tokens')) {
          return {
            body: {
              items: [
                {
                  ...nftApiCoreItem,
                  token_address: CARD_MINT,
                  nft_token: { ...nftApiCoreItem.nft_token, image_url: 42 },
                },
              ],
            },
          };
        }
        if (url.includes('/cards/')) {
          return {
            body: {
              filterNFtCard: [
                { nftAddress: CARD_MINT, itemName: 'Owned card' },
              ],
            },
          };
        }
        return undefined;
      },
    });

    const cards = await harness.controller.syncCards({ account: ACCOUNT });

    expect(cards).toEqual([
      expect.objectContaining({
        mint: CARD_MINT,
        name: 'Owned card',
        source: 'collectorCryptApi',
      }),
    ]);
  });

  it('keeps a known card when its NFT metadata is null and CollectorCrypt holdings omit it', async () => {
    const harness = setup({
      state: {
        hasCompletedOnboarding: false,
        collectorCrypt: {
          operations: {},
          cards: {
            [ACCOUNT.address]: {
              [CARD_MINT]: {
                mint: CARD_MINT,
                name: 'Previously indexed card',
                acquiredAt: 1,
                source: 'nftApi',
                buyback: { status: 'unknown' },
              },
            },
          },
        },
      },
      respond: (url) =>
        url.includes('/solana-tokens')
          ? {
              body: {
                items: [
                  {
                    ...nftApiCoreItem,
                    token_address: CARD_MINT,
                    nft_token: null,
                  },
                ],
                cursor: null,
              },
            }
          : undefined,
    });

    const cards = await harness.controller.syncCards({ account: ACCOUNT });

    expect(cards).toEqual([
      expect.objectContaining({
        mint: CARD_MINT,
        name: 'Previously indexed card',
      }),
    ]);
  });

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
    harness.controller.clearState();
    release.resolve();

    await expect(purchase).rejects.toMatchObject({
      message: 'CollectorCrypt wallet was reset',
    });
    expect(harness.controller.state).toEqual({
      hasCompletedOnboarding: false,
      collectorCrypt: { operations: {}, cards: {} },
    });
    expect(harness.snapMock).not.toHaveBeenCalled();
  });

  it('keeps a fresh sync shared when an older sync completes after wallet reset', async () => {
    const harness = setup();
    const oldResponse = createDeferredPromise();
    const newResponse = createDeferredPromise();
    const oldStarted = createDeferredPromise();
    const newStarted = createDeferredPromise();
    const fetchResponse = harness.fetchMock.getMockImplementation();
    assert(fetchResponse, 'The harness must provide an HTTP responder');
    let nftRequests = 0;
    harness.fetchMock.mockImplementation(async (...args) => {
      if (String(args[0]).includes('/solana-tokens')) {
        nftRequests += 1;
        if (nftRequests === 1) {
          oldStarted.resolve();
          await oldResponse.promise;
        } else {
          newStarted.resolve();
          await newResponse.promise;
        }
      }
      return fetchResponse(...args);
    });
    const staleSync = harness.controller.syncCards({ account: ACCOUNT });
    await oldStarted.promise;

    harness.controller.clearState();
    const freshSync = harness.controller.syncCards({ account: ACCOUNT });
    await newStarted.promise;
    oldResponse.resolve();
    await expect(staleSync).rejects.toMatchObject({
      message: 'CollectorCrypt wallet was reset',
    });
    const sharedSync = harness.controller.syncCards({ account: ACCOUNT });
    newResponse.resolve();
    const cards = await freshSync;

    expect(sharedSync).toBe(freshSync);
    expect(nftRequests).toBe(2);
    expect(cards).toEqual([expect.objectContaining({ mint: CARD_MINT })]);
  });

  it.each(['purchase', 'sale'] as const)(
    'stops a %s before submission when the wallet resets during signing',
    async (flow) => {
      const harness = setup();
      if (flow === 'sale') {
        await buyPack(harness);
      }
      const signed = createDeferredPromise();
      const signingStarted = createDeferredPromise();
      harness.snapMock.mockImplementationOnce(async () => {
        signingStarted.resolve();
        await signed.promise;
        return { signedTransaction: SIGNED_PURCHASE, signature: 'signature' };
      });
      harness.fetchMock.mockClear();
      const transaction =
        flow === 'sale'
          ? harness.controller.sellCard({
              account: ACCOUNT,
              mint: CARD_MINT,
              expectedAmount: SALE_AMOUNT,
            })
          : buyPack(harness);
      await signingStarted.promise;

      harness.controller.clearState();
      signed.resolve();

      await expect(transaction).rejects.toMatchObject({
        message: 'CollectorCrypt wallet was reset',
      });
      expect(harness.controller.state).toEqual({
        hasCompletedOnboarding: false,
        collectorCrypt: { operations: {}, cards: {} },
      });
      expect(harness.fetchMock).not.toHaveBeenCalledWith(
        `${harness.apiUrl}/submitTransaction`,
        expect.anything(),
      );
    },
  );
});
