import { Hex } from '@metamask/utils';
import { Messenger } from '@metamask/messenger';
import {
  fundsMoved,
  MoneyAccountMigrationController,
  reconcile,
} from './MoneyAccountMigrationController';
import type {
  MoneyAccountMigrationControllerActions,
  MoneyAccountMigrationControllerEvents,
  MoneyAccountMigrationControllerMessenger,
  MoneyAccountMigrationControllerState,
} from './types';
import type { MigrationInventory } from '../../../../lib/Money/migration/types';
import { EMPTY_SNAPSHOT } from '../../../../lib/Money/migration/types';

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
  vmUsd: 0n,
  musd: 0n,
  nativeWei: 0n,
  vaultAllowance: 0n,
  cardAllowance: 0n,
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

function createController(
  state?: Partial<MoneyAccountMigrationControllerState>,
) {
  return new MoneyAccountMigrationController({
    messenger: buildMockMessenger(),
    state,
  });
}

describe('fundsMoved', () => {
  it('returns false when planned vmUSD is still on source', () => {
    expect(
      fundsMoved(plan({ vmUsd: 10n }), plan({ vmUsd: 10n })),
    ).toBe(false);
  });

  it('returns true when planned vmUSD is gone', () => {
    expect(fundsMoved(plan({ vmUsd: 10n }), plan({ vmUsd: 0n }))).toBe(
      true,
    );
  });

  it('returns false for an empty plan so teardown still runs', () => {
    expect(fundsMoved(plan(), plan())).toBe(false);
  });
});

describe('reconcile', () => {
  it('jumps TORN_DOWN to BATCH_EXECUTED when funds already moved', () => {
    expect(
      reconcile({
        status: 'TORN_DOWN',
        plan: plan({ vmUsd: 10n }),
        live: plan({ vmUsd: 0n }),
      }),
    ).toBe('BATCH_EXECUTED');
  });

  it('does not jump IDLE', () => {
    expect(
      reconcile({
        status: 'IDLE',
        plan: plan({ vmUsd: 10n }),
        live: plan({ vmUsd: 0n }),
      }),
    ).toBe('IDLE');
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
    expect(controller.snapshot.status).toBe('IDLE');
  });

  it('skips teardown when Gate 1 fails', async () => {
    const controller = createController();
    jest.spyOn(controller, 'assertBatchFromSelf').mockResolvedValue(false);
    const teardown = jest.spyOn(controller, 'teardown');

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).not.toHaveBeenCalled();
    expect(controller.snapshot.status).toBe('IDLE');
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
    expect(controller.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('unlinks Card only when inventory says the old address is linked', async () => {
    const controller = createController();
    openGates(controller);
    jest.spyOn(controller, 'collectInventory').mockResolvedValue(
      plan({ cardLinked: true }),
    );
    const unlink = jest.spyOn(controller, 'unlinkCard').mockResolvedValue();

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(unlink).toHaveBeenCalledWith(SOURCE);
  });

  it('re-links Card from the persisted plan when live inventory is already unlinked', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'INVENTORIED',
      inventory: plan({ cardLinked: true }),
      destination: DEST,
    });
    jest
      .spyOn(controller, 'collectInventory')
      .mockResolvedValue(plan({ cardLinked: false }));
    jest.spyOn(controller, 'unlinkCard').mockResolvedValue();
    const relink = jest.spyOn(controller, 'relinkCard').mockResolvedValue();

    await controller.resume();

    expect(relink).toHaveBeenCalledWith(DEST);
  });

  it('resumes the same source and destination after a crash', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'INVENTORIED',
      inventory: plan(),
      destination: DEST,
    });
    openGates(controller);
    const teardown = jest.spyOn(controller, 'teardown').mockResolvedValue();

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).toHaveBeenCalled();
    expect(controller.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('throws when migrate is called with a different destination while in progress', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'INVENTORIED',
      inventory: plan(),
      destination: DEST,
    });

    await expect(
      controller.migrate({ source: SOURCE, destination: OTHER }),
    ).rejects.toThrow('migration-in-progress');
  });

  it('awaits the persisted batch id instead of submitting again', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'TORN_DOWN',
      inventory: plan({ vmUsd: 10n }),
      destination: DEST,
      exitBatchId: BATCH_ID,
      tornDownAt: Date.now(),
    });
    jest
      .spyOn(controller, 'collectInventory')
      .mockResolvedValue(plan({ vmUsd: 10n }));
    const submit = jest.spyOn(controller, 'submitExitBatch');
    const awaitBatch = jest
      .spyOn(controller, 'awaitExitBatch')
      .mockResolvedValue();

    await controller.resume();

    expect(submit).not.toHaveBeenCalled();
    expect(awaitBatch).toHaveBeenCalledWith(BATCH_ID);
    expect(controller.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('does not submit when chain already shows funds moved', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'TORN_DOWN',
      inventory: plan({ vmUsd: 10n }),
      destination: DEST,
      tornDownAt: Date.now(),
    });
    jest
      .spyOn(controller, 'collectInventory')
      .mockResolvedValue(plan({ vmUsd: 0n }));
    const execute = jest.spyOn(controller, 'executeExitBatch');

    await controller.resume();

    expect(execute).not.toHaveBeenCalled();
    expect(controller.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('does not run the exit batch when resuming after BATCH_EXECUTED', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'BATCH_EXECUTED',
      inventory: plan(),
      destination: DEST,
      exitBatchId: BATCH_ID,
    });
    const execute = jest.spyOn(controller, 'executeExitBatch');
    const residual = jest
      .spyOn(controller, 'persistResidualDelegation')
      .mockResolvedValue();

    await controller.resume();

    expect(execute).not.toHaveBeenCalled();
    expect(residual).toHaveBeenCalled();
    expect(controller.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('persists the batch id before awaiting confirmation', async () => {
    const controller = createController();
    openGates(controller);
    jest.spyOn(controller, 'collectInventory').mockResolvedValue(plan());
    jest.spyOn(controller, 'submitExitBatch').mockImplementation(async () => {
      expect(controller.state.status).toBe('TORN_DOWN');
      expect(controller.state.exitBatchId).toBeNull();
      return BATCH_ID;
    });
    jest.spyOn(controller, 'awaitExitBatch').mockImplementation(async () => {
      expect(controller.state.exitBatchId).toBe(BATCH_ID);
    });

    await controller.migrate({ source: SOURCE, destination: DEST });

    expect(controller.snapshot.status).toBe('VERIFIED_INERT');
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

  it('aborts INVENTORIED back to IDLE without teardown restore', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'INVENTORIED',
      inventory: plan(),
      destination: DEST,
    });
    const restore = jest.spyOn(controller, 'restore');

    await controller.abort();

    expect(restore).not.toHaveBeenCalled();
    expect(controller.snapshot.status).toBe('IDLE');
  });

  it('refuses abort after the batch is submitted', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'TORN_DOWN',
      inventory: plan(),
      destination: DEST,
      exitBatchId: BATCH_ID,
      tornDownAt: Date.now(),
    });

    await expect(controller.abort()).rejects.toThrow('batch-in-flight');
  });

  it('refuses abort after BATCH_EXECUTED', async () => {
    const controller = createController({
      ...EMPTY_SNAPSHOT,
      status: 'BATCH_EXECUTED',
      inventory: plan(),
      destination: DEST,
    });

    await expect(controller.abort()).rejects.toThrow('point-of-no-return');
  });
});
