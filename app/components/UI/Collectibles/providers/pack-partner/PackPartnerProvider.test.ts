import { createNextState } from '@reduxjs/toolkit';
import { SolScope } from '@metamask/keyring-api';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import { HandlerType } from '@metamask/snaps-utils';
import { create } from '@metamask/superstruct';
import { createDeferredPromise } from '@metamask/utils';

import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { SOLANA_WALLET_SNAP_ID } from '../../../../../core/SnapKeyring/SolanaWalletSnap';
import Logger from '../../../../../util/Logger';
import {
  PACK_PARTNER_TIMINGS,
  MAX_MULTIPACK_COUNT,
} from './constants/packPartner';
import { type PackPartnerEnvironment } from './constants/environment';
import { PpNftWonStruct } from './schemas/packPartner';
import { nftWon } from './services/api.fixtures';
import type {
  PackPartnerApi,
  OpenPackResult,
  PackStatus,
} from '../../services/clients/PackPartnerApiClient';
import { createPackPartnerError } from './services/errors';
import type {
  PackPartnerBuybackOperation,
  PackPartnerErrorCode,
  PackPartnerNftStandard,
  PackPartnerPackRef,
  PackPartnerPackOperation,
  PackPartnerAccount,
} from './types/packPartner';
import { PackPartnerProvider } from './PackPartnerProvider';
import { getDefaultPackPartnerState, type PackPartnerState } from './state';

type HandleRequest = SnapControllerHandleRequestAction['handler'];
type QueryFamily = readonly [string, ...string[]];

const { GENERATED_TTL, OPEN_POLL_ATTEMPTS, OPEN_POLL_INTERVAL, OPEN_WINDOW } =
  PACK_PARTNER_TIMINGS;

const NOW = Date.parse('2026-09-29T12:00:00.000Z');
const MINUTE = 60_000;

const ACCOUNT: PackPartnerAccount = {
  id: '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91',
  address: '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
};
const OTHER_ACCOUNT: PackPartnerAccount = {
  id: '7d2e9a41-5b3c-4f6e-8a1d-0c9b8e7f6a52',
  address: '7cjEct8b9jCAyQaCTefikqXkh9iU3j8BaUVdX7pWf3Lc',
};

const PACK: PackPartnerPackRef = {
  code: 'pokemon_25',
  name: 'Pokemon 25',
  price: 25,
  priceAmount: '25000000',
};
const MEMO = 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a';
const SECOND_MEMO = 'cc-2b6f0a4e-91d3-4c7a-8e5f-3d1c9b7a6e42';
const BATCH_ID = 'yolo-4f2a9c1e';
const SALE_MEMO = 'cc-11111111-2222-4333-8444-555555555555';
const PURCHASE_SIGNATURE = 'purchase-signature';
const SALE_SIGNATURE = 'sale-signature';
const CARD_MINT = 'H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1';
const OTHER_MINT = '9iQWVTEBXJmw7N5ZoPE1njuijtfAcXsDhUzwDY88ZBoh';
const SALE_AMOUNT = '19550000';
const OFFER_AMOUNT = '42500000';

const NFT_WON = create(nftWon, PpNftWonStruct);

// Transactions are opaque payloads passed between the API and the Snap.
const PURCHASE_TX = 'cHVyY2hhc2UtdHJhbnNhY3Rpb24=';
const SALE_TX = 'c2FsZS10cmFuc2FjdGlvbg==';
const SIGNED_PURCHASE_TX = 'c2lnbmVkLXB1cmNoYXNlLXRyYW5zYWN0aW9u';
const SIGNED_SALE_TX = 'c2lnbmVkLXNhbGUtdHJhbnNhY3Rpb24=';

/** Families `PackPartnerDataService` reads are refreshed through. */
const OWNED_CARDS_FAMILY = [
  'PackPartnerDataService:getOwnedCards',
  'mainnet',
  ACCOUNT.address,
];
const OFFER_FAMILY = [
  'PackPartnerDataService:getBuybackOffer',
  'mainnet',
  CARD_MINT,
];

