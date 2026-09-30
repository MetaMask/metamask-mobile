import { COLLECTOR_CRYPT_API_URL } from '../constants';
import {
  buybackAvailable,
  buybackCheck,
  buybackCheckUnknown,
  machinePokemon50,
  machinePrivate,
  machineSealed80,
  nftWon,
  openPackAwarded,
  openPackPending,
  packStatus,
  packStatusUnknown,
  status as statusFixture,
  walletCards,
} from './api.fixtures';
import { createCollectorCryptApi } from './collectorCryptApi';

const PLAYER = '2euLumARMfXPW4REBXoYrLdLoWqTmXaHUNXD4ZJiPpAe';
const MEMO = packStatus.memo;
const WALLET = walletCards.filterNFtCard[0].owner.wallet;

type FetchMock = jest.Mock<Promise<Response>, Parameters<typeof fetch>>;

/** Minimal `Response` with a JSON (or raw text) body. */
const createResponse = (httpStatus: number, body?: unknown): Response =>
  ({
    ok: httpStatus >= 200 && httpStatus < 300,
    status: httpStatus,
    text: async () =>
      body === undefined
        ? ''
        : typeof body === 'string'
          ? body
          : JSON.stringify(body),
  }) as unknown as Response;

const setup = ({
  responses = [],
  apiKey,
}: {
  responses?: (Response | Error)[];
  apiKey?: string;
} = {}) => {
  const fetchMock: FetchMock = jest.fn();
  responses.forEach((response) =>
    response instanceof Error
      ? fetchMock.mockRejectedValueOnce(response)
      : fetchMock.mockResolvedValueOnce(response),
  );
  const api = createCollectorCryptApi({
    fetch: fetchMock,
    baseUrl: 'https://gacha.test/api/',
    cardsBaseUrl: 'https://cards.test',
    apiKey,
    timeoutMs: 50,
  });
  return { api, fetchMock };
};

/** Awaits a promise expected to reject and returns the error. */
const getRejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected a rejection');
};

const getRequest = (fetchMock: FetchMock, index = 0) => {
  const [url, init] = fetchMock.mock.calls[index];
  return {
    url: String(url),
    method: init?.method,
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    signal: init?.signal,
  };
};

