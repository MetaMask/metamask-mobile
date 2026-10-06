import { deriveStateFromMetadata } from '@metamask/base-controller';
import { Messenger } from '@metamask/messenger';
import { CollectorCryptProvider } from '../providers/collector-crypt';
import { COLLECTOR_CRYPT_TIMINGS } from '../providers/collector-crypt/constants';
import { createCollectorCryptApi } from '../providers/collector-crypt/services/collectorCryptApi';
import type {
  CollectorCryptCard,
  PackOperation,
} from '../providers/collector-crypt/types';
import {
  GachaController,
  GACHA_CONTROLLER_NAME,
  getDefaultGachaControllerState,
  type GachaControllerMessenger,
  type GachaControllerState,
} from './GachaController';

const NOW = Date.parse('2026-09-29T12:00:00.000Z');
const ACCOUNT = {
  id: '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91',
  address: '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
};
const PACK = { code: 'pokemon_50', name: 'Pokemon 50', price: 50 };
const CARD: CollectorCryptCard = {
  mint: 'H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1',
  name: 'Pikachu',
  source: 'nftApi',
  acquiredAt: NOW,
  buyback: { status: 'unknown' },
};
const OPERATION: PackOperation = {
  memo: 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a',
  packCode: PACK.code,
  packName: PACK.name,
  price: PACK.price,
  status: 'signed',
  createdAt: NOW,
  updatedAt: NOW,
  signedTransaction: 'c2lnbmVkLXB1cmNoYXNl',
};
const buildState = (): GachaControllerState => ({
  hasCompletedOnboarding: false,
  collectorCrypt: {
    operations: { [ACCOUNT.address]: { [OPERATION.memo]: OPERATION } },
    cards: { [ACCOUNT.address]: { [CARD.mint]: CARD } },
  },
});
const setup = (state?: Partial<GachaControllerState>) => {
  const messenger: GachaControllerMessenger = new Messenger({
    namespace: GACHA_CONTROLLER_NAME,
  });
  const generatePack = jest.fn().mockResolvedValue({
    memo: OPERATION.memo,
    transaction: 'cHVyY2hhc2U=',
  });
  const submitTransaction = jest
    .fn()
    .mockRejectedValue(new TypeError('Network request failed'));
  const getPackStatus = jest
    .fn()
    .mockRejectedValue(new TypeError('Network request failed'));
  const controller = new GachaController({
    messenger,
    state,
    collectorCrypt: {
      now: () => NOW,
      api: {
        ...createCollectorCryptApi(),
        generatePack,
        submitTransaction,
        getPackStatus,
      },
    },
  });
  return { controller, messenger, generatePack, submitTransaction };
};