const createApi = (): jest.Mocked<PackPartnerApi> => ({
  getInventory: jest.fn(),
  getRecentOpenings: jest.fn(),
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

/**
 * Copy without the `undefined` fields, so overrides can remove a field.
 *
 * @param value - Record to compact.
 * @returns The compacted record.
 */
const compact = <Value extends object>(value: Value): Value =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Value;

const buildOperation = (
  overrides: Partial<PackPartnerPackOperation> = {},
): PackPartnerPackOperation =>
  compact({
    memo: MEMO,
    packCode: PACK.code,
    packName: PACK.name,
    price: PACK.price,
    priceAmount: PACK.priceAmount,
    status: 'generated',
    createdAt: NOW,
    updatedAt: NOW,
    transaction: PURCHASE_TX,
    ...overrides,
  });

/** Purchase signed and handed to PackPartner: only its memo remains. */
const submittedOperation = (
  overrides: Partial<PackPartnerPackOperation> = {},
): PackPartnerPackOperation =>
  buildOperation({ status: 'submitted', transaction: undefined, ...overrides });

const buildSale = (
  overrides: Partial<PackPartnerBuybackOperation> = {},
): PackPartnerBuybackOperation =>
  compact({
    mint: CARD_MINT,
    memo: SALE_MEMO,
    status: 'pending',
    amount: SALE_AMOUNT,
    submissionAttempted: true,
    signature: SALE_SIGNATURE,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
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

const apiError = (code: PackPartnerErrorCode, status?: number) =>
  createPackPartnerError({ code, status });

/**
 * `/submitTransaction` 4xx, as the API client maps it: a rate limit stays
 * retryable at the HTTP level although nothing was sent.
 *
 * @param code - Mapped code.
 * @param status - HTTP status.
 * @returns The refusal.
 */
const submissionRefusal = (
  code: 'SUBMIT_FAILED' | 'RATE_LIMITED',
  status: number,
) =>
  createPackPartnerError({
    code,
    status,
    retryable: code === 'RATE_LIMITED',
    context: 'POST /submitTransaction',
  });

/**
 * Journal of one account.
 *
 * @param params - Content.
 * @param params.operations - Purchases of the account.
 * @param params.sales - Buybacks of the account.
 * @param params.address - Account address.
 * @returns The provider state.
 */
const stateFor = ({
  operations = [],
  sales = [],
  address = ACCOUNT.address,
}: {
  operations?: PackPartnerPackOperation[];
  sales?: PackPartnerBuybackOperation[];
  address?: string;
}): PackPartnerState => ({
  operations: operations.length
    ? {
        [address]: Object.fromEntries(
          operations.map((operation) => [operation.memo, operation]),
        ),
      }
    : {},
  sales: sales.length
    ? { [address]: Object.fromEntries(sales.map((sale) => [sale.mint, sale])) }
    : {},
});

const setup = ({
  state,
  environment = 'mainnet',
}: {
  state?: Partial<PackPartnerState>;
  environment?: PackPartnerEnvironment;
} = {}) => {
  let currentState: PackPartnerState = {
    ...getDefaultPackPartnerState(),
    ...state,
  };
  // Every state written through `updateState`, in order.
  const snapshots: PackPartnerState[] = [];
  const listeners: ((state: PackPartnerState) => void)[] = [];
  const subscribe = (listener: (state: PackPartnerState) => void) => {
    listeners.push(listener);
  };
  const handleRequest = jest.fn<
    ReturnType<HandleRequest>,
    Parameters<HandleRequest>
  >();
  const api = createApi();
  const invalidateQueries = jest
    .fn<Promise<void>, [QueryFamily]>()
    .mockResolvedValue(undefined);
  const clock = { now: NOW };
  const sleep = jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined);
  const provider = new PackPartnerProvider({
    getState: () => currentState,
    updateState: (recipe) => {
      currentState = createNextState(currentState, recipe);
      snapshots.push(currentState);
      listeners.forEach((listener) => listener(currentState));
    },
    requestSnap: handleRequest,
    api,
    invalidateQueries,
    environment,
    now: () => clock.now,
    sleep,
  });
  return {
    provider,
    subscribe,
    snapshots,
    handleRequest,
    api,
    invalidateQueries,
    clock,
    sleep,
  };
};

type Setup = ReturnType<typeof setup>;

/** Snap signs the purchase, PackPartner confirms it and awards the card. */
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
};

/** PackPartner builds the real buyback, Snap signs, submission succeeds. */
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
  provider: PackPartnerProvider,
  memo = MEMO,
  address = ACCOUNT.address,
): PackPartnerPackOperation | undefined =>
  provider.state.operations[address]?.[memo];

const getSale = (
  provider: PackPartnerProvider,
  mint = CARD_MINT,
  address = ACCOUNT.address,
): PackPartnerBuybackOperation | undefined =>
  provider.state.sales[address]?.[mint];

/** Every state the provider wrote, serialized for content checks. */
const writtenStates = ({ snapshots }: Setup): string =>
  JSON.stringify(snapshots);

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

/** Lets every pending promise callback run. */
const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const REFRESH_FAILURE_MESSAGE =
  'Collectibles: failed to refresh PackPartner reads after an operation';

/** Ways `invalidateQueries` can fail: neither may fail the outcome. */
const refreshFailures: [
  string,
  (invalidate: Setup['invalidateQueries']) => void,
][] = [
  [
    'rejects',
    (invalidate) => {
      invalidate.mockRejectedValue(new Error('cache down'));
    },
  ],
  [
    'throws synchronously',
    (invalidate) => {
      invalidate.mockImplementation(() => {
        throw new Error('cache down');
      });
    },
  ],
];

/** Buyback context the Snap validates before signing. */
const buybackSnapContext = (
  expectedStandard: PackPartnerNftStandard,
  mint = CARD_MINT,
) =>
  expect.objectContaining({
    request: expect.objectContaining({
      method: 'signPackPartnerBuyback',
      params: expect.objectContaining({
        context: {
          amount: SALE_AMOUNT,
          assetAddress: mint,
          expectedStandard,
        },
      }),
    }),
  });

describe('PackPartnerProvider', () => {
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

      expect(provider.state).toStrictEqual(getDefaultPackPartnerState());
    });

    it('keeps the given journal', () => {
      const state = stateFor({
        operations: [submittedOperation()],
        sales: [buildSale()],
      });

      const { provider } = setup({ state });

      expect(provider.state).toStrictEqual(state);
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

    it('stores every pack of a reviewed batch under its batch id', async () => {
      const { provider, api } = setup();
      api.generatePacks.mockResolvedValue({
        yoloId: BATCH_ID,
        transactions: [
          { memo: MEMO, transaction: PURCHASE_TX },
          { memo: SECOND_MEMO, transaction: PURCHASE_TX },
        ],
      });

      const memo = await provider.generatePack({
        account: ACCOUNT,
        pack: PACK,
        options: { quantity: 2, turbo: true },
      });

      expect(memo).toBe(MEMO);
      expect(api.generatePacks).toHaveBeenCalledWith({
        playerAddress: ACCOUNT.address,
        packType: PACK.code,
        count: 2,
        turbo: true,
      });
      expect(getOperation(provider, SECOND_MEMO)).toStrictEqual(
        buildOperation({
          memo: SECOND_MEMO,
          batchMemos: [MEMO, SECOND_MEMO],
          batchId: BATCH_ID,
          turbo: true,
        }),
      );
    });

    it.each([0, 1.5, MAX_MULTIPACK_COUNT + 1])(
      'rejects a quantity of %s without calling PackPartner',
      async (quantity) => {
        const { provider, api } = setup();

        await expect(
          provider.generatePack({
            account: ACCOUNT,
            pack: PACK,
            options: { quantity, turbo: false },
          }),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

        expect(api.generatePack).not.toHaveBeenCalled();
        expect(api.generatePacks).not.toHaveBeenCalled();
      },
    );

    it('stores the reviewed base-unit price as the amount to sign', async () => {
      const { provider, api } = setup();
      api.generatePack.mockResolvedValue({
        memo: MEMO,
        transaction: PURCHASE_TX,
      });

      await provider.generatePack({
        account: ACCOUNT,
        pack: { ...PACK, price: 12.5, priceAmount: '12500000' },
      });

      expect(getOperation(provider)).toMatchObject({
        price: 12.5,
        priceAmount: '12500000',
      });
    });

    // Pack data cached by an earlier build carries no base-unit price.
    const { priceAmount: _priceAmount, ...packWithoutAmount } = PACK;

    it.each<[string, PackPartnerPackRef]>([
      ['a missing', packWithoutAmount as PackPartnerPackRef],
      ['an empty', { ...PACK, priceAmount: '' }],
      ['a zero', { ...PACK, priceAmount: '0' }],
      ['a decimal', { ...PACK, priceAmount: '25000000.5' }],
      ['a negative', { ...PACK, priceAmount: '-25000000' }],
      ['an exponent', { ...PACK, priceAmount: '25e6' }],
    ])(
      'rejects %s priceAmount without calling PackPartner',
      async (_label, pack) => {
        const { provider, api } = setup();

        await expect(
          provider.generatePack({ account: ACCOUNT, pack }),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
        await expect(
          provider.generatePack({
            account: ACCOUNT,
            pack,
            options: { quantity: 2, turbo: false },
          }),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

        expect(api.generatePack).not.toHaveBeenCalled();
        expect(api.generatePacks).not.toHaveBeenCalled();
        expect(provider.state.operations).toStrictEqual({});
      },
    );

    it('stores nothing when PackPartner refuses', async () => {
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
      it('signs silently, records the purchase submitted, pays and opens after the webhook', async () => {
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
            method: 'signPackPartnerBuy',
            params: {
              accountId: ACCOUNT.id,
              transaction: PURCHASE_TX,
              scope: SolScope.Mainnet,
              context: { amount: PACK.priceAmount },
            },
          },
        });
        expect(api.submitTransaction).toHaveBeenCalledWith({
          signedTransaction: SIGNED_PURCHASE_TX,
        });
        expect(api.openPack).toHaveBeenCalledTimes(3);
        expect(sleep).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledWith(OPEN_POLL_INTERVAL);
        expect(statuses).toStrictEqual(['submitted', 'paid', 'opened']);
        expect(card).toMatchObject({
          mint: CARD_MINT,
          memo: MEMO,
          packCode: PACK.code,
          rarity: 'rare',
          acquiredAt: NOW,
          buyback: { status: 'available', amount: OFFER_AMOUNT },
        });
      });

      it('signs the amount stored on the operation, not one derived from its display price', async () => {
        const context = setup({
          state: stateFor({
            operations: [
              buildOperation({ price: 25, priceAmount: '24990000' }),
            ],
          }),
        });
        mockHappyPurchase(context);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(context.handleRequest).toHaveBeenCalledWith(
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

      it('stores the opened operation with its card as result and no transaction', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(getOperation(context.provider)).toStrictEqual({
          memo: MEMO,
          packCode: PACK.code,
          packName: PACK.name,
          price: PACK.price,
          priceAmount: PACK.priceAmount,
          status: 'opened',
          createdAt: NOW,
          updatedAt: NOW,
          mint: CARD_MINT,
          result: card,
        });
      });

      it('refreshes the owned-card read of the account without checking the buyback', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(context.invalidateQueries).toHaveBeenCalledTimes(1);
        expect(context.invalidateQueries).toHaveBeenCalledWith(
          OWNED_CARDS_FAMILY,
        );
        expect(context.api.getBuybackAvailability).not.toHaveBeenCalled();
      });

      it('scopes the owned-card refresh by environment', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
          environment: 'devnet',
        });
        mockHappyPurchase(context);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(context.invalidateQueries).toHaveBeenCalledWith([
          'PackPartnerDataService:getOwnedCards',
          'devnet',
          ACCOUNT.address,
        ]);
      });

      it.each(refreshFailures)(
        'resolves with the card and logs when the read refresh %s',
        async (_label, failRefresh) => {
          const context = setup({
            state: stateFor({ operations: [buildOperation()] }),
          });
          mockHappyPurchase(context);
          failRefresh(context.invalidateQueries);

          const card = await context.provider.completePack({
            account: ACCOUNT,
            memo: MEMO,
          });
          await flushPromises();

          expect(card.mint).toBe(CARD_MINT);
          expect(getOperation(context.provider)?.status).toBe('opened');
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.any(Error),
            REFRESH_FAILURE_MESSAGE,
          );
        },
      );

      it('records the purchase submitted, without any transaction, before calling submitTransaction', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        let atSubmission: PackPartnerPackOperation | undefined;
        context.api.submitTransaction.mockImplementation(async () => {
          atSubmission = getOperation(context.provider);
          return {
            signature: PURCHASE_SIGNATURE,
            confirmationStatus: 'confirmed',
          };
        });

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(atSubmission).toStrictEqual(submittedOperation());
      });

      it('never writes the signed purchase to state', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(context.snapshots.length).toBeGreaterThan(0);
        expect(writtenStates(context)).not.toContain(SIGNED_PURCHASE_TX);
        expect(writtenStates(context)).not.toContain('signedTransaction');
      });

      it('keeps the purchase submitted when PackPartner only submitted the payment', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockResolvedValue({
          signature: PURCHASE_SIGNATURE,
          confirmationStatus: 'submitted',
        });
        const statuses = recordStatuses(context.subscribe);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(statuses).toStrictEqual(['submitted', 'opened']);
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

      it('reports a snap without the guarded buy method', async () => {
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

    describe('submission failure', () => {
      it('continues to the opening when the pack status shows the payment landed', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockRejectedValue(
          apiError('NETWORK_ERROR'),
        );
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );
        const statuses = recordStatuses(context.subscribe);

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(card.mint).toBe(CARD_MINT);
        expect(context.api.getPackStatus).toHaveBeenCalledWith({ memo: MEMO });
        expect(statuses).toStrictEqual(['submitted', 'paid', 'opened']);
      });

      it.each([
        submissionRefusal('SUBMIT_FAILED', 400),
        submissionRefusal('SUBMIT_FAILED', 409),
        submissionRefusal('RATE_LIMITED', 429),
      ])(
        'keeps a submission ambiguous after HTTP $status until status reconciliation',
        async (refusal) => {
          const context = setup({
            state: stateFor({ operations: [buildOperation()] }),
          });
          mockHappyPurchase(context);
          context.api.submitTransaction.mockRejectedValue(refusal);
          context.api.getPackStatus.mockResolvedValue(packStatus());

          const failure = context.provider
            .completePack({ account: ACCOUNT, memo: MEMO })
            .catch((error: unknown) => error);
          const error = await failure;

          expect(error).toBe(refusal);
          expect(getOperation(context.provider)).toMatchObject({
            status: 'submitted',
            error: { code: refusal.code },
          });
          expect(context.api.openPack).not.toHaveBeenCalled();
        },
      );

      it('opens a refused submission whose payment landed anyway', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockRejectedValue(
          submissionRefusal('SUBMIT_FAILED', 400),
        );
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(card.mint).toBe(CARD_MINT);
        expect(getOperation(context.provider)?.status).toBe('opened');
      });

      it('keeps the purchase submitted and rethrows a server-side submission failure', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockRejectedValue(
          apiError('SUBMIT_FAILED', 500),
        );
        context.api.getPackStatus.mockResolvedValue(packStatus());

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'SUBMIT_FAILED' });

        expect(getOperation(context.provider)).toStrictEqual(
          submittedOperation({ error: { code: 'SUBMIT_FAILED' } }),
        );
        expect(context.api.openPack).not.toHaveBeenCalled();
        expect(writtenStates(context)).not.toContain(SIGNED_PURCHASE_TX);
      });

      it('keeps the purchase submitted when the pack status is unavailable too', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockRejectedValue(
          apiError('NETWORK_ERROR'),
        );
        context.api.getPackStatus.mockRejectedValue(apiError('NETWORK_ERROR'));

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

        expect(getOperation(context.provider)?.status).toBe('submitted');
      });

      it('opens a submitted purchase on retry without signing or submitting again', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.submitTransaction.mockRejectedValueOnce(
          apiError('SUBMIT_FAILED', 500),
        );
        context.api.getPackStatus.mockResolvedValue(packStatus());
        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'SUBMIT_FAILED' });

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(context.handleRequest).toHaveBeenCalledTimes(1);
        expect(context.api.submitTransaction).toHaveBeenCalledTimes(1);
        expect(getOperation(context.provider)?.status).toBe('opened');
      });
    });

    describe('opening', () => {
      it('marks the pack paid when PackPartner is sending the card', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        mockHappyPurchase(context);
        context.api.openPack
          .mockResolvedValueOnce(pending('SEND_PENDING'))
          .mockResolvedValueOnce(awarded());
        const statuses = recordStatuses(context.subscribe);

        await context.provider.completePack({ account: ACCOUNT, memo: MEMO });

        expect(statuses).toStrictEqual(['paid', 'opened']);
        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.api.submitTransaction).not.toHaveBeenCalled();
      });

      it('keeps polling while the purchase is not on-chain yet (404)', async () => {
        const context = setup({
          state: stateFor({
            operations: [submittedOperation({ status: 'paid' })],
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
            operations: [submittedOperation({ status: 'paid' })],
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
          state: stateFor({ operations: [submittedOperation()] }),
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

      it('keeps a submitted pack submitted when polling is exhausted before the payment webhook', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        context.api.openPack.mockResolvedValue(pending());
        context.api.getPackStatus.mockResolvedValue(packStatus());

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING' });

        expect(getOperation(context.provider)?.status).toBe('submitted');
      });

      it('stores other openPack errors on the operation', async () => {
        const context = setup({
          state: stateFor({
            operations: [submittedOperation({ status: 'paid' })],
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

    describe('openPack answers 400', () => {
      it('opens a delivered pack from its status and stores the card as result', async () => {
        const context = setup({
          state: stateFor({
            operations: [submittedOperation({ status: 'paid' })],
          }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(
          packStatus({
            isPaid: true,
            isDelivered: true,
            mint: CARD_MINT,
            rarity: 'epic',
            insuredValue: 300,
          }),
        );
        context.clock.now = NOW + 10 * MINUTE;

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(card).toStrictEqual({
          mint: CARD_MINT,
          name: PACK.name,
          insuredValue: 300,
          rarity: 'epic',
          memo: MEMO,
          packCode: PACK.code,
          acquiredAt: NOW + 10 * MINUTE,
          buyback: { status: 'unknown' },
        });
        expect(getOperation(context.provider)).toMatchObject({
          status: 'opened',
          mint: CARD_MINT,
          result: card,
        });
        expect(context.invalidateQueries).toHaveBeenCalledWith(
          OWNED_CARDS_FAMILY,
        );
        expect(context.api.getBuybackAvailability).not.toHaveBeenCalled();
      });

      it('fails a refunded pack', async () => {
        const context = setup({
          state: stateFor({
            operations: [submittedOperation({ status: 'paid' })],
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
        expect(context.invalidateQueries).not.toHaveBeenCalled();
      });

      it('marks a paid pack paid and waits for its refund', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING', retryable: true });

        expect(getOperation(context.provider)?.status).toBe('paid');
        expect(context.api.openPack).toHaveBeenCalledTimes(1);
      });

      it('keeps an unpaid pack submitted until the opening window closes', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + OPEN_WINDOW;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING', retryable: true });

        expect(getOperation(context.provider)?.status).toBe('submitted');
      });

      it('expires an unpaid pack once the opening window has closed', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        context.api.openPack.mockImplementation(() => {
          context.clock.now = NOW + OPEN_WINDOW + 1;
          return Promise.reject(apiError('NOT_FOUND', 400));
        });
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + OPEN_WINDOW;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_EXPIRED' });

        expect(getOperation(context.provider)?.status).toBe('expired');
      });
    });

    describe('past the opening window', () => {
      it.each(['submitted', 'paid'] as const)(
        'reads the pack status of a %s purchase without polling openPack',
        async (status) => {
          const context = setup({
            state: stateFor({ operations: [submittedOperation({ status })] }),
          });
          context.api.getPackStatus.mockResolvedValue(
            packStatus({ isPaid: true }),
          );
          context.clock.now = NOW + OPEN_WINDOW + 1;

          await expect(
            context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
          ).rejects.toMatchObject({ code: 'OPEN_PENDING' });

          expect(context.api.getPackStatus).toHaveBeenCalledWith({
            memo: MEMO,
          });
          expect(context.api.openPack).not.toHaveBeenCalled();
          expect(context.sleep).not.toHaveBeenCalled();
        },
      );

      it('expires a purchase PackPartner never saw paid', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + OPEN_WINDOW + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_EXPIRED' });

        expect(getOperation(context.provider)).toMatchObject({
          status: 'expired',
          error: { code: 'PACK_EXPIRED' },
        });
      });

      it('keeps a paid purchase paid until its refund is confirmed', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true }),
        );
        context.clock.now = NOW + OPEN_WINDOW + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING', retryable: true });

        expect(getOperation(context.provider)?.status).toBe('paid');
      });

      it('keeps a purchase PackPartner confirmed on submission paid when its pack status is unpaid', async () => {
        const context = setup({
          state: stateFor({
            operations: [submittedOperation({ status: 'paid' })],
          }),
        });
        context.api.getPackStatus.mockResolvedValue(packStatus());
        context.clock.now = NOW + OPEN_WINDOW + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'OPEN_PENDING', retryable: true });

        expect(getOperation(context.provider)).toMatchObject({
          status: 'paid',
          error: { code: 'OPEN_PENDING' },
        });
        expect(context.api.openPack).not.toHaveBeenCalled();
      });

      it('opens a delivered purchase from its status', async () => {
        const context = setup({
          state: stateFor({ operations: [submittedOperation()] }),
        });
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true, isDelivered: true, mint: CARD_MINT }),
        );
        context.clock.now = NOW + OPEN_WINDOW + 1;

        const card = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(card.mint).toBe(CARD_MINT);
        expect(getOperation(context.provider)).toMatchObject({
          status: 'opened',
          result: card,
        });
      });

      it('fails a refunded purchase', async () => {
        const context = setup({
          state: stateFor({
            operations: [submittedOperation({ status: 'paid' })],
          }),
        });
        context.api.getPackStatus.mockResolvedValue(
          packStatus({ isPaid: true, isRefunded: true }),
        );
        context.clock.now = NOW + OPEN_WINDOW + 1;

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'PACK_FAILED' });

        expect(getOperation(context.provider)?.status).toBe('failed');
      });
    });

    describe('terminal', () => {
      it('returns the result of an opened pack without any call', async () => {
        const card = {
          mint: CARD_MINT,
          name: PACK.name,
          memo: MEMO,
          packCode: PACK.code,
          acquiredAt: NOW,
          buyback: { status: 'unknown' as const },
        };
        const context = setup({
          state: stateFor({
            operations: [
              buildOperation({
                status: 'opened',
                transaction: undefined,
                mint: CARD_MINT,
                result: card,
              }),
            ],
          }),
        });

        const result = await context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });

        expect(result).toStrictEqual(card);
        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.api.openPack).not.toHaveBeenCalled();
        expect(context.api.getPackStatus).not.toHaveBeenCalled();
      });

      it('rejects an opened pack without result with NOT_FOUND', async () => {
        const context = setup({
          state: stateFor({
            operations: [
              buildOperation({
                status: 'opened',
                transaction: undefined,
                mint: CARD_MINT,
              }),
            ],
          }),
        });

        await expect(
          context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });

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

  describe('completePacks', () => {
    const batchOperation = (
      memo: string,
      memos: string[],
    ): PackPartnerPackOperation =>
      buildOperation({ memo, batchMemos: memos, batchId: BATCH_ID });

    it('pays and opens every pack of the batch with its card as result', async () => {
      const memos = [MEMO, SECOND_MEMO];
      const context = setup({
        state: stateFor({
          operations: memos.map((memo) => batchOperation(memo, memos)),
        }),
      });
      mockHappyPurchase(context);
      context.api.openPack.mockImplementation(async ({ memo }) =>
        awarded(memo === MEMO ? CARD_MINT : OTHER_MINT),
      );

      await context.provider.completePacks({ account: ACCOUNT, memo: MEMO });

      expect(context.handleRequest).toHaveBeenCalledTimes(2);
      expect(getOperation(context.provider)?.result).toMatchObject({
        mint: CARD_MINT,
        batchId: BATCH_ID,
      });
      expect(getOperation(context.provider, SECOND_MEMO)?.result).toMatchObject(
        { mint: OTHER_MINT, batchId: BATCH_ID },
      );
      expect(context.invalidateQueries.mock.calls).toStrictEqual([
        [OWNED_CARDS_FAMILY],
        [OWNED_CARDS_FAMILY],
      ]);
    });

    it('stops signing the remaining packs after a rejection while signed packs still open', async () => {
      const memos = Array.from({ length: 5 }, (_, index) => `memo-${index}`);
      const context = setup({
        state: stateFor({
          operations: memos.map((memo) => batchOperation(memo, memos)),
        }),
      });
      mockHappyPurchase(context);
      const signing = createDeferredPromise<void>();
      context.handleRequest.mockImplementation(async () => {
        await signing.promise;
        return {
          signedTransaction: SIGNED_PURCHASE_TX,
          signature: PURCHASE_SIGNATURE,
        };
      });
      context.handleRequest.mockRejectedValueOnce(new Error('User rejected'));
      const run = context.provider.completePacks({
        account: ACCOUNT,
        memo: memos[0],
      });
      await flushPromises();
      signing.resolve();

      await expect(run).rejects.toMatchObject({ code: 'SIGNING_REJECTED' });

      expect(context.handleRequest).toHaveBeenCalledTimes(4);
      expect(
        memos.map((memo) => getOperation(context.provider, memo)?.status),
      ).toStrictEqual(['generated', 'opened', 'opened', 'opened', 'generated']);
      expect(getOperation(context.provider, memos[4])).toStrictEqual(
        batchOperation(memos[4], memos),
      );
    });

    it('rejects an unknown memo', async () => {
      const { provider } = setup();

      await expect(
        provider.completePacks({ account: ACCOUNT, memo: MEMO }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('markPackRevealed', () => {
    const opened = buildOperation({
      status: 'opened',
      transaction: undefined,
      mint: CARD_MINT,
    });

    it('marks an opened pack revealed, then its reveal completed', () => {
      const { provider } = setup({
        state: stateFor({ operations: [opened] }),
      });

      provider.markPackRevealed({ account: ACCOUNT, memo: MEMO });
      const revealed = getOperation(provider);
      provider.markPackRevealed({
        account: ACCOUNT,
        memo: MEMO,
        completed: true,
      });

      expect(revealed).toStrictEqual({ ...opened, revealed: true });
      expect(getOperation(provider)).toStrictEqual({
        ...opened,
        revealed: true,
        revealCompleted: true,
      });
    });

    it('leaves a pack that is not opened untouched', () => {
      const operation = submittedOperation();
      const { provider } = setup({
        state: stateFor({ operations: [operation] }),
      });

      provider.markPackRevealed({
        account: ACCOUNT,
        memo: MEMO,
        completed: true,
      });

      expect(getOperation(provider)).toStrictEqual(operation);
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

    it.each(['submitted', 'paid'] as const)(
      'keeps a %s operation whose payment may be in flight',
      (status) => {
        const operation = submittedOperation({ status });
        const { provider } = setup({
          state: stateFor({ operations: [operation] }),
        });

        provider.dismissOperation({ account: ACCOUNT, memo: MEMO });

        expect(getOperation(provider)).toStrictEqual(operation);
      },
    );

    it('abandons the unsigned packs of a batch and keeps the others', () => {
      const memos = [MEMO, SECOND_MEMO, 'opened-memo'];
      const opened = buildOperation({
        memo: 'opened-memo',
        batchMemos: memos,
        status: 'opened',
        transaction: undefined,
      });
      const { provider } = setup({
        state: stateFor({
          operations: [
            buildOperation({ batchMemos: memos }),
            buildOperation({ memo: SECOND_MEMO, batchMemos: memos }),
            opened,
          ],
        }),
      });

      provider.dismissOperation({ account: ACCOUNT, memo: MEMO });

      expect(provider.state.operations[ACCOUNT.address]).toStrictEqual({
        'opened-memo': opened,
      });
    });

    it('ignores an unknown memo', () => {
      const state = stateFor({ operations: [buildOperation()] });
      const { provider } = setup({ state });

      provider.dismissOperation({ account: ACCOUNT, memo: 'unknown' });

      expect(provider.state).toStrictEqual(state);
    });
  });

  describe('recoverOperations', () => {
    describe('purchases', () => {
      it('resumes submitted and paid purchases by memo without signing or submitting', async () => {
        const context = setup({
          state: stateFor({
            operations: [
              submittedOperation(),
              submittedOperation({ memo: SECOND_MEMO, status: 'paid' }),
            ],
          }),
        });
        mockHappyPurchase(context);
        context.api.openPack.mockImplementation(async ({ memo }) =>
          awarded(memo === MEMO ? CARD_MINT : OTHER_MINT),
        );

        await context.provider.recoverOperations({ address: ACCOUNT.address });

        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.api.submitTransaction).not.toHaveBeenCalled();
        expect(getOperation(context.provider)).toMatchObject({
          status: 'opened',
          result: { mint: CARD_MINT },
        });
        expect(getOperation(context.provider, SECOND_MEMO)).toMatchObject({
          status: 'opened',
          result: { mint: OTHER_MINT },
        });
      });

      it('expires stale generated operations and leaves fresh ones untouched', async () => {
        const fresh = buildOperation({
          memo: SECOND_MEMO,
          createdAt: NOW + 2 * GENERATED_TTL,
        });
        const context = setup({
          state: stateFor({ operations: [buildOperation(), fresh] }),
        });
        context.clock.now = NOW + GENERATED_TTL + 1;

        await context.provider.recoverOperations({ address: ACCOUNT.address });

        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(getOperation(context.provider)?.status).toBe('expired');
        expect(getOperation(context.provider)?.transaction).toBeUndefined();
        expect(getOperation(context.provider, SECOND_MEMO)).toStrictEqual(
          fresh,
        );
      });

      it('does not expire a generated operation being signed', async () => {
        const context = setup({
          state: stateFor({ operations: [buildOperation()] }),
        });
        mockHappyPurchase(context);
        const signing = createDeferredPromise<unknown>();
        context.handleRequest.mockReturnValueOnce(signing.promise);
        const run = context.provider.completePack({
          account: ACCOUNT,
          memo: MEMO,
        });
        context.clock.now = NOW + GENERATED_TTL + 1;

        await context.provider.recoverOperations({ address: ACCOUNT.address });
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
              submittedOperation(),
              submittedOperation({ memo: SECOND_MEMO, status: 'paid' }),
            ],
            sales: [buildSale()],
          }),
        });
        context.api.getPackStatus.mockRejectedValue(new Error('boom'));
        context.api.openPack.mockRejectedValue(new Error('boom'));
        context.api.checkBuyback.mockRejectedValue(new Error('boom'));

        await expect(
          context.provider.recoverOperations({ address: ACCOUNT.address }),
        ).resolves.toBeUndefined();

        expect(getOperation(context.provider)).toMatchObject({
          status: 'submitted',
          error: { code: 'UNKNOWN' },
        });
        expect(getOperation(context.provider, SECOND_MEMO)?.status).toBe(
          'paid',
        );
        expect(getSale(context.provider)).toStrictEqual(buildSale());
        expect(context.api.submitTransaction).not.toHaveBeenCalled();
      });

      it('does nothing for an address without a journal', async () => {
        const context = setup();

        await context.provider.recoverOperations({ address: ACCOUNT.address });

        expect(context.provider.state).toStrictEqual(
          getDefaultPackPartnerState(),
        );
      });
    });

    describe('buybacks', () => {
      it('completes a pending buyback PackPartner confirmed, without signing', async () => {
        const context = setup({ state: stateFor({ sales: [buildSale()] }) });
        context.api.checkBuyback.mockResolvedValue({
          exists: true,
          isComplete: true,
          signature: SALE_SIGNATURE,
          amount: SALE_AMOUNT,
        });
        context.clock.now = NOW + MINUTE;

        await context.provider.recoverOperations({ address: ACCOUNT.address });

        expect(context.api.checkBuyback).toHaveBeenCalledWith({
          memo: SALE_MEMO,
        });
        expect(getSale(context.provider)).toStrictEqual(
          buildSale({ status: 'completed', updatedAt: NOW + MINUTE }),
        );
        expect(context.invalidateQueries.mock.calls).toStrictEqual([
          [OWNED_CARDS_FAMILY],
          [OFFER_FAMILY],
        ]);
        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.api.createBuyback).not.toHaveBeenCalled();
        expect(context.api.submitTransaction).not.toHaveBeenCalled();
      });

      it('deletes a pending buyback never handed to PackPartner', async () => {
        const context = setup({
          state: stateFor({
            sales: [
              buildSale({ submissionAttempted: false, signature: undefined }),
            ],
          }),
        });

        await context.provider.recoverOperations({ address: ACCOUNT.address });

        expect(context.provider.state.sales).toStrictEqual({});
        expect(context.api.checkBuyback).not.toHaveBeenCalled();
      });

      it('deletes a pending buyback PackPartner does not know', async () => {
        const context = setup({ state: stateFor({ sales: [buildSale()] }) });
        context.api.checkBuyback.mockResolvedValue({
          exists: false,
          isComplete: false,
        });

        await context.provider.recoverOperations({ address: ACCOUNT.address });

        expect(context.provider.state.sales).toStrictEqual({});
        expect(context.api.createBuyback).not.toHaveBeenCalled();
      });

      it('keeps a buyback PackPartner has not settled yet', async () => {
        const context = setup({ state: stateFor({ sales: [buildSale()] }) });
        context.api.checkBuyback.mockResolvedValue({
          exists: true,
          isComplete: false,
        });

        await context.provider.recoverOperations({ address: ACCOUNT.address });

        expect(getSale(context.provider)).toStrictEqual(buildSale());
      });

      it('does not resume a buyback whose submission is in flight', async () => {
        const context = setup();
        mockHappySale(context);
        const submission =
          createDeferredPromise<
            Awaited<ReturnType<PackPartnerApi['submitTransaction']>>
          >();
        const submitting = createDeferredPromise<void>();
        context.api.submitTransaction.mockImplementation(() => {
          submitting.resolve();
          return submission.promise;
        });
        const sale = context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        });
        await submitting.promise;

        await context.provider.recoverOperations({ address: ACCOUNT.address });
        submission.resolve({
          signature: SALE_SIGNATURE,
          confirmationStatus: 'confirmed',
        });
        await sale;

        expect(context.api.checkBuyback).not.toHaveBeenCalled();
        expect(context.api.createBuyback).toHaveBeenCalledTimes(1);
        expect(getSale(context.provider)?.status).toBe('completed');
      });

      it('shares an in-flight check with a concurrent sell request', async () => {
        const { provider, api, handleRequest } = setup({
          state: stateFor({ sales: [buildSale()] }),
        });
        const check =
          createDeferredPromise<
            Awaited<ReturnType<PackPartnerApi['checkBuyback']>>
          >();
        api.checkBuyback.mockReturnValue(check.promise);
        const recovery = provider.recoverOperations({
          address: ACCOUNT.address,
        });
        const sale = provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        });

        check.resolve({
          exists: true,
          isComplete: true,
          signature: SALE_SIGNATURE,
        });
        const [, result] = await Promise.all([recovery, sale]);

        expect(result).toStrictEqual({
          mint: CARD_MINT,
          amount: SALE_AMOUNT,
          signature: SALE_SIGNATURE,
        });
        expect(api.checkBuyback).toHaveBeenCalledTimes(1);
        expect(api.createBuyback).not.toHaveBeenCalled();
        expect(handleRequest).not.toHaveBeenCalled();
      });
    });
  });

  describe('checkSales', () => {
    it('completes a pending buyback PackPartner confirmed and refreshes the reads, without signing', async () => {
      const context = setup({ state: stateFor({ sales: [buildSale()] }) });
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: true,
        signature: SALE_SIGNATURE,
        amount: SALE_AMOUNT,
      });
      context.clock.now = NOW + MINUTE;

      await context.provider.checkSales({ address: ACCOUNT.address });

      expect(context.api.checkBuyback).toHaveBeenCalledWith({
        memo: SALE_MEMO,
      });
      expect(getSale(context.provider)).toStrictEqual(
        buildSale({ status: 'completed', updatedAt: NOW + MINUTE }),
      );
      expect(context.invalidateQueries.mock.calls).toStrictEqual([
        [OWNED_CARDS_FAMILY],
        [OFFER_FAMILY],
      ]);
      expect(context.handleRequest).not.toHaveBeenCalled();
      expect(context.api.createBuyback).not.toHaveBeenCalled();
      expect(context.api.submitTransaction).not.toHaveBeenCalled();
    });

    it('records the refund and signature PackPartner confirmed', async () => {
      const context = setup({
        state: stateFor({ sales: [buildSale({ signature: undefined })] }),
      });
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: true,
        signature: 'confirmed-signature',
        amount: '19000000',
      });

      await context.provider.checkSales({ address: ACCOUNT.address });

      expect(getSale(context.provider)).toStrictEqual(
        buildSale({
          status: 'completed',
          amount: '19000000',
          signature: 'confirmed-signature',
        }),
      );
    });

    it('checks only pending buybacks', async () => {
      const sold = buildSale({
        mint: OTHER_MINT,
        memo: 'sold-memo',
        status: 'completed',
      });
      const context = setup({
        state: stateFor({ sales: [buildSale(), sold] }),
      });
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: false,
      });

      await context.provider.checkSales({ address: ACCOUNT.address });

      expect(context.api.checkBuyback.mock.calls).toStrictEqual([
        [{ memo: SALE_MEMO }],
      ]);
      expect(getSale(context.provider, OTHER_MINT)).toStrictEqual(sold);
    });

    it('deletes a pending buyback PackPartner does not know, without starting a new sale', async () => {
      const context = setup({ state: stateFor({ sales: [buildSale()] }) });
      context.api.checkBuyback.mockResolvedValue({
        exists: false,
        isComplete: false,
      });

      await context.provider.checkSales({ address: ACCOUNT.address });

      expect(context.provider.state.sales).toStrictEqual({});
      expect(context.api.getBuybackAvailability).not.toHaveBeenCalled();
      expect(context.api.createBuyback).not.toHaveBeenCalled();
      expect(context.invalidateQueries).not.toHaveBeenCalled();
    });

    it('deletes a pending buyback never handed to PackPartner without checking it', async () => {
      const context = setup({
        state: stateFor({
          sales: [
            buildSale({ submissionAttempted: false, signature: undefined }),
          ],
        }),
      });

      await context.provider.checkSales({ address: ACCOUNT.address });

      expect(context.provider.state.sales).toStrictEqual({});
      expect(context.api.checkBuyback).not.toHaveBeenCalled();
    });

    it('keeps a buyback PackPartner has not settled yet', async () => {
      const context = setup({ state: stateFor({ sales: [buildSale()] }) });
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: false,
      });

      await expect(
        context.provider.checkSales({ address: ACCOUNT.address }),
      ).resolves.toBeUndefined();

      expect(getSale(context.provider)).toStrictEqual(buildSale());
    });

    it('never throws and keeps the buyback pending when the check fails', async () => {
      const context = setup({ state: stateFor({ sales: [buildSale()] }) });
      context.api.checkBuyback.mockRejectedValue(new Error('boom'));

      await expect(
        context.provider.checkSales({ address: ACCOUNT.address }),
      ).resolves.toBeUndefined();

      expect(getSale(context.provider)).toStrictEqual(buildSale());
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('skips a buyback whose sale is in flight', async () => {
      const context = setup();
      mockHappySale(context);
      const submission =
        createDeferredPromise<
          Awaited<ReturnType<PackPartnerApi['submitTransaction']>>
        >();
      const submitting = createDeferredPromise<void>();
      context.api.submitTransaction.mockImplementation(() => {
        submitting.resolve();
        return submission.promise;
      });
      const sale = context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });
      await submitting.promise;

      await context.provider.checkSales({ address: ACCOUNT.address });
      submission.resolve({
        signature: SALE_SIGNATURE,
        confirmationStatus: 'confirmed',
      });
      await sale;

      expect(context.api.checkBuyback).not.toHaveBeenCalled();
      expect(getSale(context.provider)?.status).toBe('completed');
    });

    it('neither resumes nor waits on purchases', async () => {
      const context = setup({
        state: stateFor({
          operations: [
            submittedOperation(),
            submittedOperation({ memo: SECOND_MEMO, status: 'paid' }),
          ],
          sales: [buildSale()],
        }),
      });
      const opening = createDeferredPromise<OpenPackResult>();
      const openingRequested = createDeferredPromise<void>();
      context.api.openPack.mockImplementation(() => {
        openingRequested.resolve();
        return opening.promise;
      });
      context.api.checkBuyback.mockResolvedValue({
        exists: true,
        isComplete: true,
        signature: SALE_SIGNATURE,
        amount: SALE_AMOUNT,
      });
      const purchase = context.provider.completePack({
        account: ACCOUNT,
        memo: MEMO,
      });
      await openingRequested.promise;

      await context.provider.checkSales({ address: ACCOUNT.address });

      expect(getSale(context.provider)?.status).toBe('completed');
      expect(context.api.openPack.mock.calls).toStrictEqual([[{ memo: MEMO }]]);
      expect(context.api.getPackStatus).not.toHaveBeenCalled();
      expect(getOperation(context.provider)?.status).toBe('submitted');
      expect(getOperation(context.provider, SECOND_MEMO)).toStrictEqual(
        submittedOperation({ memo: SECOND_MEMO, status: 'paid' }),
      );
      opening.resolve(awarded());
      await purchase;
    });

    it('checks only the sales of the given address', async () => {
      const state = stateFor({ sales: [buildSale()] });
      const context = setup({ state });

      await context.provider.checkSales({ address: OTHER_ACCOUNT.address });

      expect(context.provider.state).toStrictEqual(state);
      expect(context.api.checkBuyback).not.toHaveBeenCalled();
    });
  });

  describe('sellCard', () => {
    it('re-checks the offer, signs the API transaction and completes the sale', async () => {
      const context = setup();
      mockHappySale(context);

      const result = await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
        nftStandard: 'pnft',
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
            method: 'signPackPartnerBuyback',
            params: {
              accountId: ACCOUNT.id,
              transaction: SALE_TX,
              scope: SolScope.Mainnet,
              context: {
                amount: SALE_AMOUNT,
                assetAddress: CARD_MINT,
                expectedStandard: 'pnft',
              },
            },
          }),
        }),
      );
      expect(context.api.submitTransaction).toHaveBeenCalledWith({
        signedTransaction: SIGNED_SALE_TX,
      });
    });

    it('stores the completed buyback and refreshes the owned-card and offer reads', async () => {
      const context = setup();
      mockHappySale(context);

      await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(getSale(context.provider)).toStrictEqual(
        buildSale({ status: 'completed' }),
      );
      expect(context.invalidateQueries.mock.calls).toStrictEqual([
        [OWNED_CARDS_FAMILY],
        [OFFER_FAMILY],
      ]);
    });

    it.each(refreshFailures)(
      'resolves with the sale and logs when the read refresh %s',
      async (_label, failRefresh) => {
        const context = setup();
        mockHappySale(context);
        failRefresh(context.invalidateQueries);

        const result = await context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        });
        await flushPromises();

        expect(result.signature).toBe(SALE_SIGNATURE);
        expect(getSale(context.provider)?.status).toBe('completed');
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.any(Error),
          REFRESH_FAILURE_MESSAGE,
        );
      },
    );

    it('records the buyback pending before signing and attempted before submitting', async () => {
      const context = setup();
      mockHappySale(context);
      let atSigning: PackPartnerBuybackOperation | undefined;
      let atSubmission: PackPartnerBuybackOperation | undefined;
      context.handleRequest.mockImplementation(async () => {
        atSigning = getSale(context.provider);
        return {
          signedTransaction: SIGNED_SALE_TX,
          signature: SALE_SIGNATURE,
        };
      });
      context.api.submitTransaction.mockImplementation(async () => {
        atSubmission = getSale(context.provider);
        return {
          signature: SALE_SIGNATURE,
          confirmationStatus: 'confirmed',
        };
      });

      await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(atSigning).toStrictEqual(
        buildSale({ submissionAttempted: false, signature: undefined }),
      );
      expect(atSubmission).toStrictEqual(buildSale());
    });

    it('never writes the signed buyback to state', async () => {
      const context = setup();
      mockHappySale(context);

      await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(context.snapshots.length).toBeGreaterThan(0);
      expect(writtenStates(context)).not.toContain(SIGNED_SALE_TX);
      expect(writtenStates(context)).not.toContain('signedTransaction');
    });

    it('passes an unknown standard to the Snap by default', async () => {
      const context = setup();
      mockHappySale(context);

      await context.provider.sellCard({
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: '19000000',
      });

      expect(context.handleRequest).toHaveBeenCalledWith(
        buybackSnapContext('unknown'),
      );
    });

    describe('offer checks', () => {
      it('signs nothing and refreshes the offer read when the offer is no longer available', async () => {
        const context = setup();
        context.api.getBuybackAvailability.mockResolvedValue({
          available: false,
        });

        await expect(
          context.provider.sellCard({
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: SALE_AMOUNT,
          }),
        ).rejects.toMatchObject({ code: 'BUYBACK_UNAVAILABLE' });

        expect(context.api.createBuyback).not.toHaveBeenCalled();
        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.invalidateQueries.mock.calls).toStrictEqual([
          [OFFER_FAMILY],
        ]);
        expect(context.provider.state.sales).toStrictEqual({});
      });

      it('signs nothing and refreshes the offer read when the offer is below the confirmed amount', async () => {
        const context = setup();
        mockHappySale(context);
        context.api.getBuybackAvailability.mockResolvedValue({
          available: true,
          amount: '19000000',
        });

        await expect(
          context.provider.sellCard({
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: SALE_AMOUNT,
          }),
        ).rejects.toMatchObject({ code: 'OFFER_CHANGED', retryable: false });

        expect(context.api.createBuyback).not.toHaveBeenCalled();
        expect(context.handleRequest).not.toHaveBeenCalled();
        expect(context.invalidateQueries.mock.calls).toStrictEqual([
          [OFFER_FAMILY],
        ]);
      });

      it.each([
        ['lower', '19000000'],
        ['zero', '0'],
      ])(
        'signs nothing and refreshes the offer read when the refund is %s',
        async (_label, refundAmount) => {
          const context = setup();
          mockHappySale(context);
          context.api.createBuyback.mockResolvedValue({
            transaction: SALE_TX,
            amount: refundAmount,
            memo: SALE_MEMO,
          });

          await expect(
            context.provider.sellCard({
              account: ACCOUNT,
              mint: CARD_MINT,
              expectedAmount: SALE_AMOUNT,
            }),
          ).rejects.toMatchObject({ code: 'OFFER_CHANGED' });

          expect(context.handleRequest).not.toHaveBeenCalled();
          expect(context.api.submitTransaction).not.toHaveBeenCalled();
          expect(context.provider.state.sales).toStrictEqual({});
          expect(context.invalidateQueries.mock.calls).toStrictEqual([
            [OFFER_FAMILY],
          ]);
        },
      );

      it('signs nothing without a confirmed amount', async () => {
        const context = setup();
        mockHappySale(context);

        await expect(
          context.provider.sellCard({
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: '',
          }),
        ).rejects.toMatchObject({ code: 'OFFER_CHANGED' });

        expect(context.handleRequest).not.toHaveBeenCalled();
      });
    });

    describe('signing and submission', () => {
      it('deletes the buyback when signing fails', async () => {
        const context = setup();
        mockHappySale(context);
        context.handleRequest.mockRejectedValue(new Error('User rejected'));

        await expect(
          context.provider.sellCard({
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: SALE_AMOUNT,
          }),
        ).rejects.toMatchObject({ code: 'SIGNING_REJECTED' });

        expect(context.api.submitTransaction).not.toHaveBeenCalled();
        expect(context.provider.state.sales).toStrictEqual({});
      });

      it('completes the sale when the submission failed but PackPartner saw it', async () => {
        const context = setup();
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
          expectedAmount: SALE_AMOUNT,
        });

        expect(context.api.checkBuyback).toHaveBeenCalledWith({
          memo: SALE_MEMO,
        });
        expect(result.signature).toBe(SALE_SIGNATURE);
        expect(getSale(context.provider)?.status).toBe('completed');
      });

      it('keeps the attempted buyback pending when the submission outcome is unknown', async () => {
        const context = setup();
        mockHappySale(context);
        context.api.submitTransaction.mockRejectedValue(
          apiError('SUBMIT_FAILED', 500),
        );
        context.api.checkBuyback.mockResolvedValue({
          exists: true,
          isComplete: false,
        });

        await expect(
          context.provider.sellCard({
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: SALE_AMOUNT,
          }),
        ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });

        expect(getSale(context.provider)).toStrictEqual(buildSale());
        expect(writtenStates(context)).not.toContain(SIGNED_SALE_TX);
      });

      it('keeps the buyback pending when PackPartner only submitted it', async () => {
        const context = setup();
        mockHappySale(context);
        context.api.submitTransaction.mockResolvedValue({
          signature: SALE_SIGNATURE,
          confirmationStatus: 'submitted',
        });
        context.api.checkBuyback.mockResolvedValue({
          exists: true,
          isComplete: false,
        });

        await expect(
          context.provider.sellCard({
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: SALE_AMOUNT,
          }),
        ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });

        expect(getSale(context.provider)).toStrictEqual(buildSale());
      });

      it.each([
        submissionRefusal('SUBMIT_FAILED', 400),
        submissionRefusal('RATE_LIMITED', 429),
      ])(
        'retains a buyback after HTTP $status when its status cannot be checked',
        async (refusal) => {
          const context = setup();
          mockHappySale(context);
          context.api.submitTransaction.mockRejectedValue(refusal);
          context.api.checkBuyback.mockRejectedValue(apiError('NETWORK_ERROR'));

          const failure = context.provider
            .sellCard({
              account: ACCOUNT,
              mint: CARD_MINT,
              expectedAmount: SALE_AMOUNT,
            })
            .catch((error: unknown) => error);
          const error = await failure;

          expect(error).toMatchObject({ code: 'SALE_PENDING' });
          expect(getSale(context.provider)).toMatchObject({
            status: 'pending',
            submissionAttempted: true,
          });
        },
      );
    });

    describe('pending buyback', () => {
      it('discards a buyback never handed to PackPartner and starts a new sale', async () => {
        const context = setup({
          state: stateFor({
            sales: [
              buildSale({
                memo: 'abandoned-memo',
                submissionAttempted: false,
                signature: undefined,
              }),
            ],
          }),
        });
        mockHappySale(context);

        await context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        });

        expect(context.api.checkBuyback).not.toHaveBeenCalled();
        expect(context.api.createBuyback).toHaveBeenCalledTimes(1);
        expect(getSale(context.provider)).toStrictEqual(
          buildSale({ status: 'completed' }),
        );
      });

      it('completes a buyback PackPartner confirmed, without a new buyback', async () => {
        const context = setup({ state: stateFor({ sales: [buildSale()] }) });
        context.api.checkBuyback.mockResolvedValue({
          exists: true,
          isComplete: true,
          signature: SALE_SIGNATURE,
          amount: SALE_AMOUNT,
        });

        const result = await context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        });

        expect(result).toStrictEqual({
          mint: CARD_MINT,
          amount: SALE_AMOUNT,
          signature: SALE_SIGNATURE,
        });
        expect(getSale(context.provider)?.status).toBe('completed');
        expect(context.api.createBuyback).not.toHaveBeenCalled();
        expect(context.handleRequest).not.toHaveBeenCalled();
      });

      it('deletes a buyback PackPartner does not know and starts a new sale', async () => {
        const context = setup({
          state: stateFor({ sales: [buildSale({ memo: 'lost-memo' })] }),
        });
        mockHappySale(context);
        context.api.checkBuyback.mockResolvedValue({
          exists: false,
          isComplete: false,
        });

        await context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        });

        expect(context.api.checkBuyback).toHaveBeenCalledWith({
          memo: 'lost-memo',
        });
        expect(context.api.createBuyback).toHaveBeenCalledTimes(1);
        expect(context.handleRequest).toHaveBeenCalledTimes(1);
        expect(getSale(context.provider)).toStrictEqual(
          buildSale({ status: 'completed' }),
        );
      });

      it('refuses a new sale while PackPartner has not settled the pending one', async () => {
        const context = setup({ state: stateFor({ sales: [buildSale()] }) });
        context.api.checkBuyback.mockResolvedValue({
          exists: true,
          isComplete: false,
        });

        await expect(
          context.provider.sellCard({
            account: ACCOUNT,
            mint: CARD_MINT,
            expectedAmount: SALE_AMOUNT,
          }),
        ).rejects.toMatchObject({ code: 'SALE_PENDING', retryable: true });

        expect(context.api.createBuyback).not.toHaveBeenCalled();
        expect(getSale(context.provider)).toStrictEqual(buildSale());
      });

      it('fails with a sanitized retryable SALE_PENDING when the check fails', async () => {
        const context = setup({ state: stateFor({ sales: [buildSale()] }) });
        const checkError = apiError('NETWORK_ERROR');
        context.api.checkBuyback.mockRejectedValue(checkError);

        const sale = context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        });

        await expect(sale).rejects.toMatchObject({
          code: 'SALE_PENDING',
          retryable: true,
        });
        await expect(sale).rejects.not.toHaveProperty('cause');
        expect(context.api.createBuyback).not.toHaveBeenCalled();
        expect(getSale(context.provider)).toStrictEqual(buildSale());
      });
    });

    it('rejects a card already sold with NOT_FOUND', async () => {
      const context = setup({
        state: stateFor({ sales: [buildSale({ status: 'completed' })] }),
      });

      await expect(
        context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(context.api.getBuybackAvailability).not.toHaveBeenCalled();
      expect(context.api.createBuyback).not.toHaveBeenCalled();
    });

    it('shares concurrent sales of the same card', async () => {
      const context = setup();
      mockHappySale(context);

      const [first, second] = await Promise.all([
        context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
        context.provider.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE_AMOUNT,
        }),
      ]);

      expect(first).toBe(second);
      expect(context.api.createBuyback).toHaveBeenCalledTimes(1);
      expect(context.handleRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('sellCards', () => {
    const invalidSelections: [
      string,
      { mint: string; expectedAmount: string }[],
    ][] = [
      ['an empty selection', []],
      [
        'a duplicated mint',
        [
          { mint: CARD_MINT, expectedAmount: SALE_AMOUNT },
          { mint: CARD_MINT, expectedAmount: SALE_AMOUNT },
        ],
      ],
      ['a zero amount', [{ mint: CARD_MINT, expectedAmount: '0' }]],
      ['a decimal amount', [{ mint: CARD_MINT, expectedAmount: '19.55' }]],
      [
        'more cards than the multipack cap',
        Array.from({ length: MAX_MULTIPACK_COUNT + 1 }, (_, index) => ({
          mint: `mint-${index}`,
          expectedAmount: SALE_AMOUNT,
        })),
      ],
    ];

    it.each(invalidSelections)(
      'rejects %s without calling PackPartner',
      async (_label, cards) => {
        const context = setup();

        await expect(
          context.provider.sellCards({ account: ACCOUNT, cards }),
        ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

        expect(context.api.getBuybackAvailability).not.toHaveBeenCalled();
      },
    );

    it('skips cards already sold and sells the others with their standard', async () => {
      const context = setup({
        state: stateFor({ sales: [buildSale({ status: 'completed' })] }),
      });
      mockHappySale(context);

      await context.provider.sellCards({
        account: ACCOUNT,
        cards: [
          { mint: CARD_MINT, expectedAmount: SALE_AMOUNT },
          {
            mint: OTHER_MINT,
            expectedAmount: SALE_AMOUNT,
            nftStandard: 'core',
          },
        ],
      });

      expect(context.api.getBuybackAvailability.mock.calls).toStrictEqual([
        [{ mint: OTHER_MINT }],
      ]);
      expect(context.handleRequest).toHaveBeenCalledWith(
        buybackSnapContext('core', OTHER_MINT),
      );
      expect(getSale(context.provider, OTHER_MINT)?.status).toBe('completed');
    });

    it('stops at the first failed sale', async () => {
      const context = setup();
      mockHappySale(context);
      context.api.getBuybackAvailability.mockResolvedValueOnce({
        available: false,
      });

      await expect(
        context.provider.sellCards({
          account: ACCOUNT,
          cards: [
            { mint: CARD_MINT, expectedAmount: SALE_AMOUNT },
            { mint: OTHER_MINT, expectedAmount: SALE_AMOUNT },
          ],
        }),
      ).rejects.toMatchObject({ code: 'BUYBACK_UNAVAILABLE' });

      expect(context.api.getBuybackAvailability).toHaveBeenCalledTimes(1);
      expect(context.api.createBuyback).not.toHaveBeenCalled();
    });
  });

  describe('per-account state', () => {
    it('keeps purchases and buybacks of each account apart', async () => {
      const context = setup();
      mockHappySale(context);
      context.api.generatePack.mockResolvedValue({
        memo: MEMO,
        transaction: PURCHASE_TX,
      });

      await context.provider.generatePack({ account: ACCOUNT, pack: PACK });
      await context.provider.sellCard({
        account: OTHER_ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE_AMOUNT,
      });

      expect(Object.keys(context.provider.state.operations)).toStrictEqual([
        ACCOUNT.address,
      ]);
      expect(Object.keys(context.provider.state.sales)).toStrictEqual([
        OTHER_ACCOUNT.address,
      ]);
      expect(context.invalidateQueries).toHaveBeenCalledWith([
        'PackPartnerDataService:getOwnedCards',
        'mainnet',
        OTHER_ACCOUNT.address,
      ]);
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

    it('recovers only the journal of the given address', async () => {
      const state = stateFor({
        operations: [submittedOperation()],
        sales: [buildSale()],
      });
      const context = setup({ state });

      await context.provider.recoverOperations({
        address: OTHER_ACCOUNT.address,
      });

      expect(context.provider.state).toStrictEqual(state);
      expect(context.api.openPack).not.toHaveBeenCalled();
      expect(context.api.checkBuyback).not.toHaveBeenCalled();
    });
  });

  describe('clearState', () => {
    it('resets the journal', () => {
      const { provider } = setup({
        state: stateFor({
          operations: [buildOperation()],
          sales: [buildSale()],
        }),
      });

      provider.clearState();

      expect(provider.state).toStrictEqual(getDefaultPackPartnerState());
    });

    it('stops an in-flight purchase from writing to the reset wallet', async () => {
      const context = setup({
        state: stateFor({ operations: [buildOperation()] }),
      });
      mockHappyPurchase(context);
      const signing = createDeferredPromise<unknown>();
      context.handleRequest.mockReturnValueOnce(signing.promise);
      const run = context.provider.completePack({
        account: ACCOUNT,
        memo: MEMO,
      });

      context.provider.clearState();
      signing.resolve({
        signedTransaction: SIGNED_PURCHASE_TX,
        signature: PURCHASE_SIGNATURE,
      });

      await expect(run).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(context.api.submitTransaction).not.toHaveBeenCalled();
      expect(context.provider.state).toStrictEqual(
        getDefaultPackPartnerState(),
      );
    });
  });

  describe('error reporting', () => {
    it('sends unexpected errors to Sentry', async () => {
      const { provider, api } = setup();
      api.generatePack.mockRejectedValue(new Error('boom'));

      await expect(
        provider.generatePack({ account: ACCOUNT, pack: PACK }),
      ).rejects.toMatchObject({
        code: 'UNKNOWN',
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNKNOWN' }),
        expect.objectContaining({ tags: { feature: 'PackPartner' } }),
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

    it('keeps a refund confirmed by the pack status out of Sentry', async () => {
      const context = setup({
        state: stateFor({
          operations: [submittedOperation({ status: 'paid' })],
        }),
      });
      context.api.openPack.mockRejectedValue(apiError('NOT_FOUND', 400));
      context.api.getPackStatus.mockResolvedValue(
        packStatus({ isPaid: true, isRefunded: true }),
      );

      await expect(
        context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
      ).rejects.toMatchObject({ code: 'PACK_FAILED' });

      expect(loggerErrorSpy).not.toHaveBeenCalled();
      expect(devLogSpy).toHaveBeenCalledWith(
        '[PackPartnerProvider]',
        'completePack',
        expect.objectContaining({ code: 'PACK_FAILED' }),
      );
    });

    it('keeps a failed purchase out of Sentry when it is completed again', async () => {
      const context = setup({
        state: stateFor({
          operations: [
            buildOperation({ status: 'failed', transaction: undefined }),
          ],
        }),
      });

      await expect(
        context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
      ).rejects.toMatchObject({ code: 'PACK_FAILED' });

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('sends an unexpected purchase failure to Sentry once', async () => {
      const context = setup({
        state: stateFor({ operations: [buildOperation()] }),
      });
      context.handleRequest.mockRejectedValue(new Error('Snap crashed'));

      await expect(
        context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
      ).rejects.toMatchObject({ code: 'SIGNING_REJECTED' });

      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SIGNING_REJECTED' }),
        expect.objectContaining({
          context: {
            name: 'PackPartnerProvider',
            data: { method: 'completePack', code: 'SIGNING_REJECTED' },
          },
        }),
      );
    });

    it('reports a refused submission once while retaining the operation', async () => {
      const context = setup({
        state: stateFor({ operations: [buildOperation()] }),
      });
      mockHappyPurchase(context);
      const refusal = submissionRefusal('SUBMIT_FAILED', 400);
      context.api.submitTransaction.mockRejectedValue(refusal);
      context.api.getPackStatus.mockResolvedValue(packStatus());

      await expect(
        context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
      ).rejects.toMatchObject({ code: 'SUBMIT_FAILED' });

      expect(loggerErrorSpy.mock.calls).toStrictEqual([
        [
          refusal,
          expect.objectContaining({ tags: { feature: 'PackPartner' } }),
        ],
      ]);
      expect(devLogSpy).not.toHaveBeenCalled();
    });

    it('reports a rate-limited submission to the dev log only', async () => {
      const context = setup({
        state: stateFor({ operations: [buildOperation()] }),
      });
      mockHappyPurchase(context);
      const refusal = submissionRefusal('RATE_LIMITED', 429);
      context.api.submitTransaction.mockRejectedValue(refusal);
      context.api.getPackStatus.mockResolvedValue(packStatus());

      await expect(
        context.provider.completePack({ account: ACCOUNT, memo: MEMO }),
      ).rejects.toMatchObject({ code: 'RATE_LIMITED' });

      expect(loggerErrorSpy).not.toHaveBeenCalled();
      expect(devLogSpy).toHaveBeenCalledWith(
        '[PackPartnerProvider]',
        'completePack',
        refusal,
      );
    });
  });
});