describe('createCollectorCryptApi', () => {
  describe('transport', () => {
    it('uses the default base URL and global fetch', async () => {
      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(createResponse(200, statusFixture));
      const api = createCollectorCryptApi();

      await api.getStatus();

      expect(fetchSpy).toHaveBeenCalledWith(
        `${COLLECTOR_CRYPT_API_URL}/status`,
        expect.objectContaining({ method: 'GET' }),
      );
      fetchSpy.mockRestore();
    });

    it('sends the API key to the gacha API only', async () => {
      const { api, fetchMock } = setup({
        apiKey: 'key-1',
        responses: [
          createResponse(200, statusFixture),
          createResponse(200, { ...walletCards, totalPages: 1 }),
        ],
      });

      await api.getStatus();
      await api.getWalletCards({ address: WALLET });

      expect(getRequest(fetchMock, 0).headers['x-api-key']).toBe('key-1');
      expect(getRequest(fetchMock, 1).headers['x-api-key']).toBeUndefined();
    });

    it('maps a fetch failure to a retryable NETWORK_ERROR', async () => {
      const { api } = setup({
        responses: [new TypeError('Network request failed')],
      });

      const error = await getRejection(api.getStatus());

      expect(error).toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    });

    it('aborts after the timeout with a NETWORK_ERROR', async () => {
      const { api, fetchMock } = setup();
      fetchMock.mockImplementation(
        (_, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(
                Object.assign(new Error('Aborted'), { name: 'AbortError' }),
              ),
            );
          }),
      );

      const error = await getRejection(api.getMachines());

      expect(error).toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
      expect(getRequest(fetchMock).signal?.aborted).toBe(true);
    });

    it('rejects a non-JSON success body as INVALID_RESPONSE', async () => {
      const { api } = setup({ responses: [createResponse(200, '<html>')] });

      const error = await getRejection(api.getStatus());

      expect(error).toMatchObject({
        code: 'INVALID_RESPONSE',
        retryable: false,
      });
    });

    it.each([
      [429, 'RATE_LIMITED', true],
      [503, 'RATE_LIMITED', true],
      [403, 'UNKNOWN', false],
      [502, 'UNKNOWN', true],
    ])(
      'maps HTTP %s to %s (retryable %s)',
      async (httpStatus, code, retryable) => {
        const { api } = setup({
          responses: [createResponse(httpStatus, { error: 'Nope' })],
        });

        const error = await getRejection(api.getStatus());

        expect(error).toMatchObject({
          code,
          retryable,
          status: httpStatus,
          message: 'GET /status: Nope',
        });
      },
    );
  });

  describe('getMachines', () => {
    it('returns the valid machines and drops malformed ones', async () => {
      const { api, fetchMock } = setup({
        responses: [
          createResponse(200, {
            machines: [
              machinePokemon50,
              machineSealed80,
              machinePrivate,
              { code: 'broken' },
            ],
          }),
        ],
      });

      const machines = await api.getMachines();

      expect(machines.map(({ code }) => code)).toEqual([
        'pokemon_50',
        'sealed_80',
        machinePrivate.code,
      ]);
      expect(machines[0]).toMatchObject({
        price: 50,
        instantBuyback: 85,
        public: true,
        tierRanges: { epic: { start: 250, end: 5001 } },
      });
      expect(getRequest(fetchMock)).toMatchObject({
        url: 'https://gacha.test/api/machines',
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    });
  });

  describe('getStatus', () => {
    it('returns the status', async () => {
      const { api } = setup({
        responses: [createResponse(200, statusFixture)],
      });

      const result = await api.getStatus();

      expect(result.machineStatus).toBe('running');
      expect(result.gachas).toContainEqual(
        expect.objectContaining({ code: 'sealed_80', status: 'closed' }),
      );
    });
  });

  describe('generatePack', () => {
    it('posts the player and pack type', async () => {
      const { api, fetchMock } = setup({
        responses: [createResponse(200, { memo: 'cc-1', transaction: 'AQID' })],
      });

      const result = await api.generatePack({
        playerAddress: PLAYER,
        packType: 'pokemon_50',
      });

      expect(result).toEqual({ memo: 'cc-1', transaction: 'AQID' });
      expect(getRequest(fetchMock)).toMatchObject({
        url: 'https://gacha.test/api/generatePack',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { playerAddress: PLAYER, packType: 'pokemon_50' },
      });
    });

    it('maps a 500 to MACHINE_UNAVAILABLE with the details', async () => {
      const { api } = setup({
        responses: [
          createResponse(500, {
            error: 'Failed to generate pack',
            details: 'Machine is empty',
          }),
        ],
      });

      const error = await getRejection(
        api.generatePack({ playerAddress: PLAYER, packType: 'pokemon_50' }),
      );

      expect(error).toMatchObject({
        code: 'MACHINE_UNAVAILABLE',
        retryable: false,
        status: 500,
        message:
          'POST /generatePack: Failed to generate pack: Machine is empty',
      });
    });

    it('maps a 429 to RATE_LIMITED', async () => {
      const { api } = setup({
        responses: [
          createResponse(429, {
            error: 'Too many pending packs. Complete a purchase to continue.',
          }),
        ],
      });

      const error = await getRejection(
        api.generatePack({ playerAddress: PLAYER, packType: 'pokemon_50' }),
      );

      expect(error).toMatchObject({ code: 'RATE_LIMITED', retryable: true });
    });
  });

  describe('submitTransaction', () => {
    it.each([
      ['confirmed', 'confirmed'],
      ['finalized', 'finalized'],
      ['submitted', 'submitted'],
      ['processed', 'submitted'],
    ])('maps confirmation status %s to %s', async (raw, expected) => {
      const { api, fetchMock } = setup({
        responses: [
          createResponse(200, {
            success: true,
            signature: 'sig',
            confirmationStatus: raw,
          }),
        ],
      });

      const result = await api.submitTransaction({ signedTransaction: 'AQID' });

      expect(result).toEqual({
        signature: 'sig',
        confirmationStatus: expected,
      });
      expect(getRequest(fetchMock).body).toEqual({ signedTransaction: 'AQID' });
    });

    it.each([
      [400, false],
      [403, false],
      [500, true],
    ])(
      'maps HTTP %s to SUBMIT_FAILED (retryable %s)',
      async (httpStatus, retryable) => {
        const { api } = setup({
          responses: [
            createResponse(httpStatus, {
              error: 'Transaction not signed by the gacha wallet',
            }),
          ],
        });

        const error = await getRejection(
          api.submitTransaction({ signedTransaction: 'AQID' }),
        );

        expect(error).toMatchObject({
          code: 'SUBMIT_FAILED',
          retryable,
          status: httpStatus,
        });
      },
    );

    it('rejects success false', async () => {
      const { api } = setup({
        responses: [createResponse(200, { success: false, signature: 'sig' })],
      });

      const error = await getRejection(
        api.submitTransaction({ signedTransaction: 'AQID' }),
      );

      expect(error).toMatchObject({ code: 'SUBMIT_FAILED' });
    });
  });

  describe('openPack', () => {
    it('maps an awarded pack', async () => {
      const { api, fetchMock } = setup({
        responses: [createResponse(200, openPackAwarded)],
      });

      const result = await api.openPack({ memo: 'cc-1' });

      expect(result).toEqual({
        status: 'awarded',
        mint: nftWon.id,
        transactionSignature: openPackAwarded.transactionSignature,
        nft: expect.objectContaining({ id: nftWon.id }),
        rarity: 'common',
        buybackAmount: '42500000',
      });
      expect(getRequest(fetchMock)).toMatchObject({
        url: 'https://gacha.test/api/openPack',
        method: 'POST',
        body: { memo: 'cc-1' },
      });
    });

    it('maps a re-opened turbo pack with a string buyback amount', async () => {
      const { roll: _roll, ...reopened } = openPackAwarded;
      const { api } = setup({
        responses: [
          createResponse(200, {
            ...reopened,
            code: 'TURBO_MODE_BUYBACK',
            buybackAmount: '42500000',
            rarity: 'Legendary',
          }),
        ],
      });

      const result = await api.openPack({ memo: 'cc-1' });

      expect(result).toMatchObject({
        status: 'awarded',
        buybackAmount: '42500000',
      });
      expect(result).not.toHaveProperty('rarity');
    });

    it('maps a pending pack', async () => {
      const { api } = setup({
        responses: [createResponse(200, openPackPending)],
      });

      const result = await api.openPack({ memo: openPackPending.memo });

      expect(result).toEqual({
        status: 'pending',
        code: 'WAITING_FOR_WEBHOOK',
      });
    });

    it.each([
      [404, 'OPEN_PENDING', true],
      [400, 'NOT_FOUND', false],
      [500, 'UNKNOWN', true],
    ])('maps HTTP %s to %s', async (httpStatus, code, retryable) => {
      const { api } = setup({
        responses: [
          createResponse(httpStatus, {
            error: 'No spin transaction found for memo',
          }),
        ],
      });

      const error = await getRejection(api.openPack({ memo: 'cc-1' }));

      expect(error).toMatchObject({ code, retryable, status: httpStatus });
    });

    it('rejects a body with neither nft_address nor code', async () => {
      const { api } = setup({
        responses: [createResponse(200, { success: true })],
      });

      const error = await getRejection(api.openPack({ memo: 'cc-1' }));

      expect(error).toMatchObject({ code: 'INVALID_RESPONSE' });
    });
  });

  describe('getPackStatus', () => {
    it('maps a delivered pack', async () => {
      const { api, fetchMock } = setup({
        responses: [createResponse(200, packStatus)],
      });

      const result = await api.getPackStatus({ memo: MEMO });

      expect(result).toEqual({
        memo: MEMO,
        isPaid: true,
        isDelivered: true,
        isRefunded: false,
        mint: packStatus.send.nft_address,
        rarity: 'common',
        insuredValue: 180,
        createdAt: Date.parse(packStatus.pack.created_at),
      });
      expect(getRequest(fetchMock).url).toBe(
        `https://gacha.test/api/pack/status?memo=${encodeURIComponent(MEMO)}`,
      );
    });

    it('maps an unknown memo', async () => {
      const { api } = setup({
        responses: [createResponse(200, packStatusUnknown)],
      });

      const result = await api.getPackStatus({ memo: packStatusUnknown.memo });

      expect(result).toEqual({
        memo: packStatusUnknown.memo,
        isPaid: false,
        isDelivered: false,
        isRefunded: false,
      });
    });

    it('maps a refunded pack and a turbo send', async () => {
      const { api } = setup({
        responses: [
          createResponse(200, {
            memo: 'cc-1',
            pack: {
              status: null,
              webhook_received: true,
              refunded: true,
              created_at: 'not a date',
            },
            send: {
              status: null,
              webhook_sent: false,
              transaction_signature: 'turbomode',
              prize_tier: 1,
              insured_value: '$45.00',
            },
            buyback: [],
          }),
        ],
      });

      const result = await api.getPackStatus({ memo: 'cc-1' });

      expect(result).toEqual({
        memo: 'cc-1',
        isPaid: true,
        isDelivered: true,
        isRefunded: true,
        rarity: 'epic',
        insuredValue: 45,
      });
    });
  });

  describe('getBuybackAvailability', () => {
    it('returns the offer', async () => {
      const { api, fetchMock } = setup({
        responses: [createResponse(200, buybackAvailable)],
      });

      const result = await api.getBuybackAvailability({ mint: 'mint1' });

      expect(result).toEqual({ available: true, amount: '42500000' });
      expect(getRequest(fetchMock).url).toBe(
        'https://gacha.test/api/buyback/available?nft=mint1',
      );
    });

    it.each([
      ['unavailable', { available: false }],
      ['available without amount', { available: true }],
      ['available with a zero amount', { available: true, amount: 0 }],
    ])('returns unavailable when %s', async (_, body) => {
      const { api } = setup({ responses: [createResponse(200, body)] });

      const result = await api.getBuybackAvailability({ mint: 'mint1' });

      expect(result).toEqual({ available: false });
    });

    it('accepts a string amount', async () => {
      const { api } = setup({
        responses: [createResponse(200, { available: true, amount: '0042' })],
      });

      const result = await api.getBuybackAvailability({ mint: 'mint1' });

      expect(result).toEqual({ available: true, amount: '42' });
    });
  });

  describe('createBuyback', () => {
    it('posts the player and NFT and maps the transaction', async () => {
      const { api, fetchMock } = setup({
        responses: [
          createResponse(200, {
            success: true,
            serializedTransaction: 'AQID',
            refundAmount: 162000000,
            memo: MEMO,
          }),
        ],
      });

      const result = await api.createBuyback({
        playerAddress: PLAYER,
        mint: 'mint1',
      });

      expect(result).toEqual({
        transaction: 'AQID',
        amount: '162000000',
        memo: MEMO,
      });
      expect(getRequest(fetchMock)).toMatchObject({
        url: 'https://gacha.test/api/buyback',
        method: 'POST',
        body: { playerAddress: PLAYER, nftAddress: 'mint1' },
      });
    });

    it('maps a 400 to BUYBACK_UNAVAILABLE', async () => {
      const { api } = setup({
        responses: [createResponse(400, { error: 'Buyback window expired' })],
      });

      const error = await getRejection(
        api.createBuyback({ playerAddress: PLAYER, mint: 'mint1' }),
      );

      expect(error).toMatchObject({
        code: 'BUYBACK_UNAVAILABLE',
        retryable: false,
        status: 400,
      });
    });

    it('rejects an invalid refund amount', async () => {
      const { api } = setup({
        responses: [
          createResponse(200, {
            serializedTransaction: 'AQID',
            refundAmount: 'lots',
            memo: MEMO,
          }),
        ],
      });

      const error = await getRejection(
        api.createBuyback({ playerAddress: PLAYER, mint: 'mint1' }),
      );

      expect(error).toMatchObject({ code: 'INVALID_RESPONSE' });
    });
  });

  describe('checkBuyback', () => {
    it('maps a completed buyback', async () => {
      const { api, fetchMock } = setup({
        responses: [createResponse(200, buybackCheck)],
      });

      const result = await api.checkBuyback({ memo: MEMO });

      expect(result).toEqual({
        exists: true,
        isComplete: true,
        signature: buybackCheck.transactionSignature,
        amount: '162000000',
      });
      expect(getRequest(fetchMock).url).toBe(
        `https://gacha.test/api/buyback/check?memo=${encodeURIComponent(MEMO)}`,
      );
    });

    it('maps a pending and an unknown buyback', async () => {
      const { api } = setup({
        responses: [
          createResponse(200, { ...buybackCheck, status: '' }),
          createResponse(200, buybackCheckUnknown),
        ],
      });

      const pending = await api.checkBuyback({ memo: MEMO });
      const unknown = await api.checkBuyback({ memo: 'cc-0' });

      expect(pending).toMatchObject({ exists: true, isComplete: false });
      expect(unknown).toEqual({ exists: false, isComplete: false });
    });
  });

  describe('getWalletCards', () => {
    it('returns the cards owned by the address', async () => {
      const [card] = walletCards.filterNFtCard;
      const { api, fetchMock } = setup({
        responses: [
          createResponse(200, {
            ...walletCards,
            totalPages: 1,
            filterNFtCard: [
              card,
              { ...card, nftAddress: 'sold', owner: { wallet: PLAYER } },
              { ...card, nftAddress: 'no-owner', owner: null },
            ],
          }),
        ],
      });

      const cards = await api.getWalletCards({ address: WALLET });

      expect(cards.map(({ nftAddress }) => nftAddress)).toEqual([
        card.nftAddress,
        'no-owner',
      ]);
      expect(cards[0]).toMatchObject({
        insuredValue: '800',
        grade: 'GEM-MT 10',
        year: 2024,
      });
      expect(getRequest(fetchMock).url).toBe(
        `https://cards.test/cards/${WALLET}/?page=1&step=96&orderBy=dateDesc`,
      );
    });

    it('rejects incomplete metadata instead of dropping an owned card', async () => {
      const [card] = walletCards.filterNFtCard;
      const { api } = setup({
        responses: [
          createResponse(200, {
            ...walletCards,
            totalPages: 1,
            filterNFtCard: [{ ...card, grade: 10 }],
          }),
        ],
      });

      const request = api.getWalletCards({ address: WALLET });

      await expect(request).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    });

    it('returns an empty list for an unknown wallet (404)', async () => {
      const { api } = setup({
        responses: [
          createResponse(404, {
            statusCode: 404,
            message: 'User not found',
            error: 'Not Found',
          }),
        ],
      });

      const cards = await api.getWalletCards({ address: WALLET });

      expect(cards).toEqual([]);
    });

    it('maps a server error to a retryable UNKNOWN', async () => {
      const { api } = setup({ responses: [createResponse(500)] });

      const error = await getRejection(api.getWalletCards({ address: WALLET }));

      expect(error).toMatchObject({
        code: 'UNKNOWN',
        retryable: true,
        message: 'GET /cards: HTTP 500',
      });
    });
  });
});
