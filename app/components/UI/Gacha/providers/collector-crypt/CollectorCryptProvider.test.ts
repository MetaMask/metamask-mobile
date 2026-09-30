import { createNextState } from '@reduxjs/toolkit';
import { SolScope } from '@metamask/keyring-api';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import { HandlerType } from '@metamask/snaps-utils';
import { create } from '@metamask/superstruct';

import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { SOLANA_WALLET_SNAP_ID } from '../../../../../core/SnapKeyring/SolanaWalletSnap';
import Logger from '../../../../../util/Logger';
import {
  COLLECTOR_CRYPT_TIMINGS,
  COLLECTOR_CRYPT_COLLECTIONS,
} from './constants';
import {
  CcMachineStruct,
  CcNftWonStruct,
  CcStatusStruct,
  type CcWalletCard,
} from './schemas';
import {
  machinePokemon50,
  nftWon,
  status as statusFixture,
} from './services/api.fixtures';
import type {
  CollectorCryptApi,
  OpenPackResult,
  PackStatus,
} from './services/collectorCryptApi';
import { createCollectorCryptError } from './services/errors';
import type { SolanaNftApi } from '../../services/solanaNftApi';
import type { SolanaNftItem } from '../../services/solanaNftApi.schemas';
import type {
  CollectorCryptCard,
  CollectorCryptErrorCode,
  CollectorCryptSale,
  PackOperation,
  SolanaAccountRef,
} from './types';
import { toPacks } from './utils/packs';
import { CollectorCryptProvider } from './CollectorCryptProvider';
import {
  getDefaultCollectorCryptState,
  type CollectorCryptState,
} from './state';

type HandleRequest = SnapControllerHandleRequestAction['handler'];

const {
  GENERATED_TTL,
  SIGNED_TTL,
  OPEN_WINDOW,
  OPEN_POLL_ATTEMPTS,
  OPEN_POLL_INTERVAL,
  INDEXER_GRACE,
  BUYBACK_AVAILABLE_TTL,
} = COLLECTOR_CRYPT_TIMINGS;

const NOW = Date.parse('2026-09-29T12:00:00.000Z');
const MINUTE = 60_000;

const ACCOUNT: SolanaAccountRef = {
  id: '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91',
  address: '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
};
const OTHER_ACCOUNT: SolanaAccountRef = {
  id: '7d2e9a41-5b3c-4f6e-8a1d-0c9b8e7f6a52',
  address: '7cjEct8b9jCAyQaCTefikqXkh9iU3j8BaUVdX7pWf3Lc',
};

const PACK = { code: 'pokemon_25', name: 'Pokemon 25', price: 25 };
const MEMO = 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a';
const SALE_MEMO = 'cc-11111111-2222-4333-8444-555555555555';
const PURCHASE_SIGNATURE = 'purchase-signature';
const SALE_SIGNATURE = 'sale-signature';
const CARD_MINT = 'H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1';
const OTHER_MINT = '9iQWVTEBXJmw7N5ZoPE1njuijtfAcXsDhUzwDY88ZBoh';
const THIRD_MINT = '8D1muMqbwezWXUjKcQ3YYBUKXngoyA866AuJdy9xUVZu';
const SALE_AMOUNT = '19550000';
const OFFER_AMOUNT = '42500000';

const NFT_WON = create(nftWon, CcNftWonStruct);

// Transactions are opaque payloads passed between the API and the Snap.
const PURCHASE_TX = 'cHVyY2hhc2UtdHJhbnNhY3Rpb24=';
const SALE_TX = 'c2FsZS10cmFuc2FjdGlvbg==';
const SIGNED_PURCHASE_TX = 'c2lnbmVkLXB1cmNoYXNlLXRyYW5zYWN0aW9u';
const SIGNED_SALE_TX = 'c2lnbmVkLXNhbGUtdHJhbnNhY3Rpb24=';

const createApi = (): jest.Mocked<CollectorCryptApi> => ({
  getMachines: jest.fn(),
  getStatus: jest.fn(),
  generatePack: jest.fn(),
  submitTransaction: jest.fn(),
  openPack: jest.fn(),
  getPackStatus: jest.fn(),
  getBuybackAvailability: jest.fn(),
  createBuyback: jest.fn(),
  checkBuyback: jest.fn(),
  getWalletCards: jest.fn(),
});

/**
 * Pack operation; `undefined` overrides remove the field.
 *
 * @param overrides - Fields to change.
 * @returns The operation.
 */
const buildOperation = (
  overrides: Partial<PackOperation> = {},
): PackOperation =>
  Object.fromEntries(
    Object.entries({
      memo: MEMO,
      packCode: PACK.code,
      packName: PACK.name,
      price: PACK.price,
      status: 'generated',
      createdAt: NOW,
      updatedAt: NOW,
      transaction: PURCHASE_TX,
      ...overrides,
    }).filter(([, value]) => value !== undefined),
  ) as PackOperation;

const signedOperation = (
  overrides: Partial<PackOperation> = {},
): PackOperation =>
  buildOperation({
    status: 'signed',
    transaction: undefined,
    signedTransaction: SIGNED_PURCHASE_TX,
    signature: PURCHASE_SIGNATURE,
    ...overrides,
  });

const buildCard = (
  overrides: Partial<CollectorCryptCard> = {},
): CollectorCryptCard => ({
  mint: CARD_MINT,
  name: 'Monkey D. Luffy PSA 10',
  source: 'nftApi',
  acquiredAt: NOW - 10 * MINUTE,
  buyback: { status: 'unknown' },
  ...overrides,
});

const buildPendingSaleCard = (
  overrides: Partial<CollectorCryptSale> = {},
): CollectorCryptCard =>
  buildCard({
    sale: {
      status: 'pending',
      amount: SALE_AMOUNT,
      memo: SALE_MEMO,
      signature: SALE_SIGNATURE,
      updatedAt: NOW,
      ...overrides,
    },
  });

const nftItem = (mint: string, name = `NFT ${mint}`): SolanaNftItem => ({
  token_address: mint,
  nft_token: {
    onchain_collection_address: COLLECTOR_CRYPT_COLLECTIONS[0],
    name,
    image_url: `https://nft.test/${mint}.png`,
    attributes: [
      { key: 'Insured Value', value: '50' },
      { key: 'The Grade', value: 'GEM-MT 10' },
    ],
  },
});

const walletCard = (mint: string): CcWalletCard => ({
  nftAddress: mint,
  itemName: `Wallet ${mint}`,
  grade: 'MINT 9',
  gradingCompany: 'PSA',
  insuredValue: '120',
});