describe('GachaController', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([undefined, {}])(
    'initializes provider data from an empty persisted scaffold (%j)',
    (state) => {
      const { controller } = setup(state);

      expect(controller.name).toBe(GACHA_CONTROLLER_NAME);
      expect(controller.state).toStrictEqual(getDefaultGachaControllerState());
    },
  );

  it('restores the provider state', () => {
    const state = buildState();

    const { controller } = setup(state);

    expect(controller.state).toStrictEqual(state);
  });

  it('requires onboarding for legacy states with only provider data', () => {
    const { collectorCrypt } = buildState();

    const { controller } = setup({ collectorCrypt });

    expect(controller.state.hasCompletedOnboarding).toBe(false);
    expect(controller.state.collectorCrypt).toStrictEqual(collectorCrypt);
  });

  it('persists onboarding completion through controller reconstruction', () => {
    const { controller, messenger } = setup();

    messenger.call('GachaController:completeOnboarding');
    const persisted = deriveStateFromMetadata(
      controller.state,
      controller.metadata,
      'persist',
    );
    const restored = setup({
      hasCompletedOnboarding: persisted.hasCompletedOnboarding === true,
    });

    expect(persisted.hasCompletedOnboarding).toBe(true);
    expect(restored.controller.state.hasCompletedOnboarding).toBe(true);
  });

  it('resets onboarding without changing the cards or pending operations', () => {
    const state = { ...buildState(), hasCompletedOnboarding: true };
    const { controller, messenger } = setup(state);
    const providerState = controller.state.collectorCrypt;

    messenger.call('GachaController:resetOnboarding');

    expect(controller.state.hasCompletedOnboarding).toBe(false);
    expect(controller.state.collectorCrypt).toBe(providerState);
  });

  it('exposes the feature state through its messenger', () => {
    const { controller, messenger } = setup();

    expect(messenger.call('GachaController:getState')).toBe(controller.state);
  });

  it('delegates pack requests to its provider through the messenger', async () => {
    const getPacks = jest
      .spyOn(CollectorCryptProvider.prototype, 'getPacks')
      .mockResolvedValue([]);
    const { messenger } = setup();

    const packs = await messenger.call('GachaController:getPacks');

    expect(packs).toStrictEqual([]);
    expect(getPacks).toHaveBeenCalledTimes(1);
  });

  it('publishes provider updates as Gacha state changes', async () => {
    const { controller, messenger, generatePack } = setup();
    const onStateChanged = jest.fn();
    messenger.subscribe('GachaController:stateChanged', onStateChanged);

    const memo = await messenger.call('GachaController:generatePack', {
      account: ACCOUNT,
      pack: PACK,
    });

    expect(generatePack).toHaveBeenCalledWith({
      playerAddress: ACCOUNT.address,
      packType: PACK.code,
    });
    expect(
      controller.state.collectorCrypt.operations[ACCOUNT.address][memo],
    ).toMatchObject({ memo, status: 'generated' });
    expect(onStateChanged).toHaveBeenCalledWith(
      controller.state,
      expect.any(Array),
    );
  });

  it('persists provider data using its pruning rules', () => {
    const state = buildState();
    state.collectorCrypt.operations[ACCOUNT.address].generated = {
      ...OPERATION,
      memo: 'generated',
      status: 'generated',
      transaction: 'cHVyY2hhc2U=',
    };
    state.collectorCrypt.operations[ACCOUNT.address].expired = {
      ...OPERATION,
      memo: 'expired',
      status: 'expired',
      updatedAt: NOW - COLLECTOR_CRYPT_TIMINGS.TERMINAL_TTL - 1,
    };
    const { controller } = setup(state);

    const persisted = deriveStateFromMetadata(
      controller.state,
      controller.metadata,
      'persist',
    );

    expect(persisted).toStrictEqual(buildState());
    expect(
      controller.state.collectorCrypt.operations[ACCOUNT.address].generated,
    ).toBeDefined();
  });

  it('records the submitted operation before sending its signed bytes', async () => {
    const { controller, submitTransaction } = setup(buildState());
    let submittedState: GachaControllerState | undefined;
    submitTransaction.mockImplementation(async () => {
      submittedState = controller.state;
      throw new TypeError('Network request failed');
    });

    await expect(
      controller.completePack({ account: ACCOUNT, memo: OPERATION.memo }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    expect(
      submittedState?.collectorCrypt.operations[ACCOUNT.address][
        OPERATION.memo
      ],
    ).toMatchObject({
      status: 'submitted',
      signedTransaction: OPERATION.signedTransaction,
    });
    expect(submitTransaction).toHaveBeenCalledWith({
      signedTransaction: OPERATION.signedTransaction,
    });
  });

  it.each(['includeInStateLogs', 'includeInDebugSnapshot'] as const)(
    'excludes provider data from %s',
    (property) => {
      const { controller } = setup(buildState());

      expect(
        deriveStateFromMetadata(
          controller.state,
          controller.metadata,
          property,
        ),
      ).toStrictEqual({ hasCompletedOnboarding: false });
    },
  );

  it('clears onboarding and provider state when the wallet resets', () => {
    const { controller, messenger } = setup({
      ...buildState(),
      hasCompletedOnboarding: true,
    });
    const onStateChanged = jest.fn();
    messenger.subscribe('GachaController:stateChanged', onStateChanged);

    controller.clearState();

    expect(controller.state).toStrictEqual(getDefaultGachaControllerState());
    expect(onStateChanged).toHaveBeenCalledWith(
      controller.state,
      expect.any(Array),
    );
  });
});
