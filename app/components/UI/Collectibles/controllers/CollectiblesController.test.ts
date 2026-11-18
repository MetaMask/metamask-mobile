import { deriveStateFromMetadata } from '@metamask/base-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import { PackPartnerProvider } from '../providers/pack-partner/PackPartnerProvider';
import { PACK_PARTNER_TIMINGS } from '../providers/pack-partner/constants/packPartner';
import { nftWon } from '../providers/pack-partner/services/api.fixtures';
import type { PackPartnerApi } from '../services/clients/PackPartnerApiClient';
import type { PackPartnerState } from '../providers/pack-partner/state';
import type {
  CollectiblesBuybackOperation,
  CollectiblesCard,
  CollectiblesPackRef,
  CollectiblesPackOperation,
} from '../types/collectibles';
import {
  CollectiblesController,
  COLLECTIBLES_CONTROLLER_NAME,
  getDefaultCollectiblesControllerState,
  type CollectiblesControllerMessenger,
  type CollectiblesControllerState,
} from './CollectiblesController';

let mockPackPartnerEnvironment: 'mainnet' | 'devnet' = 'mainnet';

jest.mock('../providers/pack-partner/constants/environment', () => ({
  ...jest.requireActual('../providers/pack-partner/constants/environment'),
  get PACK_PARTNER_ENVIRONMENT() {
    return mockPackPartnerEnvironment;
  },
}));

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<CollectiblesControllerMessenger>,
  MessengerEvents<CollectiblesControllerMessenger>
>;
type HandleSnapRequest = SnapControllerHandleRequestAction['handler'];
type InvalidateQueries =
  DataServiceInvalidateQueriesAction<'PackPartnerDataService'>['handler'];

const NOW = Date.parse('2026-09-29T12:00:00.000Z');
const ACCOUNT = {
  id: '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91',
  address: '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
};
const SECOND_ADDRESS = 'H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1';
const THIRD_ADDRESS = '9iQWVTEBXJmw7N5ZoPE1njuijtfAcXsDhUzwDY88ZBoh';
const PACK: CollectiblesPackRef = {
  code: 'pokemon_50',
  name: 'Pokemon 50',
  price: 50,
  priceAmount: '50000000',
};
const CARD_MINT = nftWon.id;
const UNSIGNED_PURCHASE = 'dW5zaWduZWQtcHVyY2hhc2U=';
const SIGNED_PURCHASE = 'c2lnbmVkLXB1cmNoYXNl';
const CARD: CollectiblesCard = {
  mint: CARD_MINT,
  name: 'Ivysaur',
  acquiredAt: NOW,
  buyback: { status: 'unknown' },
};
const OPERATION: CollectiblesPackOperation = {
  memo: 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a',
  packCode: PACK.code,
  packName: PACK.name,
  price: PACK.price,
  priceAmount: PACK.priceAmount,
  status: 'submitted',
  createdAt: NOW,
  updatedAt: NOW,
};
const SALE: CollectiblesBuybackOperation = {
  mint: CARD_MINT,
  memo: 'cc-buyback-memo',
  status: 'pending',
  amount: '42500000',
  submissionAttempted: true,
  signature: 'sale-signature',
  createdAt: NOW,
  updatedAt: NOW,
};

const buildProviderState = (): PackPartnerState => ({
  operations: { [ACCOUNT.address]: { [OPERATION.memo]: OPERATION } },
  sales: { [ACCOUNT.address]: { [SALE.mint]: SALE } },
});

const buildState = (): CollectiblesControllerState => ({
  ...getDefaultCollectiblesControllerState(),
  packPartner: buildProviderState(),
});

/**
 * Provider state written by an earlier development build: owned cards were
 * cached, a purchase stored only its whole-USDC price, and a signed purchase
 * kept its signed bytes until submission.
 *
 * @returns The legacy persisted provider state.
 */
const buildLegacyProviderState = (): PackPartnerState => {
  const { priceAmount: _priceAmount, ...legacyOperation } = OPERATION;
  return {
    operations: {
      [ACCOUNT.address]: {
        [OPERATION.memo]: {
          ...legacyOperation,
          status: 'signed',
          signedTransaction: SIGNED_PURCHASE,
          signature: 'purchase-signature',
        },
      },
    },
    cards: { [ACCOUNT.address]: { [CARD.mint]: CARD } },
  } as unknown as PackPartnerState;
};