const awarded = (mint = CARD_MINT): OpenPackResult => ({
  status: 'awarded',
  mint,
  transactionSignature: 'send-signature',
  nft: NFT_WON,
  rarity: 'rare',
  buybackAmount: OFFER_AMOUNT,
});

const pending = (
  code: 'WAITING_FOR_WEBHOOK' | 'SEND_PENDING' = 'WAITING_FOR_WEBHOOK',
): OpenPackResult => ({ status: 'pending', code });

const packStatus = (overrides: Partial<PackStatus> = {}): PackStatus => ({
  memo: MEMO,
  isPaid: false,
  isDelivered: false,
  isRefunded: false,
  createdAt: NOW,
  ...overrides,
});

const apiError = (code: CollectorCryptErrorCode, status?: number) =>
  createCollectorCryptError({ code, status });

/**
 * State with operations and cards for one account.
 *
 * @param params - Content.
 * @param params.operations - Operations of the account.
 * @param params.cards - Cards of the account.
 * @param params.address - Account address.
 * @returns The provider state.
 */
const stateFor = ({
  operations = [],
  cards = [],
  address = ACCOUNT.address,
}: {
  operations?: PackOperation[];
  cards?: CollectorCryptCard[];
  address?: string;
}): CollectorCryptState => ({
  operations: operations.length
    ? {
        [address]: Object.fromEntries(
          operations.map((operation) => [operation.memo, operation]),
        ),
      }
    : {},
  cards: cards.length
    ? { [address]: Object.fromEntries(cards.map((card) => [card.mint, card])) }
    : {},
});

const setup = ({ state }: { state?: Partial<CollectorCryptState> } = {}) => {
  let currentState: CollectorCryptState = {
    ...getDefaultCollectorCryptState(),
    ...state,
  };
  const listeners: ((state: CollectorCryptState) => void)[] = [];
  const subscribe = (listener: (state: CollectorCryptState) => void) => {
    listeners.push(listener);
  };
  const handleRequest = jest.fn<
    ReturnType<HandleRequest>,
    Parameters<HandleRequest>
  >();
  const api = createApi();
  const nftApi: jest.Mocked<SolanaNftApi> = {
    getTokens: jest.fn(),
  };
  const clock = { now: NOW };
  const sleep = jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined);
  const provider = new CollectorCryptProvider({
    getState: () => currentState,
    updateState: (recipe) => {
      currentState = createNextState(currentState, recipe);
      listeners.forEach((listener) => listener(currentState));
    },
    requestSnap: handleRequest,
    api,
    nftApi,
    now: () => clock.now,
    sleep,
  });
  return {
    provider,
    subscribe,
    handleRequest,
    api,
    nftApi,
    clock,
    sleep,
  };
};

type Setup = ReturnType<typeof setup>;

/** Snap signs the purchase, CollectorCrypt accepts, opens, offers a buyback. */
const mockHappyPurchase = ({ api, handleRequest }: Setup) => {
  handleRequest.mockResolvedValue({
    signedTransaction: SIGNED_PURCHASE_TX,
    signature: PURCHASE_SIGNATURE,
  });
  api.submitTransaction.mockResolvedValue({
    signature: PURCHASE_SIGNATURE,
    confirmationStatus: 'confirmed',
  });
  api.openPack.mockResolvedValue(awarded());
  api.getBuybackAvailability.mockResolvedValue({
    available: true,
    amount: OFFER_AMOUNT,
  });
};

/** CollectorCrypt builds the real buyback, Snap signs, submission succeeds. */
const mockHappySale = ({ api, handleRequest }: Setup) => {
  api.getBuybackAvailability.mockResolvedValue({
    available: true,
    amount: SALE_AMOUNT,
  });
  api.createBuyback.mockResolvedValue({
    transaction: SALE_TX,
    amount: SALE_AMOUNT,
    memo: SALE_MEMO,
  });
  handleRequest.mockResolvedValue({
    signedTransaction: SIGNED_SALE_TX,
    signature: SALE_SIGNATURE,
  });
  api.submitTransaction.mockResolvedValue({
    signature: SALE_SIGNATURE,
    confirmationStatus: 'confirmed',
  });
};

const getOperation = (
  provider: CollectorCryptProvider,
  memo = MEMO,
  address = ACCOUNT.address,
): PackOperation | undefined => provider.state.operations[address]?.[memo];

const getCard = (
  provider: CollectorCryptProvider,
  mint = CARD_MINT,
  address = ACCOUNT.address,
): CollectorCryptCard | undefined => provider.state.cards[address]?.[mint];

/** Records each distinct status the operation goes through. */
const recordStatuses = (subscribe: Setup['subscribe'], memo = MEMO) => {
  const statuses: string[] = [];
  subscribe((state) => {
    const current = state.operations[ACCOUNT.address]?.[memo]?.status;
    if (current && statuses[statuses.length - 1] !== current) {
      statuses.push(current);
    }
  });
  return statuses;
};

const deferred = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

