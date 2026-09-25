import { Hex } from '@metamask/utils';
import { Messenger } from '@metamask/messenger';
import {
  MoneyAccountMigrationController,
  planHash,
} from './MoneyAccountMigrationController';
import type {
  MoneyAccountMigrationControllerActions,
  MoneyAccountMigrationControllerEvents,
  MoneyAccountMigrationControllerMessenger,
  MoneyAccountMigrationControllerState,
} from './types';
import {
  EMPTY_CURSOR,
  type MigrationInventory,
} from '../../../../lib/Money/migration/types';
import type { MoneyAccountMigrationPocService } from '../../../../lib/Money/migration/MoneyAccountMigrationPocService';

const SOURCE = '0x1111111111111111111111111111111111111111' as Hex;
const DEST = '0x2222222222222222222222222222222222222222' as Hex;
const OTHER = '0x3333333333333333333333333333333333333333' as Hex;
const BATCH_ID =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex;

const plan = (
  overrides: Partial<MigrationInventory> = {},
): MigrationInventory => ({
  source: SOURCE,
  destination: DEST,
  chainId: '0x8f',
  vmUsd: '0',
  musd: '0',
  nativeWei: '0',
  vaultAllowance: '0',
  cardAllowance: '0',
  chompIntentHashes: [],
  chompDelegationHashes: [],
  cardLinked: false,
  ...overrides,
});

function buildMockMessenger(): jest.Mocked<MoneyAccountMigrationControllerMessenger> {
  const messenger = new Messenger<
    'MoneyAccountMigrationController',
    MoneyAccountMigrationControllerActions,
    MoneyAccountMigrationControllerEvents
  >({ namespace: 'MoneyAccountMigrationController' });
  return messenger as unknown as jest.Mocked<MoneyAccountMigrationControllerMessenger>;
}

const fakeSteps = () =>
  ({
    collectInventory: jest.fn(async (source: Hex, destination: Hex) =>
      plan({ source, destination }),
    ),
    collectBlockers: jest.fn(async () => []),
    assertBatchFromSelf: jest.fn(async () => false),
    unlinkCard: jest.fn(async () => undefined),
    submitExitBatch: jest.fn(async () => null),
    awaitExitBatch: jest.fn(async () => undefined),
    persistResidualDelegation: jest.fn(async () => undefined),
    upgradeDestination: jest.fn(async () => undefined),
    relinkCard: jest.fn(async () => undefined),
    verifyOldInert: jest.fn(async () => undefined),
  }) as unknown as MoneyAccountMigrationPocService;

function createController(
  state?: Partial<MoneyAccountMigrationControllerState>,
) {
  return new MoneyAccountMigrationController({
    messenger: buildMockMessenger(),
    state,
    steps: fakeSteps(),
  });
}

describe('planHash', () => {
  it('changes when consented transfer amounts change', () => {
    expect(planHash(plan({ vmUsd: '10' }))).not.toBe(
      planHash(plan({ vmUsd: '11' })),
    );
  });
});

describe('cursor persistence', () => {
  it('serializes the local cursor through JSON.stringify', () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'CONSENTED',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
      planHash: planHash(plan({ vmUsd: '10' })),
      cardWasLinked: true,
    });

    expect(() => JSON.stringify(controller.state)).not.toThrow();

    const restored = JSON.parse(
      JSON.stringify(controller.state),
    ) as MoneyAccountMigrationControllerState;

    expect(createController(restored).state).toEqual(controller.state);
  });
});