/**
 * Workflow API client whose every call is a mock: unit tests never reach HTTP.
 *
 * @returns The mocked client.
 */
const buildApi = (): jest.Mocked<PackPartnerApi> => ({
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

// Restored JSON may use historical provider keys absent from the current state type.
const setup = (
  state?: Partial<CollectiblesControllerState> | Record<string, unknown>,
) => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const handleSnapRequest = jest.fn<
    ReturnType<HandleSnapRequest>,
    Parameters<HandleSnapRequest>
  >();
  const invalidateQueries = jest
    .fn<ReturnType<InvalidateQueries>, Parameters<InvalidateQueries>>()
    .mockResolvedValue(undefined);
  rootMessenger.registerActionHandler(
    'SnapController:handleRequest',
    handleSnapRequest,
  );
  rootMessenger.registerActionHandler(
    'PackPartnerDataService:invalidateQueries',
    invalidateQueries,
  );
  const messenger: CollectiblesControllerMessenger = new Messenger({
    namespace: COLLECTIBLES_CONTROLLER_NAME,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'SnapController:handleRequest',
      'PackPartnerDataService:invalidateQueries',
    ],
    events: ['KeyringController:unlock'],
    messenger,
  });
  const api = buildApi();
  const controller = new CollectiblesController({
    messenger,
    state,
    packPartner: { api, now: () => NOW },
  });
  return {
    controller,
    messenger,
    rootMessenger,
    api,
    handleSnapRequest,
    invalidateQueries,
  };
};

/**
 * Lets deferred work run: read refreshes are fire-and-forget and start on a
 * later microtask than the outcome they follow.
 *
 * @returns A promise resolved after pending microtasks.
 */
const flushDeferredWork = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const toPersisted = (
  controller: CollectiblesController,
): CollectiblesControllerState =>
  deriveStateFromMetadata(
    controller.state,
    controller.metadata,
    'persist',
  ) as CollectiblesControllerState;