describe('CollectorCryptProvider', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let devLogSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    devLogSpy = jest
      .spyOn(DevLogger, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('starts from the default state', () => {
      const { provider } = setup();

      expect(provider.state).toStrictEqual(getDefaultCollectorCryptState());
    });

    it('keeps the given state', () => {
      const state = stateFor({ cards: [buildCard()] });

      const { provider } = setup({ state });

      expect(provider.state).toStrictEqual(state);
    });
  });

  describe('getPacks', () => {
    it('returns the open public packs', async () => {
      const { provider, api } = setup();
      const machines = [create(machinePokemon50, CcMachineStruct)];
      const status = create(statusFixture, CcStatusStruct);
      api.getMachines.mockResolvedValue(machines);
      api.getStatus.mockResolvedValue(status);

      const packs = await provider.getPacks();

      expect(packs).toStrictEqual(toPacks(machines, status));
      expect(packs.map(({ code }) => code)).toStrictEqual(['pokemon_50']);
    });

    it('rejects with a CollectorCrypt error', async () => {
      const { provider, api } = setup();
      api.getMachines.mockRejectedValue(
        new TypeError('Network request failed'),
      );
      api.getStatus.mockResolvedValue(create(statusFixture, CcStatusStruct));

      await expect(provider.getPacks()).rejects.toMatchObject({
        name: 'CollectorCryptError',
        code: 'NETWORK_ERROR',
        retryable: true,
      });
    });
  });

  describe('generatePack', () => {
    it('stores a generated operation and returns its memo', async () => {
      const { provider, api } = setup();
      api.generatePack.mockResolvedValue({
        memo: MEMO,
        transaction: PURCHASE_TX,
      });

      const memo = await provider.generatePack({
        account: ACCOUNT,
        pack: PACK,
      });

      expect(memo).toBe(MEMO);
      expect(api.generatePack).toHaveBeenCalledWith({
        playerAddress: ACCOUNT.address,
        packType: PACK.code,
      });
      expect(getOperation(provider)).toStrictEqual(buildOperation());
    });

    it('stores nothing when CollectorCrypt refuses', async () => {
      const { provider, api } = setup();
      api.generatePack.mockRejectedValue(apiError('MACHINE_UNAVAILABLE', 500));

      await expect(
        provider.generatePack({ account: ACCOUNT, pack: PACK }),
      ).rejects.toMatchObject({ code: 'MACHINE_UNAVAILABLE' });
      expect(provider.state.operations).toStrictEqual({});
    });
  });

  describe('completePack', () => {
    describe('happy path', () => {
      it('signs silently, submits, opens after the webhook and checks the buyback', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        const { provider, api, handleRequest, sleep, subscribe } = context;
        mockHappyPurchase(context);
        api.openPack
          .mockResolvedValueOnce(pending())
          .mockResolvedValueOnce(pending())
          .mockResolvedValueOnce(awarded());
        const statuses = recordStatuses(subscribe);

        const card = await provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(handleRequest).toHaveBeenCalledTimes(1);
        expect(handleRequest).toHaveBeenCalledWith({
          origin: 'metamask',
          snapId: SOLANA_WALLET_SNAP_ID,
          handler: HandlerType.OnClientRequest,
          request: {
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'signTransaction',
            params: {
              accountId: ACCOUNT.id,
              transaction: PURCHASE_TX,
              scope: SolScope.Mainnet,
            },
          },
        });
        expect(api.submitTransaction).toHaveBeenCalledWith({
          signedTransaction: SIGNED_PURCHASE_TX,
        });
        expect(api.openPack).toHaveBeenCalledTimes(3);
        expect(sleep).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledWith(OPEN_POLL_INTERVAL);
        expect(api.getBuybackAvailability).toHaveBeenCalledWith({
          mint: CARD_MINT,
        });
        expect(statuses).toStrictEqual(['signed', 'submitted', 'opened']);
        expect(card).toMatchObject({
          mint: CARD_MINT,
          memo: MEMO,
          packCode: PACK.code,
          rarity: 'rare',
          source: 'openPack',
          buyback: {
            status: 'available',
            amount: OFFER_AMOUNT,
            checkedAt: NOW,
          },
        });
        expect(getCard(provider)).toStrictEqual(card);
      });

      it('stores the opened operation without any transaction', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(getOperation(context.provider)).toStrictEqual({
          memo: MEMO,
          packCode: PACK.code,
          packName: PACK.name,
          price: PACK.price,
          status: 'opened',
          createdAt: NOW,
          updatedAt: NOW,
          signature: PURCHASE_SIGNATURE,
          mint: CARD_MINT,
        });
      });

      it('resolves with the card when the buyback check fails', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.getBuybackAvailability.mockRejectedValue(
          apiError('NETWORK_ERROR'),
        );

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(card.buyback).toStrictEqual({
          status: 'available',
          amount: OFFER_AMOUNT,
          checkedAt: NOW,
        });
        expect(getOperation(context.provider)?.status).toBe('opened');
      });

      it('shares concurrent calls for the same memo', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);

        const [first, second] = await Promise.all([
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ]);

        expect(first).toBe(second);
        expect(context.handleRequest).toHaveBeenCalledTimes(1);
        expect(context.api.submitTransaction).toHaveBeenCalledTimes(1);
        expect(context.api.openPack).toHaveBeenCalledTimes(1);
      });
    });

    describe('generated', () => {
      it('expires a generated pack past its TTL without signing it', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        context.clock.now = NOW + GENERATED_TTL + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_EXPIRED' });

        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(getOperation(context.provider)).toMatchObject({
          status: 'expired',
          error: { code: 'PACK_EXPIRED' },
        });
        expect(getOperation(context.provider)?.transaction).toBeUndefined();
      });

      it('keeps the pack generated when signing fails, then signs it on retry', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.handleRequest.mockRejectedValueOnce(new Error('Snap crashed'));

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'SIGNING_REJECTED' });
        expect(getOperation(context.provider)).toMatchObject({
          status: 'generated',
          transaction: PURCHASE_TX,
          error: { code: 'SIGNING_REJECTED' },
        });
        expect(context.api.submitTransaction).not.toHaveBeenCalled();

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(context.handleRequest).toHaveBeenCalledTimes(2);
        expect(getOperation(context.provider)?.status).toBe('opened');
      });

      it('reports a snap without the signTransaction method', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        context.handleRequest.mockRejectedValue(
          Object.assign(new Error('The method does not exist'), {
            code: -32601,
          }),
        );

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'SNAP_UNSUPPORTED' });
        expect(getOperation(context.provider)?.status).toBe('generated');
      });
    });

    describe('signed', () => {
      it('continues to the opening when the payment landed despite a submit failure', async () => {
        const context = setup({
          state: stateFor({ operations: [signedOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockRejectedValue(
          apiError('NETWORK_ERROR'),
        );
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(card.mint).toBe(CARD_MINT);
        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.api.getPackStatus).toHaveBeenCalledWith({ memo: MEMO });
        expect(getOperation(context.provider)?.status).toBe('opened');
      });

      it('keeps the signed transaction when the payment is not seen within SIGNED_TTL', async () => {
        const context = setup({
          state: stateFor({ operations: [signedOperation()] }),
        });
        context.api.submitTransaction.mockRejectedValue(
          apiError('SUBMIT_FAILED', 500),
        );
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + SIGNED_TTL - 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'SUBMIT_FAILED' });

        expect(getOperation(context.provider)).toMatchObject({
          status: 'signed',
          signedTransaction: SIGNED_PURCHASE_TX,
          error: { code: 'SUBMIT_FAILED' },
        });
        expect(context.api.openPack).not.toHaveBeenCalled();
      });

      it('resubmits the same signed bytes on retry without signing again', async () => {
        const context = setup({
          state: stateFor({ operations: [signedOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockRejectedValueOnce(
          apiError('NETWORK_ERROR'),
        );
        context.api.getPackStatus.mockResolvedValue(packStatus());
        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.api.submitTransaction.mock.calls).toStrictEqual([
          [{ signedTransaction: SIGNED_PURCHASE_TX }],
          [{ signedTransaction: SIGNED_PURCHASE_TX }],
        ]);
        expect(getOperation(context.provider)?.status).toBe('opened');
      });

      it('expires the pack when the payment is still not seen after SIGNED_TTL', async () => {
        const context = setup({
          state: stateFor({ operations: [signedOperation()] }),
        });
        context.api.submitTransaction.mockRejectedValue(
          apiError('SUBMIT_FAILED', 400),
        );
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + SIGNED_TTL + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_EXPIRED' });

        const operation = getOperation(context.provider);
        expect(operation?.status).toBe('expired');
        expect(operation?.signedTransaction).toBeUndefined();
      });

      it('keeps the pack signed when the pack status is unavailable too', async () => {
        const context = setup({
          state: stateFor({ operations: [signedOperation()] }),
        });
        context.api.submitTransaction.mockRejectedValue(
          apiError('NETWORK_ERROR'),
        );
        context.api.getPackStatus.mockRejectedValue(apiError('NETWORK_ERROR'));
        context.clock.now = NOW + SIGNED_TTL + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

        expect(getOperation(context.provider)).toMatchObject({
          status: 'signed',
          signedTransaction: SIGNED_PURCHASE_TX,
        });
      });
    });

    describe('submitted and paid', () => {
      it('marks the pack paid when CollectorCrypt is sending the card', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'submitted' })],
          }),
        });
        mockHappyPurchase(context);
        context.api.openPack
          .mockResolvedValueOnce(pending('SEND_PENDING'))
          .mockResolvedValueOnce(awarded());
        const statuses = recordStatuses(context.subscribe);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(statuses).toStrictEqual(['paid', 'opened']);
        expect(context.api.submitTransaction).not.toHaveBeenCalled();
      });

      it('keeps polling while the purchase is not on-chain yet (404)', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'paid' })],
          }),
        });
        mockHappyPurchase(context);
        context.api.openPack
          .mockRejectedValueOnce(apiError('OPEN_PENDING', 404))
          .mockResolvedValueOnce(awarded());

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(card.mint).toBe(CARD_MINT);
        expect(context.api.openPack).toHaveBeenCalledTimes(2);
        expect(context.sleep).toHaveBeenCalledTimes(1);
      });

      it('throws OPEN_PENDING and keeps the pack paid when polling is exhausted', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'paid' })],
          }),
        });
        context.api.openPack.mockResolvedValue(pending());

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING', retryable: true });

        expect(context.api.openPack).toHaveBeenCalledTimes(OPEN_POLL_ATTEMPTS);
        expect(context.sleep).toHaveBeenCalledTimes(OPEN_POLL_ATTEMPTS - 1);
        expect(getOperation(context.provider)).toMatchObject({
          status: 'paid',
          error: { code: 'OPEN_PENDING' },
        });
      });

      it('marks a submitted pack paid when polling is exhausted after the payment landed', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'submitted' })],
          }),
        });
        context.api.openPack.mockResolvedValue(pending());
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING' });

        expect(getOperation(context.provider)?.status).toBe('paid');
      });

      it('expires a submitted pack whose payment never landed once polling is exhausted', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'submitted' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('OPEN_PENDING', 404));
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + SIGNED_TTL + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_EXPIRED' });

        expect(getOperation(context.provider)?.status).toBe('expired');
      });

      it('expires the pack when openPack answers 400 and it was never paid', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'submitted' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + SIGNED_TTL + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_EXPIRED' });

        expect(getOperation(context.provider)?.status).toBe('expired');
        expect(context.api.openPack).toHaveBeenCalledTimes(1);
      });

      it('fails the pack when openPack answers 400 after the open window', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'paid' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );
        context.clock.now = NOW + OPEN_WINDOW + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_FAILED' });

        expect(getOperation(context.provider)?.status).toBe('failed');
      });

      it('fails the pack when openPack answers 400 on a refunded pack', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'paid' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true, isRefunded: true }),
        );

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_FAILED' });

        expect(getOperation(context.provider)?.status).toBe('failed');
      });

      it('keeps a young paid pack pending when openPack answers 400', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'submitted' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );
        context.clock.now = NOW + 10 * MINUTE;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING' });

        expect(getOperation(context.provider)?.status).toBe('paid');
      });

      it('keeps a young unpaid pack submitted when openPack answers 400', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'submitted' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(packStatus());

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING' });

        expect(getOperation(context.provider)?.status).toBe('submitted');
      });

      it('stores other openPack errors on the operation', async () => {
        const context = setup({
          state: stateFor({
            operations: [signedOperation({ status: 'paid' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('RATE_LIMITED', 429));

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'RATE_LIMITED' });

        expect(getOperation(context.provider)).toMatchObject({
          status: 'paid',
          error: { code: 'RATE_LIMITED' },
        });
      });
    });

    describe('terminal', () => {
      it('returns the stored card of an opened pack without any call', async () => {
        const card = buildCard({ source: 'openPack', memo: MEMO });
        const context = setup({
          state: stateFor({
            operations: [
              buildOperation({
                status: 'opened',
                transaction: undefined,
                mint: CARD_MINT,
              }),
            ],
            cards: [card],
          }),
        });

        const result = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(result).toStrictEqual(card);
        expect(context.api.openPack).not.toHaveBeenCalled();
      });

      it.each([
        ['expired', 'PACK_EXPIRED'],
        ['failed', 'PACK_FAILED'],
      ] as const)('rejects a %s pack with %s', async (status, code) => {
        const context = setup({
          state: stateFor({
            operations: [buildOperation({ status, transaction: undefined })],
          }),
        });

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code });
        expect(context.handleRequest).not.toHaveBeenCalled();
      });

      it('rejects an unknown memo', async () => {
        const { provider } = setup();

        await expect(
          provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      });
    });
  });

  describe('dismissOperation', () => {
    it('removes a terminal operation and the empty account entry', () => {
      const { provider } = setup({
        state: stateFor({
          operations: [buildOperation({ status: 'opened', mint: CARD_MINT })],
        }),
      });

      provider.dismissOperation({ account: ACCOUNT, memo: MEMO });

      expect(provider.state.operations).toStrictEqual({});
    });

    it.each(['signed', 'submitted', 'paid'] as const)(
      'keeps a %s operation whose payment may be in flight',
      (status) => {
        const operation = signedOperation({ status });
        const { provider } = setup({
          state: stateFor({ operations: [operation] }),
        });

        provider.dismissOperation({ account: ACCOUNT, memo: MEMO });

        expect(getOperation(provider)).toStrictEqual(operation);
      },
    );

    it('ignores an unknown memo', () => {
      const state = stateFor({ operations: [buildOperation()] });
      const { provider } = setup({ state });

      provider.dismissOperation({ account: ACCOUNT, memo: 'unknown' });

      expect(provider.state).toStrictEqual(state);
    });
  });

  describe('recoverOperations', () => {
    it('resumes signed, submitted and paid operations without signing', async () => {
      const context = setup({
        state: stateFor({
          operations: [
            signedOperation({ memo: 'signed-memo' }),
            signedOperation({ memo: 'submitted-memo', status: 'submitted' }),
            signedOperation({ memo: 'paid-memo', status: 'paid' }),
          ],
        }),
      });
      mockHappyPurchase(context);
      context.api.openPack
        .mockResolvedValueOnce(awarded(CARD_MINT))
        .mockResolvedValueOnce(awarded(OTHER_MINT))
        .mockResolvedValueOnce(awarded(THIRD_MINT));

      await context.provider.recoverOperations({ account: ACCOUNT });

      expect(context.handleRequest).not.toHaveBeenCalled();
      expect(context.api.submitTransaction).toHaveBeenCalledTimes(1);
      expect(
        ['signed-memo', 'submitted-memo', 'paid-memo'].map(
          (memo) => getOperation(context.provider, memo)?.status,
        ),
      ).toStrictEqual(['opened', 'opened', 'opened']);
    });

    it('expires stale generated operations and leaves fresh ones untouched', async () => {
      const fresh = buildOperation({
        memo: 'fresh-memo',
        createdAt: NOW + 2 * GENERATED_TTL,
      });
      const context = setup({
        state: stateFor({ operations: [buildOperation(), fresh] }),
      });
      context.clock.now = NOW + GENERATED_TTL + 1;

      await context.provider.recoverOperations({ account: ACCOUNT });

      expect(context.handleRequest).not.toHaveBeenCalled();
      expect(getOperation(context.provider)?.status).toBe('expired');
      expect(getOperation(context.provider)?.transaction).toBeUndefined();
      expect(getOperation(context.provider, 'fresh-memo')).toStrictEqual(fresh);
    });

    it('does not expire a generated operation being signed', async () => {
      const context = setup({
        state: stateFor({ operations: [buildOperation()] }),
      });
      mockHappyPurchase(context);
      const signing = deferred<unknown>();
      context.handleRequest.mockReturnValueOnce(signing.promise);
      const run = context.provider.completePack({
        account: ACCOUNT,
        memo: MEMO,
      });
      context.clock.now = NOW + GENERATED_TTL + 1;

      await context.provider.recoverOperations({ account: ACCOUNT });
      expect(getOperation(context.provider)?.status).toBe('generated');
      signing.resolve({
        signedTransaction: SIGNED_PURCHASE_TX,
        signature: PURCHASE_SIGNATURE,
      });
      await run;

      expect(context.handleRequest).toHaveBeenCalledTimes(1);
      expect(getOperation(context.provider)?.status).toBe('opened');
    });

    it('never throws when every call fails', async () => {
      const context = setup({
        state: stateFor({
          operations: [
            signedOperation(),
            signedOperation({ memo: 'paid-memo', status: 'paid' }),
          ],
        }),
      });
      context.api.submitTransaction.mockRejectedValue(new Error('boom'));
      context.api.getPackStatus.mockRejectedValue(new Error('boom'));
      context.api.openPack.mockRejectedValue(new Error('boom'));

      await expect(
        context.provider.recoverOperations({ account: ACCOUNT }),
      ).resolves.toBeUndefined();

      expect(getOperation(context.provider)).toMatchObject({
        status: 'signed',
        error: { code: 'SUBMIT_FAILED' },
      });
      expect(getOperation(context.provider, 'paid-memo')?.status).toBe('paid');
    });

    it('does nothing for an account without operations', async () => {
      const context = setup();

      await context.provider.recoverOperations({ account: ACCOUNT });

      expect(context.provider.state).toStrictEqual(
        getDefaultCollectorCryptState(),
      );
    });
  });

  describe('syncCards', () => {
    it('keeps NFTs from other providers out of Collector Crypt cards', async () => {
      const { provider, nftApi, api } = setup();
      const unrelatedNft = nftItem(OTHER_MINT);
      unrelatedNft.nft_token.onchain_collection_address = 'another-collection';
      nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT), unrelatedNft]);
      api.getWalletCards.mockResolvedValue([]);
      api.getBuybackAvailability.mockResolvedValue({ available: false });

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards.map(({ mint }) => mint)).toStrictEqual([CARD_MINT]);
      expect(api.getBuybackAvailability).toHaveBeenCalledTimes(1);
      expect(api.getBuybackAvailability).toHaveBeenCalledWith({
        mint: CARD_MINT,
      });
    });

    it('merges NFT API cards with the CollectorCrypt details', async () => {
      const { provider, api, nftApi } = setup();
      nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT, 'Indexed name')]);
      api.getWalletCards.mockResolvedValue([walletCard(CARD_MINT)]);
      api.getBuybackAvailability.mockResolvedValue({ available: false });

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(nftApi.getTokens).toHaveBeenCalledWith({
        address: ACCOUNT.address,
        bypassCache: true,
      });
      expect(api.getWalletCards).toHaveBeenCalledWith({
        address: ACCOUNT.address,
      });
      expect(cards).toStrictEqual([
        {
          mint: CARD_MINT,
          name: 'Indexed name',
          image: `https://nft.test/${CARD_MINT}.png`,
          grade: 'MINT 9',
          gradingCompany: 'PSA',
          insuredValue: 120,
          source: 'nftApi',
          acquiredAt: NOW,
          buyback: { status: 'unavailable', checkedAt: NOW },
        },
      ]);
      expect(getCard(provider)).toStrictEqual(cards[0]);
    });

    it('keeps a freshly opened card while the indexers catch up', async () => {
      const opened = buildCard({
        source: 'openPack',
        acquiredAt: NOW - (INDEXER_GRACE - MINUTE),
        buyback: { status: 'available', amount: OFFER_AMOUNT, checkedAt: NOW },
      });
      const { provider, api, nftApi } = setup({
        state: stateFor({ cards: [opened] }),
      });
      nftApi.getTokens.mockResolvedValue([]);
      api.getWalletCards.mockResolvedValue([]);

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toStrictEqual([opened]);
    });

    it('removes cards the account no longer owns', async () => {
      const { provider, api, nftApi } = setup({
        state: stateFor({
          cards: [
            buildCard({ mint: CARD_MINT }),
            buildCard({
              mint: OTHER_MINT,
              source: 'openPack',
              acquiredAt: NOW - INDEXER_GRACE - 1,
            }),
          ],
        }),
      });
      nftApi.getTokens.mockResolvedValue([]);
      api.getWalletCards.mockResolvedValue([]);

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toStrictEqual([]);
      expect(provider.state.cards[ACCOUNT.address]).toStrictEqual({});
    });

    it('hides a sold card while the indexers still return it, then drops it', async () => {
      const sold = buildCard({
        sale: {
          status: 'completed',
          amount: SALE_AMOUNT,
          signature: SALE_SIGNATURE,
          updatedAt: NOW - MINUTE,
        },
      });
      const { provider, api, nftApi } = setup({
        state: stateFor({ cards: [sold] }),
      });
      nftApi.getTokens.mockResolvedValueOnce([nftItem(CARD_MINT)]);
      api.getWalletCards.mockResolvedValue([]);

      const whileIndexed = await provider.syncCards({ account: ACCOUNT });
      expect(whileIndexed).toStrictEqual([]);
      expect(getCard(provider)).toStrictEqual(sold);
      nftApi.getTokens.mockResolvedValueOnce([]);
      await provider.syncCards({ account: ACCOUNT });

      expect(getCard(provider)).toBeUndefined();
      expect(api.getBuybackAvailability).not.toHaveBeenCalled();
    });

    it('keeps a card with a pending sale when the indexers drop it', async () => {
      const selling = buildPendingSaleCard();
      const { provider, api, nftApi } = setup({
        state: stateFor({ cards: [selling] }),
      });
      nftApi.getTokens.mockResolvedValue([]);
      api.getWalletCards.mockResolvedValue([]);
      api.checkBuyback.mockResolvedValue({ exists: true, isComplete: false });

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toStrictEqual([selling]);
    });

    it('reconciles a confirmed sale after restoring state without signing again', async () => {
      const { provider, api, nftApi, handleRequest } = setup({
        state: stateFor({ cards: [buildPendingSaleCard()] }),
      });
      api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: true,
        signature: SALE_SIGNATURE,
        amount: SALE_AMOUNT,
      });
      nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT)]);
      api.getWalletCards.mockResolvedValue([]);

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toStrictEqual([]);
      expect(getCard(provider)?.sale?.status).toBe('completed');
      expect(api.checkBuyback).toHaveBeenCalledWith({ memo: SALE_MEMO });
      expect(api.createBuyback).not.toHaveBeenCalled();
      expect(api.submitTransaction).not.toHaveBeenCalled();
      expect(handleRequest).not.toHaveBeenCalled();
    });

    it('clears an expired sale absent from the provider without starting another sale', async () => {
      const { provider, api, nftApi, handleRequest, clock } = setup({
        state: stateFor({ cards: [buildPendingSaleCard()] }),
      });
      clock.now = NOW + SIGNED_TTL + 1;
      api.checkBuyback.mockResolvedValue({ exists: false, isComplete: false });
      nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT)]);
      api.getWalletCards.mockResolvedValue([]);
      api.getBuybackAvailability.mockResolvedValue({
        available: true,
        amount: SALE_AMOUNT,
      });

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toHaveLength(1);
      expect(cards[0].sale).toBeUndefined();
      expect(cards[0].buyback.status).toBe('available');
      expect(api.createBuyback).not.toHaveBeenCalled();
      expect(handleRequest).not.toHaveBeenCalled();
    });

    it('keeps an old sale pending when its status check fails', async () => {
      const selling = buildPendingSaleCard();
      const { provider, api, nftApi, clock } = setup({
        state: stateFor({ cards: [selling] }),
      });
      clock.now = NOW + SIGNED_TTL + 1;
      api.checkBuyback.mockRejectedValue(apiError('NETWORK_ERROR'));
      nftApi.getTokens.mockResolvedValue([]);
      api.getWalletCards.mockResolvedValue([]);

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toStrictEqual([selling]);
      expect(api.createBuyback).not.toHaveBeenCalled();
    });

    it('shares an in-flight recovery with a concurrent sell request', async () => {
      const { provider, api, nftApi, handleRequest } = setup({
        state: stateFor({ cards: [buildPendingSaleCard()] }),
      });
      const check =
        deferred<Awaited<ReturnType<CollectorCryptApi['checkBuyback']>>>();
      const checking = deferred<void>();
      api.checkBuyback.mockImplementation(() => {
        checking.resolve();
        return check.promise;
      });
      nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT)]);
      api.getWalletCards.mockResolvedValue([]);

      const sync = provider.syncCards({ account: ACCOUNT });
      await checking.promise;
      const sale = provider.sellCard({ account: ACCOUNT, mint: CARD_MINT });
      check.resolve({
        exists: true,
        isComplete: true,
        signature: SALE_SIGNATURE,
      });
      const [cards, result] = await Promise.all([sync, sale]);

      expect(cards).toStrictEqual([]);
      expect(result.signature).toBe(SALE_SIGNATURE);
      expect(api.checkBuyback).toHaveBeenCalledTimes(1);
      expect(api.createBuyback).not.toHaveBeenCalled();
      expect(handleRequest).not.toHaveBeenCalled();
    });

    it('does not reconcile a sale whose submission is still in flight', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);
      const submission =
        deferred<Awaited<ReturnType<CollectorCryptApi['submitTransaction']>>>();
      const submitting = deferred<void>();
      context.api.submitTransaction.mockImplementation(() => {
        submitting.resolve();
        return submission.promise;
      });
      context.nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT)]);
      context.api.getWalletCards.mockResolvedValue([]);

      const sale = context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
      });
      await submitting.promise;
      await context.provider.syncCards({ account: ACCOUNT });
      submission.resolve({
        signature: SALE_SIGNATURE,
        confirmationStatus: 'confirmed',
      });
      await sale;

      expect(context.api.checkBuyback).not.toHaveBeenCalled();
      expect(context.api.createBuyback).toHaveBeenCalledTimes(1);
      expect(getCard(context.provider)?.sale?.status).toBe('completed');
    });

    it('falls back to the CollectorCrypt cards when the NFT API fails', async () => {
      const { provider, api, nftApi } = setup();
      nftApi.getTokens.mockRejectedValue(apiError('NETWORK_ERROR'));
      api.getWalletCards.mockResolvedValue([walletCard(OTHER_MINT)]);
      api.getBuybackAvailability.mockResolvedValue({ available: false });

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toMatchObject([
        {
          mint: OTHER_MINT,
          name: `Wallet ${OTHER_MINT}`,
          source: 'collectorCryptApi',
        },
      ]);
    });

    it('throws and leaves the state untouched when both indexers fail', async () => {
      const state = stateFor({ cards: [buildCard()] });
      const { provider, api, nftApi } = setup({ state });
      nftApi.getTokens.mockRejectedValue(apiError('NETWORK_ERROR'));
      api.getWalletCards.mockRejectedValue(apiError('RATE_LIMITED', 429));
      const before = provider.state;

      await expect(
        provider.syncCards({ account: ACCOUNT }),
      ).rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });

      expect(provider.state).toBe(before);
      expect(api.getBuybackAvailability).not.toHaveBeenCalled();
    });

    it('refreshes only stale buyback offers', async () => {
      const fresh = buildCard({
        mint: OTHER_MINT,
        buyback: {
          status: 'available',
          amount: OFFER_AMOUNT,
          checkedAt: NOW - MINUTE,
        },
      });
      const stale = buildCard({
        buyback: {
          status: 'available',
          amount: OFFER_AMOUNT,
          checkedAt: NOW - BUYBACK_AVAILABLE_TTL - 1,
        },
      });
      const { provider, api, nftApi } = setup({
        state: stateFor({ cards: [stale, fresh] }),
      });
      nftApi.getTokens.mockResolvedValue([
        nftItem(CARD_MINT),
        nftItem(OTHER_MINT),
      ]);
      api.getWalletCards.mockResolvedValue([]);
      api.getBuybackAvailability.mockResolvedValue({ available: false });

      await provider.syncCards({ account: ACCOUNT });

      expect(api.getBuybackAvailability).toHaveBeenCalledTimes(1);
      expect(api.getBuybackAvailability).toHaveBeenCalledWith({
        mint: CARD_MINT,
      });
      expect(getCard(provider)?.buyback).toStrictEqual({
        status: 'unavailable',
        checkedAt: NOW,
      });
      expect(getCard(provider, OTHER_MINT)?.buyback).toStrictEqual(
        fresh.buyback,
      );
    });

    it('resolves when a buyback refresh fails', async () => {
      const { provider, api, nftApi } = setup();
      nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT)]);
      api.getWalletCards.mockResolvedValue([]);
      api.getBuybackAvailability.mockRejectedValue(apiError('NETWORK_ERROR'));

      const cards = await provider.syncCards({ account: ACCOUNT });

      expect(cards).toMatchObject([
        { mint: CARD_MINT, buyback: { status: 'unknown' } },
      ]);
    });

    it('shares concurrent syncs of the same address', async () => {
      const { provider, api, nftApi } = setup();
      nftApi.getTokens.mockResolvedValue([]);
      api.getWalletCards.mockResolvedValue([]);

      const [first, second] = await Promise.all([
        provider.syncCards({ account: ACCOUNT }),
        provider.syncCards({ account: ACCOUNT }),
      ]);

      expect(first).toBe(second);
      expect(nftApi.getTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshBuyback', () => {
    it('caches the current offer on the card', async () => {
      const { provider, api } = setup({
        state: stateFor({ cards: [buildCard()] }),
      });
      api.getBuybackAvailability.mockResolvedValue({
        available: true,
        amount: OFFER_AMOUNT,
      });

      const buyback = await provider.refreshBuyback({
        account: ACCOUNT,
        mint: CARD_MINT,
      });

      const expected = {
        status: 'available',
        amount: OFFER_AMOUNT,
        checkedAt: NOW,
      };
      expect(buyback).toStrictEqual(expected);
      expect(getCard(provider)?.buyback).toStrictEqual(expected);
    });

    it('rejects with a CollectorCrypt error', async () => {
      const { provider, api } = setup({
        state: stateFor({ cards: [buildCard()] }),
      });
      api.getBuybackAvailability.mockRejectedValue(
        new TypeError('Network request failed'),
      );

      await expect(
        provider.refreshBuyback({ account: ACCOUNT, mint: CARD_MINT }),
      ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('sellCard', () => {
    it('re-checks the offer, signs the API transaction and completes the sale', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);

      const result = await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
      });

      expect(result).toStrictEqual({
        mint: CARD_MINT,
        amount: SALE_AMOUNT,
        signature: SALE_SIGNATURE,
      });
      expect(context.api.getBuybackAvailability).toHaveBeenCalledWith({
        mint: CARD_MINT,
      });
      expect(context.api.createBuyback).toHaveBeenCalledWith({
        playerAddress: ACCOUNT.address,
        mint: CARD_MINT,
      });
      expect(context.handleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            params: {
              accountId: ACCOUNT.id,
              transaction: SALE_TX,
              scope: SolScope.Mainnet,
            },
          }),
        }),
      );
      expect(context.api.submitTransaction).toHaveBeenCalledWith({
        signedTransaction: SIGNED_SALE_TX,
      });
      expect(getCard(context.provider)?.sale).toStrictEqual({
        status: 'completed',
        amount: SALE_AMOUNT,
        signature: SALE_SIGNATURE,
        memo: SALE_MEMO,
        updatedAt: NOW,
      });
    });

    it('hides the sold card', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);
      context.api.getWalletCards.mockResolvedValue([]);
      context.nftApi.getTokens.mockResolvedValue([nftItem(CARD_MINT)]);

      await context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT });

      await expect(
        context.provider.syncCards({ account: ACCOUNT }),
      ).resolves.toStrictEqual([]);
    });

    it('rejects when the offer is no longer available', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      context.api.getBuybackAvailability.mockResolvedValue({
        available: false,
      });

      await expect(
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
      ).rejects.toMatchObject({ code: 'BUYBACK_UNAVAILABLE' });

      expect(context.api.createBuyback).not.toHaveBeenCalled();
      expect(getCard(context.provider)?.sale).toBeUndefined();
      expect(getCard(context.provider)?.buyback.status).toBe('unavailable');
    });

    it('clears the sale when signing fails', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);
      context.handleRequest.mockRejectedValue(new Error('User rejected'));

      await expect(
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
      ).rejects.toMatchObject({ code: 'SIGNING_REJECTED' });

      expect(context.api.submitTransaction).not.toHaveBeenCalled();
      expect(getCard(context.provider)?.sale).toBeUndefined();
    });

    it('completes the sale when the submission failed but CollectorCrypt saw it', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);
      context.api.submitTransaction.mockRejectedValue(
        apiError('NETWORK_ERROR'),
      );
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: true,
        signature: SALE_SIGNATURE,
        amount: SALE_AMOUNT,
      });

      const result = await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
      });

      expect(context.api.checkBuyback).toHaveBeenCalledWith({
        memo: SALE_MEMO,
      });
      expect(result.signature).toBe(SALE_SIGNATURE);
      expect(getCard(context.provider)?.sale?.status).toBe('completed');
    });

    it('keeps the signed sale pending when the submission outcome is unknown', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);
      context.api.submitTransaction.mockRejectedValue(
        apiError('SUBMIT_FAILED', 500),
      );
      context.api.checkBuyback.mockResolvedValue({
        exists: false,
        isComplete: false,
      });

      await expect(
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
      ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });

      expect(getCard(context.provider)?.sale).toStrictEqual({
        status: 'pending',
        amount: SALE_AMOUNT,
        memo: SALE_MEMO,
        signature: SALE_SIGNATURE,
        updatedAt: NOW,
      });
    });

    it('clears the sale when CollectorCrypt refused the submission', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);
      context.api.submitTransaction.mockRejectedValue(
        apiError('SUBMIT_FAILED', 400),
      );
      context.api.checkBuyback.mockRejectedValue(apiError('NETWORK_ERROR'));

      await expect(
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
      ).rejects.toMatchObject({ code: 'SUBMIT_FAILED' });

      expect(getCard(context.provider)?.sale).toBeUndefined();
    });

    it('completes a pending sale CollectorCrypt confirmed, without a new buyback', async () => {
      const context = setup({
        state: stateFor({
          cards: [
            buildCard({
              sale: {
                status: 'pending',
                amount: SALE_AMOUNT,
                memo: SALE_MEMO,
                signature: SALE_SIGNATURE,
                updatedAt: NOW,
              },
            }),
          ],
        }),
      });
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: true,
        signature: SALE_SIGNATURE,
        amount: SALE_AMOUNT,
      });

      const result = await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
      });

      expect(result).toStrictEqual({
        mint: CARD_MINT,
        amount: SALE_AMOUNT,
        signature: SALE_SIGNATURE,
      });
      expect(context.api.createBuyback).not.toHaveBeenCalled();
      expect(context.handleRequest).not.toHaveBeenCalled();
    });

    it('refuses a new sale while a recent one is still pending', async () => {
      const context = setup({
        state: stateFor({
          cards: [
            buildCard({
              sale: {
                status: 'pending',
                amount: SALE_AMOUNT,
                memo: SALE_MEMO,
                updatedAt: NOW,
              },
            }),
          ],
        }),
      });
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: false,
      });
      context.clock.now = NOW + SIGNED_TTL - 1;

      await expect(
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
      ).rejects.toMatchObject({ code: 'SALE_PENDING' });

      expect(context.api.createBuyback).not.toHaveBeenCalled();
    });

    it('starts a new sale once a pending one is too old to land', async () => {
      const context = setup({
        state: stateFor({
          cards: [
            buildCard({
              sale: {
                status: 'pending',
                amount: SALE_AMOUNT,
                memo: SALE_MEMO,
                updatedAt: NOW,
              },
            }),
          ],
        }),
      });
      mockHappySale(context);
      context.api.checkBuyback.mockResolvedValue({
        exists: false,
        isComplete: false,
      });
      context.clock.now = NOW + SIGNED_TTL + 1;

      await context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT });

      expect(context.api.createBuyback).toHaveBeenCalledTimes(1);
      expect(getCard(context.provider)?.sale?.status).toBe('completed');
    });

    it('rejects an unknown or already sold card', async () => {
      const context = setup({
        state: stateFor({
          cards: [
            buildCard({
              sale: {
                status: 'completed',
                amount: SALE_AMOUNT,
                updatedAt: NOW,
              },
            }),
          ],
        }),
      });

      await expect(
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(
        context.provider.sellCard({ account: ACCOUNT, mint: OTHER_MINT }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(context.api.createBuyback).not.toHaveBeenCalled();
    });

    it('shares concurrent sales of the same card', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });
      mockHappySale(context);

      const [first, second] = await Promise.all([
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
        context.provider.sellCard({ account: ACCOUNT, mint: CARD_MINT }),
      ]);

      expect(first).toBe(second);
      expect(context.api.createBuyback).toHaveBeenCalledTimes(1);
      expect(context.handleRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('per-account state', () => {
    it('keeps operations and cards of each account apart', async () => {
      const context = setup({
        state: stateFor({ cards: [buildCard()] }),
      });
      context.api.generatePack.mockResolvedValue({
        memo: MEMO,
        transaction: PURCHASE_TX,
      });
      context.nftApi.getTokens.mockResolvedValue([nftItem(OTHER_MINT)]);
      context.api.getWalletCards.mockResolvedValue([]);
      context.api.getBuybackAvailability.mockResolvedValue({
        available: false,
      });

      await context.provider.generatePack({ account: ACCOUNT, pack: PACK });
      const otherCards = await context.provider.syncCards({
        account: OTHER_ACCOUNT,
      });

      expect(otherCards.map(({ mint }) => mint)).toStrictEqual([OTHER_MINT]);
      expect(
        Object.keys(context.provider.state.cards[ACCOUNT.address]),
      ).toStrictEqual([CARD_MINT]);
      expect(
        context.provider.state.operations[OTHER_ACCOUNT.address],
      ).toBeUndefined();
    });

    it('never completes or dismisses an operation of another account', async () => {
      const operation = buildOperation({ status: 'expired' });
      const context = setup({
        state: stateFor({ operations: [operation] }),
      });

      await expect(
        context.provider.completePack({ account: OTHER_ACCOUNT, memo: MEMO }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      context.provider.dismissOperation({
        account: OTHER_ACCOUNT,
        memo: MEMO,
      });

      expect(getOperation(context.provider)).toStrictEqual(operation);
    });

    it('never sells a card of another account', async () => {
      const context = setup({ state: stateFor({ cards: [buildCard()] }) });

      await expect(
        context.provider.sellCard({
          account: OTHER_ACCOUNT,
          mint: CARD_MINT,
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(context.api.createBuyback).not.toHaveBeenCalled();
    });
  });

  describe('clearState', () => {
    it('resets the state', () => {
      const { provider } = setup({
        state: stateFor({
          operations: [buildOperation()],
          cards: [buildCard()],
        }),
      });

      provider.clearState();

      expect(provider.state).toStrictEqual(getDefaultCollectorCryptState());
    });
  });

  describe('error reporting', () => {
    it('sends unexpected errors to Sentry', async () => {
      const { provider, api } = setup();
      api.getMachines.mockRejectedValue(new Error('boom'));
      api.getStatus.mockResolvedValue(create(statusFixture, CcStatusStruct));

      await expect(provider.getPacks()).rejects.toMatchObject({
        code: 'UNKNOWN',
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNKNOWN' }),
        expect.objectContaining({ tags: { feature: 'CollectorCrypt' } }),
      );
    });

    it('keeps expected and retryable errors out of Sentry', async () => {
      const { provider, api } = setup();
      api.generatePack.mockRejectedValue(apiError('MACHINE_UNAVAILABLE', 500));

      await expect(
        provider.generatePack({ account: ACCOUNT, pack: PACK }),
      ).rejects.toMatchObject({ code: 'MACHINE_UNAVAILABLE' });

      expect(loggerErrorSpy).not.toHaveBeenCalled();
      expect(devLogSpy).toHaveBeenCalled();
    });
  });
});