describe('MoneyAccountMigrationController', () => {
  const openGates = (controller: MoneyAccountMigrationController) => {
    jest.spyOn(controller, 'assertBatchFromSelf').mockResolvedValue(true);
  };

  it('skips teardown when a blocker is present', async () => {
    const controller = createController();
    openGates(controller);
    jest
      .spyOn(controller, 'collectBlockers')
      .mockResolvedValue([{ kind: 'pending-money-tx' }]);
    const teardown = jest.spyOn(controller, 'teardown');

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).not.toHaveBeenCalled();
    expect(controller.state.phase).toBeNull();
  });

  it('skips teardown when Gate 1 fails', async () => {
    const controller = createController();
    jest.spyOn(controller, 'assertBatchFromSelf').mockResolvedValue(false);
    const teardown = jest.spyOn(controller, 'teardown');

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).not.toHaveBeenCalled();
    expect(controller.state.phase).toBeNull();
  });

  it('runs teardown, exit batch, residual, then re-provision in that order', async () => {
    const controller = createController();
    openGates(controller);
    const order: string[] = [];
    jest.spyOn(controller, 'teardown').mockImplementation(async () => {
      order.push('teardown');
    });
    jest.spyOn(controller, 'executeExitBatch').mockImplementation(async () => {
      order.push('batch');
      controller.update((state) => {
        state.phase = 'BATCH_EXECUTED';
      });
    });
    jest
      .spyOn(controller, 'persistResidualDelegation')
      .mockImplementation(async () => {
        order.push('residual');
      });
    jest.spyOn(controller, 'reprovision').mockImplementation(async () => {
      order.push('reprovision');
    });

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(order).toEqual(['teardown', 'batch', 'residual', 'reprovision']);
    expect(controller.state).toEqual({ ...EMPTY_CURSOR, migrated: {} });
  });

  it('marks the old address migrated and keeps it after the cursor clears', async () => {
    const controller = createController();
    openGates(controller);
    jest.spyOn(controller, 'executeExitBatch').mockImplementation(async () => {
      controller.update((state) => {
        state.phase = 'BATCH_EXECUTED';
      });
    });

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(controller.state.phase).toBeNull();
    expect(controller.state.migrated[SOURCE].newAddress).toBe(DEST);
  });

  it('refuses to migrate an address that is already migrated', async () => {
    const controller = createController({
      migrated: { [SOURCE]: { newAddress: DEST, migratedAt: 1 } },
    });

    await expect(
      controller.migrate({ source: SOURCE, destination: OTHER }),
    ).rejects.toThrow('already-migrated');
  });

  it('does not persist a cursor before consent', async () => {
    const controller = createController();
    jest.spyOn(controller, 'assertBatchFromSelf').mockResolvedValue(false);

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(controller.state.phase).toBeNull();
  });

  it('unlinks Card only when inventory says the old address is linked', async () => {
    const controller = createController();
    openGates(controller);
    jest
      .spyOn(controller, 'collectInventory')
      .mockResolvedValue(plan({ cardLinked: true }));
    const unlink = jest.spyOn(controller, 'unlinkCard').mockResolvedValue();

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(unlink).toHaveBeenCalledWith(SOURCE);
  });

  it('re-links Card from cardWasLinked when live inventory is already unlinked', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'CONSENTED',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
      cardWasLinked: true,
    });
    jest
      .spyOn(controller, 'collectInventory')
      .mockResolvedValue(plan({ cardLinked: false }));
    jest.spyOn(controller, 'unlinkCard').mockResolvedValue();
    jest.spyOn(controller, 'executeExitBatch').mockImplementation(async () => {
      controller.update((state) => {
        state.phase = 'BATCH_EXECUTED';
      });
    });
    const relink = jest.spyOn(controller, 'relinkCard').mockResolvedValue();

    await controller.resume();

    expect(relink).toHaveBeenCalledWith(DEST);
  });

  it('resumes the same source and destination after a crash', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'CONSENTED',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
    });
    openGates(controller);
    const teardown = jest.spyOn(controller, 'teardown').mockResolvedValue();
    jest.spyOn(controller, 'executeExitBatch').mockImplementation(async () => {
      controller.update((state) => {
        state.phase = 'BATCH_EXECUTED';
      });
    });

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).toHaveBeenCalled();
    expect(controller.state.phase).toBeNull();
  });

  it('throws when migrate is called with a different destination while in progress', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'CONSENTED',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
    });

    await expect(
      controller.migrate({ source: SOURCE, destination: OTHER }),
    ).rejects.toThrow('migration-in-progress');
  });

  it('awaits the persisted exitBatchId instead of submitting again', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'TORN_DOWN',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
      exitBatchId: BATCH_ID,
      updatedAt: Date.now(),
    });
    const submit = jest.spyOn(controller, 'submitExitBatch');
    const awaitBatch = jest
      .spyOn(controller, 'awaitExitBatch')
      .mockResolvedValue();

    await controller.resume();

    expect(submit).not.toHaveBeenCalled();
    expect(awaitBatch).toHaveBeenCalledWith(BATCH_ID);
    expect(controller.state.phase).toBeNull();
  });

  it('does not re-inventory when resuming TORN_DOWN without an exitBatchId', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'TORN_DOWN',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
      cardWasLinked: true,
      updatedAt: Date.now(),
    });
    const collectBlockers = jest.spyOn(controller, 'collectBlockers');
    const execute = jest
      .spyOn(controller, 'executeExitBatch')
      .mockImplementation(async () => {
        controller.update((state) => {
          state.phase = 'BATCH_EXECUTED';
        });
      });

    await controller.resume();

    expect(collectBlockers).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
    expect(controller.state.phase).toBeNull();
  });

  it('does not run the exit batch when resuming after BATCH_EXECUTED', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'BATCH_EXECUTED',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
      exitBatchId: BATCH_ID,
    });
    const execute = jest.spyOn(controller, 'executeExitBatch');
    const residual = jest
      .spyOn(controller, 'persistResidualDelegation')
      .mockResolvedValue();

    await controller.resume();

    expect(execute).not.toHaveBeenCalled();
    expect(residual).toHaveBeenCalled();
    expect(controller.state.phase).toBeNull();
  });

  it('persists exitBatchId as BATCH_SUBMITTED before awaiting confirmation', async () => {
    const controller = createController();
    openGates(controller);
    jest.spyOn(controller, 'collectInventory').mockResolvedValue(plan());
    jest.spyOn(controller, 'submitExitBatch').mockImplementation(async () => {
      expect(controller.state.phase).toBe('TORN_DOWN');
      expect(controller.state.exitBatchId).toBeNull();
      return BATCH_ID;
    });
    jest.spyOn(controller, 'awaitExitBatch').mockImplementation(async () => {
      expect(controller.state.phase).toBe('BATCH_SUBMITTED');
      expect(controller.state.exitBatchId).toBe(BATCH_ID);
    });

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(controller.state.phase).toBeNull();
  });

  it('throws when migrate is already running', async () => {
    const controller = createController();
    openGates(controller);
    let release: () => void = () => undefined;
    let enteredTeardown: () => void = () => undefined;
    const inTeardown = new Promise<void>((resolve) => {
      enteredTeardown = resolve;
    });
    jest.spyOn(controller, 'teardown').mockImplementation(
      () =>
        new Promise((resolve) => {
          enteredTeardown();
          release = resolve;
        }),
    );

    const first = controller.migrate({ source: SOURCE, destination: DEST });
    await inTeardown;
    await expect(
      controller.migrate({ source: SOURCE, destination: DEST }),
    ).rejects.toThrow('migration-in-progress');
    release();
    await first;
  });

  it('aborts CONSENTED by deleting the cursor without restore', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'CONSENTED',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
    });
    const restore = jest.spyOn(controller, 'restore');

    await controller.abort();

    expect(restore).not.toHaveBeenCalled();
    expect(controller.state.phase).toBeNull();
  });

  it('refuses abort after the batch is submitted', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'TORN_DOWN',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
      exitBatchId: BATCH_ID,
      updatedAt: Date.now(),
    });

    await expect(controller.abort()).rejects.toThrow('point-of-no-return');
  });

  it('refuses abort after BATCH_EXECUTED', async () => {
    const controller = createController({
      ...EMPTY_CURSOR,
      phase: 'BATCH_EXECUTED',
      oldAddress: SOURCE,
      newAddress: DEST,
      chainId: '0x8f',
    });

    await expect(controller.abort()).rejects.toThrow('point-of-no-return');
  });
});