describe('CollectiblesController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockPackPartnerEnvironment = 'mainnet';
  });

  describe('state', () => {
    it('renames the saved provider keys without losing batches, sales or network archives', () => {
      mockPackPartnerEnvironment = 'devnet';
      const devnet = buildProviderState();
      devnet.operations[ACCOUNT.address][OPERATION.memo] = {
        ...OPERATION,
        status: 'paid',
        batchId: 'batch-id',
        batchMemos: [OPERATION.memo, 'second-memo'],
      };
      const previous = {
        previousProvider: devnet,
        previousProviderEnvironment: 'devnet',
        previousProviderByEnvironment: { mainnet: buildProviderState() },
      };

      const { controller, handleSnapRequest } = setup(previous);
      const persisted = toPersisted(controller);
      const restored = setup(persisted).controller;

      expect(restored.state).toStrictEqual({
        packPartner: devnet,
        packPartnerEnvironment: 'devnet',
        packPartnerByEnvironment: { mainnet: buildProviderState() },
      });
      expect(previous.previousProvider).toStrictEqual(devnet);
      expect(persisted).not.toHaveProperty('previousProvider');
      expect(handleSnapRequest).not.toHaveBeenCalled();
    });

    it('keeps an unmarked previous provider journal on mainnet when the build uses devnet', () => {
      mockPackPartnerEnvironment = 'devnet';
      const previous = {
        previousProvider: buildProviderState(),
      };

      const { controller } = setup(previous);

      expect(controller.state.packPartner).toStrictEqual({
        operations: {},
        sales: {},
      });
      expect(controller.state.packPartnerByEnvironment).toStrictEqual({
        mainnet: buildProviderState(),
      });
    });

    it.each(['mainnet', 'devnet'] as const)(
      'restores a %s archive even when the previous provider has no active journal',
      (environment) => {
        mockPackPartnerEnvironment = environment;
        const previous = {
          previousProviderByEnvironment: {
            [environment]: buildProviderState(),
          },
        };

        const { controller } = setup(previous);

        expect(controller.state.packPartner).toStrictEqual(
          buildProviderState(),
        );
        expect(controller.state.packPartnerByEnvironment).toStrictEqual({});
      },
    );

    it.each([
      { packPartner: buildProviderState() },
      { packPartnerByEnvironment: { devnet: buildProviderState() } },
      { anotherProvider: buildProviderState() },
    ])(
      'rejects ambiguous provider keys without choosing or discarding a journal (%j)',
      (conflicting) => {
        const previous = {
          previousProvider: buildProviderState(),
          ...conflicting,
        };
        const original = JSON.stringify(previous);

        expect(() => setup(previous)).toThrow(
          'Ambiguous Collectibles provider state',
        );
        expect(JSON.stringify(previous)).toBe(original);
      },
    );

    it.each([
      { previousProviderEnvironment: 'testnet' },
      { previousProviderEnvironment: null },
      { previousProviderByEnvironment: null },
      { previousProviderByEnvironment: { testnet: buildProviderState() } },
      { previousProviderByEnvironment: { mainnet: buildProviderState() } },
    ])(
      'rejects an unsupported or conflicting saved network instead of guessing (%j)',
      (network) => {
        const previous = {
          previousProvider: buildProviderState(),
          ...network,
        };

        expect(() => setup(previous)).toThrow(
          'Invalid Collectibles provider network state',
        );
      },
    );

    it.each([undefined, {}])(
      'initializes the default state from an empty persisted scaffold (%j)',
      (state) => {
        const { controller } = setup(state);

        expect(controller.name).toBe(COLLECTIBLES_CONTROLLER_NAME);
        expect(controller.state).toStrictEqual(
          getDefaultCollectiblesControllerState(),
        );
      },
    );

    it('restores the persisted operation journal', () => {
      const state = buildState();

      const { controller } = setup(state);

      expect(controller.state).toStrictEqual(state);
    });

    it('drops legacy cards and resumes a legacy signed purchase as submitted, with its price amount and without its signed bytes', () => {
      const { controller } = setup({
        packPartner: buildLegacyProviderState(),
      });

      expect(controller.state.packPartner).toStrictEqual({
        operations: { [ACCOUNT.address]: { [OPERATION.memo]: OPERATION } },
        sales: {},
      });
    });

    it('exposes the feature state through its messenger', () => {
      const { controller, messenger } = setup();

      const state = messenger.call('CollectiblesController:getState');

      expect(state).toBe(controller.state);
    });
  });

  describe('workflow', () => {
    it('drives PackPartner through the required workflow API client', async () => {
      // @ts-expect-error The workflow needs its own uncached PackPartner client.
      const withoutApi: ConstructorParameters<
        typeof CollectiblesController
      >[0]['packPartner'] = { now: () => NOW };
      const { controller, api } = setup();
      api.generatePack.mockResolvedValue({
        memo: OPERATION.memo,
        transaction: UNSIGNED_PURCHASE,
      });

      const memo = await controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
      });

      expect(withoutApi).not.toHaveProperty('api');
      expect(api.generatePack).toHaveBeenCalledWith({
        playerAddress: ACCOUNT.address,
        packType: PACK.code,
      });
      expect(
        controller.state.packPartner.operations[ACCOUNT.address][memo],
      ).toMatchObject({ memo, status: 'generated' });
    });

    it('publishes provider updates as Collectibles state changes', async () => {
      const { controller, messenger, api } = setup();
      api.generatePack.mockResolvedValue({
        memo: OPERATION.memo,
        transaction: UNSIGNED_PURCHASE,
      });
      const onStateChanged = jest.fn();
      messenger.subscribe(
        'CollectiblesController:stateChanged',
        onStateChanged,
      );

      await messenger.call('CollectiblesController:generatePack', {
        account: ACCOUNT,
        pack: PACK,
      });

      expect(onStateChanged).toHaveBeenCalledWith(
        controller.state,
        expect.any(Array),
      );
    });

    it('records the purchase as submitted without its signed bytes before submitting them', async () => {
      const { controller, messenger, api, handleSnapRequest } = setup();
      api.generatePack.mockResolvedValue({
        memo: OPERATION.memo,
        transaction: UNSIGNED_PURCHASE,
      });
      const memo = await controller.generatePack({
        account: ACCOUNT,
        pack: PACK,
      });
      const publishedStates: string[] = [];
      messenger.subscribe('CollectiblesController:stateChanged', (state) => {
        publishedStates.push(JSON.stringify(state));
      });
      handleSnapRequest.mockResolvedValue({
        signedTransaction: SIGNED_PURCHASE,
        signature: 'purchase-signature',
      });
      let stateAtSubmission: CollectiblesControllerState | undefined;
      api.submitTransaction.mockImplementation(async () => {
        stateAtSubmission = controller.state;
        return {
          signature: 'purchase-signature',
          confirmationStatus: 'confirmed',
        };
      });
      api.openPack.mockResolvedValue({
        status: 'awarded',
        mint: CARD_MINT,
        transactionSignature: 'open-signature',
        nft: nftWon,
        rarity: 'common',
      });

      const card = await controller.completePack({ account: ACCOUNT, memo });

      expect(handleSnapRequest).toHaveBeenCalledTimes(1);
      expect(api.submitTransaction).toHaveBeenCalledWith({
        signedTransaction: SIGNED_PURCHASE,
      });
      expect(
        stateAtSubmission?.packPartner.operations[ACCOUNT.address][memo],
      ).toStrictEqual({ ...OPERATION, status: 'submitted' });
      expect(card.mint).toBe(CARD_MINT);
      expect(publishedStates.length).toBeGreaterThan(0);
      expect(
        publishedStates.some((state) => state.includes(SIGNED_PURCHASE)),
      ).toBe(false);
    });
  });

  describe('provider delegation', () => {
    it('delegates generatePack to the provider', async () => {
      const { messenger } = setup();
      const params = {
        account: ACCOUNT,
        pack: PACK,
        options: { quantity: 2, turbo: true },
      };
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'generatePack')
        .mockResolvedValue(OPERATION.memo);

      const memo = await messenger.call(
        'CollectiblesController:generatePack',
        params,
      );

      expect(memo).toBe(OPERATION.memo);
      expect(spy).toHaveBeenCalledWith(params);
    });

    it('delegates completePack to the provider', async () => {
      const { messenger } = setup();
      const params = { account: ACCOUNT, memo: OPERATION.memo };
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'completePack')
        .mockResolvedValue(CARD);

      const card = await messenger.call(
        'CollectiblesController:completePack',
        params,
      );

      expect(card).toBe(CARD);
      expect(spy).toHaveBeenCalledWith(params);
    });

    it('delegates completePacks to the provider', async () => {
      const { messenger } = setup();
      const params = { account: ACCOUNT, memo: OPERATION.memo };
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'completePacks')
        .mockResolvedValue(undefined);

      await messenger.call('CollectiblesController:completePacks', params);

      expect(spy).toHaveBeenCalledWith(params);
    });

    it('delegates markPackRevealed to the provider', () => {
      const { messenger } = setup();
      const params = {
        account: ACCOUNT,
        memo: OPERATION.memo,
        completed: true,
      };
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'markPackRevealed')
        .mockReturnValue(undefined);

      messenger.call('CollectiblesController:markPackRevealed', params);

      expect(spy).toHaveBeenCalledWith(params);
    });

    it('delegates sellCards to the provider', async () => {
      const { messenger } = setup();
      const params = {
        account: ACCOUNT,
        cards: [
          {
            mint: CARD_MINT,
            expectedAmount: SALE.amount,
            nftStandard: 'core' as const,
          },
        ],
      };
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'sellCards')
        .mockResolvedValue(undefined);

      await messenger.call('CollectiblesController:sellCards', params);

      expect(spy).toHaveBeenCalledWith(params);
    });

    it('delegates dismissOperation to the provider', () => {
      const { messenger } = setup();
      const params = { account: ACCOUNT, memo: OPERATION.memo };
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'dismissOperation')
        .mockReturnValue(undefined);

      messenger.call('CollectiblesController:dismissOperation', params);

      expect(spy).toHaveBeenCalledWith(params);
    });

    it('delegates recoverOperations to the provider by address', async () => {
      const { messenger } = setup();
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'recoverOperations')
        .mockResolvedValue(undefined);

      await messenger.call('CollectiblesController:recoverOperations', {
        address: ACCOUNT.address,
      });

      expect(spy).toHaveBeenCalledWith({ address: ACCOUNT.address });
    });

    it('delegates checkSales to the provider by address', async () => {
      const { messenger } = setup();
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'checkSales')
        .mockResolvedValue(undefined);

      await messenger.call('CollectiblesController:checkSales', {
        address: ACCOUNT.address,
      });

      expect(spy).toHaveBeenCalledWith({ address: ACCOUNT.address });
    });

    it('delegates sellCard to the provider', async () => {
      const { messenger } = setup();
      const params = {
        account: ACCOUNT,
        mint: CARD_MINT,
        expectedAmount: SALE.amount,
        nftStandard: 'core' as const,
      };
      const sale = {
        mint: CARD_MINT,
        amount: SALE.amount,
        signature: 'sale-signature',
      };
      const spy = jest
        .spyOn(PackPartnerProvider.prototype, 'sellCard')
        .mockResolvedValue(sale);

      const result = await messenger.call(
        'CollectiblesController:sellCard',
        params,
      );

      expect(result).toBe(sale);
      expect(spy).toHaveBeenCalledWith(params);
    });
  });

  describe('data-service refresh', () => {
    it('refreshes the owned-card read through PackPartnerDataService:invalidateQueries after an award', async () => {
      const { controller, api, invalidateQueries } = setup(buildState());
      api.openPack.mockResolvedValue({
        status: 'awarded',
        mint: CARD_MINT,
        transactionSignature: 'open-signature',
        nft: nftWon,
        rarity: 'common',
      });

      await controller.completePack({
        account: ACCOUNT,
        memo: OPERATION.memo,
      });
      await flushDeferredWork();

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'PackPartnerDataService:getOwnedCards',
          'mainnet',
          ACCOUNT.address,
        ],
      });
    });

    it('refreshes the offer read through PackPartnerDataService:invalidateQueries when the buyback is unavailable', async () => {
      const { controller, api, invalidateQueries } = setup();
      api.getBuybackAvailability.mockResolvedValue({ available: false });

      await expect(
        controller.sellCard({
          account: ACCOUNT,
          mint: CARD_MINT,
          expectedAmount: SALE.amount,
        }),
      ).rejects.toMatchObject({ code: 'BUYBACK_UNAVAILABLE' });
      await flushDeferredWork();

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'PackPartnerDataService:getBuybackOffer',
          'mainnet',
          CARD_MINT,
        ],
      });
    });

    it('completes an award even when the data-service refresh throws synchronously', async () => {
      const { controller, api, invalidateQueries } = setup(buildState());
      invalidateQueries.mockImplementation(() => {
        throw new Error('PackPartnerDataService is not registered');
      });
      api.openPack.mockResolvedValue({
        status: 'awarded',
        mint: CARD_MINT,
        transactionSignature: 'open-signature',
        nft: nftWon,
        rarity: 'common',
      });

      const card = await controller.completePack({
        account: ACCOUNT,
        memo: OPERATION.memo,
      });
      await flushDeferredWork();

      expect(card.mint).toBe(CARD_MINT);
      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      expect(
        controller.state.packPartner.operations[ACCOUNT.address][
          OPERATION.memo
        ],
      ).toStrictEqual(
        expect.objectContaining({ status: 'opened', mint: CARD_MINT }),
      );
      expect(
        controller.state.packPartner.operations[ACCOUNT.address][OPERATION.memo]
          .error,
      ).toBeUndefined();
    });
  });

  describe('wallet unlock', () => {
    it('recovers every address present in purchases or buybacks', () => {
      const { rootMessenger } = setup({
        packPartner: {
          operations: {
            [ACCOUNT.address]: { [OPERATION.memo]: OPERATION },
            [SECOND_ADDRESS]: { [OPERATION.memo]: OPERATION },
          },
          sales: {
            [SECOND_ADDRESS]: { [SALE.mint]: SALE },
            [THIRD_ADDRESS]: { [SALE.mint]: SALE },
          },
        },
      });
      const recover = jest
        .spyOn(PackPartnerProvider.prototype, 'recoverOperations')
        .mockResolvedValue(undefined);

      rootMessenger.publish('KeyringController:unlock');

      expect(recover.mock.calls).toStrictEqual([
        [{ address: ACCOUNT.address }],
        [{ address: SECOND_ADDRESS }],
        [{ address: THIRD_ADDRESS }],
      ]);
    });

    it('recovers nothing when the operation journal is empty', () => {
      const { rootMessenger } = setup();
      const recover = jest
        .spyOn(PackPartnerProvider.prototype, 'recoverOperations')
        .mockResolvedValue(undefined);

      rootMessenger.publish('KeyringController:unlock');

      expect(recover).not.toHaveBeenCalled();
    });

    it.each(['packPartner', 'previousProvider'])(
      'resumes a submitted purchase from %s by memo without signing or submitting again',
      async (key) => {
        const { controller, rootMessenger, api, handleSnapRequest } = setup({
          [key]: buildProviderState(),
        });
        const opened = new Promise<void>((resolve) => {
          api.openPack.mockImplementation(async () => {
            resolve();
            return {
              status: 'awarded',
              mint: CARD_MINT,
              transactionSignature: 'open-signature',
              nft: nftWon,
              rarity: 'common',
            };
          });
        });
        api.checkBuyback.mockResolvedValue({ exists: true, isComplete: false });

        rootMessenger.publish('KeyringController:unlock');
        await opened;
        await controller.recoverOperations({ address: ACCOUNT.address });

        expect(
          controller.state.packPartner.operations[ACCOUNT.address][
            OPERATION.memo
          ],
        ).toMatchObject({ status: 'opened', mint: CARD_MINT });
        expect(api.openPack).toHaveBeenCalledWith({ memo: OPERATION.memo });
        expect(api.checkBuyback).toHaveBeenCalledWith({ memo: SALE.memo });
        expect(handleSnapRequest).not.toHaveBeenCalled();
        expect(api.submitTransaction).not.toHaveBeenCalled();
      },
    );
  });

  describe('metadata', () => {
    it('persists the operation journal using its pruning rules', () => {
      const stale = NOW - PACK_PARTNER_TIMINGS.TERMINAL_TTL - 1;
      const opened: CollectiblesPackOperation = {
        ...OPERATION,
        memo: 'opened',
        status: 'opened',
        mint: CARD_MINT,
        result: CARD,
      };
      const completedSale: CollectiblesBuybackOperation = {
        ...SALE,
        mint: 'completed-mint',
        status: 'completed',
      };
      const state: CollectiblesControllerState = {
        ...getDefaultCollectiblesControllerState(),
        packPartner: {
          operations: {
            [ACCOUNT.address]: {
              [OPERATION.memo]: OPERATION,
              [opened.memo]: opened,
              generated: {
                ...OPERATION,
                memo: 'generated',
                status: 'generated',
                transaction: UNSIGNED_PURCHASE,
              },
              expired: {
                ...OPERATION,
                memo: 'expired',
                status: 'expired',
                updatedAt: stale,
              },
            },
            [SECOND_ADDRESS]: {
              failed: {
                ...OPERATION,
                memo: 'failed',
                status: 'failed',
                updatedAt: stale,
              },
            },
          },
          sales: {
            [ACCOUNT.address]: {
              [SALE.mint]: { ...SALE, updatedAt: stale },
              [completedSale.mint]: completedSale,
              'old-completed-mint': {
                ...completedSale,
                mint: 'old-completed-mint',
                updatedAt: stale,
              },
            },
            [SECOND_ADDRESS]: {
              [completedSale.mint]: { ...completedSale, updatedAt: stale },
            },
          },
        },
      };
      const { controller } = setup(state);

      const persisted = toPersisted(controller);

      expect(persisted.packPartner).toStrictEqual({
        operations: {
          [ACCOUNT.address]: {
            [OPERATION.memo]: OPERATION,
            [opened.memo]: opened,
          },
        },
        sales: {
          [ACCOUNT.address]: {
            [SALE.mint]: { ...SALE, updatedAt: stale },
            [completedSale.mint]: completedSale,
          },
        },
      });
      expect(
        controller.state.packPartner.operations[ACCOUNT.address].generated
          ?.status,
      ).toBe('generated');
      expect(
        controller.state.packPartner.sales[ACCOUNT.address][
          'old-completed-mint'
        ],
      ).toBeDefined();
    });

    it.each(['includeInStateLogs', 'includeInDebugSnapshot'] as const)(
      'excludes the operation journal from %s',
      (property) => {
        const { controller } = setup({
          ...buildState(),
          packPartnerByEnvironment: { devnet: buildProviderState() },
        });

        const derived = deriveStateFromMetadata(
          controller.state,
          controller.metadata,
          property,
        );

        expect(derived).toStrictEqual({
          packPartnerEnvironment: 'mainnet',
        });
      },
    );

    it('exposes only the active journal to the UI', () => {
      const { controller } = setup({
        ...buildState(),
        packPartnerByEnvironment: { devnet: buildProviderState() },
      });

      const derived = deriveStateFromMetadata(
        controller.state,
        controller.metadata,
        'usedInUi',
      );

      expect(derived).toStrictEqual({
        packPartner: buildProviderState(),
      });
    });
  });

  describe('environments', () => {
    it('archives unmarked legacy operations as mainnet when starting in devnet, without resuming them', () => {
      mockPackPartnerEnvironment = 'devnet';
      const { controller, rootMessenger } = setup({
        packPartner: buildLegacyProviderState(),
      });
      const recover = jest
        .spyOn(PackPartnerProvider.prototype, 'recoverOperations')
        .mockResolvedValue(undefined);

      rootMessenger.publish('KeyringController:unlock');

      expect(controller.state.packPartner).toStrictEqual({
        operations: {},
        sales: {},
      });
      expect(controller.state.packPartnerEnvironment).toBe('devnet');
      expect(controller.state.packPartnerByEnvironment).toStrictEqual({
        mainnet: {
          operations: { [ACCOUNT.address]: { [OPERATION.memo]: OPERATION } },
          sales: {},
        },
      });
      expect(recover).not.toHaveBeenCalled();
    });

    it('restores only the selected network and preserves each network through persistence round trips', () => {
      const mainnet = buildProviderState();
      const devnet: PackPartnerState = {
        operations: {},
        sales: {
          [ACCOUNT.address]: {
            'devnet-mint': { ...SALE, mint: 'devnet-mint' },
          },
        },
      };
      const { controller } = setup({
        packPartnerEnvironment: 'devnet',
        packPartner: devnet,
        packPartnerByEnvironment: { mainnet },
      });
      const persisted = toPersisted(controller);
      mockPackPartnerEnvironment = 'devnet';

      const restored = setup(persisted).controller;

      expect(controller.state.packPartner).toStrictEqual(mainnet);
      expect(controller.state.packPartnerByEnvironment).toStrictEqual({
        devnet,
      });
      expect(restored.state.packPartner).toStrictEqual(devnet);
      expect(restored.state.packPartnerByEnvironment).toStrictEqual({
        mainnet,
      });
    });

    it('restores a legacy archive through the same migration as the active journal', () => {
      const { controller } = setup({
        packPartnerByEnvironment: { devnet: buildLegacyProviderState() },
      });

      expect(controller.state.packPartnerByEnvironment).toStrictEqual({
        devnet: {
          operations: { [ACCOUNT.address]: { [OPERATION.memo]: OPERATION } },
          sales: {},
        },
      });
    });

    it('prunes generated and expired archive operations on persistence', () => {
      const archived = buildProviderState();
      archived.operations[ACCOUNT.address].unsigned = {
        ...OPERATION,
        memo: 'unsigned',
        status: 'generated',
        transaction: UNSIGNED_PURCHASE,
      };
      archived.operations[ACCOUNT.address].expired = {
        ...OPERATION,
        memo: 'expired',
        status: 'expired',
        updatedAt: NOW - PACK_PARTNER_TIMINGS.TERMINAL_TTL - 1,
      };
      const { controller } = setup({
        packPartnerByEnvironment: { devnet: archived },
      });

      const persisted = toPersisted(controller);

      expect(persisted.packPartnerByEnvironment).toStrictEqual({
        devnet: buildProviderState(),
      });
      expect(
        controller.state.packPartnerByEnvironment?.devnet?.operations[
          ACCOUNT.address
        ].unsigned,
      ).toBeDefined();
    });
  });

  describe('clearState', () => {
    it('clears the operation journal and provider work when the wallet resets', () => {
      const { controller, messenger } = setup(buildState());
      const clearProvider = jest.spyOn(
        PackPartnerProvider.prototype,
        'clearState',
      );
      const onStateChanged = jest.fn();
      messenger.subscribe(
        'CollectiblesController:stateChanged',
        onStateChanged,
      );

      controller.clearState();

      expect(controller.state).toStrictEqual(
        getDefaultCollectiblesControllerState(),
      );
      expect(clearProvider).toHaveBeenCalledTimes(1);
      expect(onStateChanged).toHaveBeenCalledWith(
        controller.state,
        expect.any(Array),
      );
    });

    it('clears all archived networks so resetting cannot restore another wallet later', () => {
      const previous = buildState();
      const { controller } = setup({
        ...previous,
        packPartnerByEnvironment: { devnet: previous.packPartner },
      });

      controller.clearState();
      const persisted = toPersisted(controller);
      mockPackPartnerEnvironment = 'devnet';
      const restarted = setup(persisted).controller;

      expect(persisted.packPartnerByEnvironment).toStrictEqual({});
      expect(restarted.state.packPartner).toStrictEqual({
        operations: {},
        sales: {},
      });
      expect(restarted.state.packPartnerByEnvironment).toStrictEqual({
        mainnet: { operations: {}, sales: {} },
      });
    });
  });
});
