import { Hex } from '@metamask/utils';
import {
  createMemoryStore,
  fundsMoved,
  MoneyAccountMigrationService,
  reconcile,
} from './MoneyAccountMigrationService';
import type { MigrationInventory } from './types';
import { EMPTY_SNAPSHOT } from './types';

const SOURCE = '0x1111111111111111111111111111111111111111' as Hex;
const DEST = '0x2222222222222222222222222222222222222222' as Hex;
const OTHER = '0x3333333333333333333333333333333333333333' as Hex;
const BATCH_ID = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex;

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

describe('MoneyAccountMigrationService', () => {
  const openGates = (service: MoneyAccountMigrationService) => {
    jest.spyOn(service, 'assertBatchFromSelf').mockResolvedValue(true);
  };

  it('skips teardown when a blocker is present', async () => {
    const service = new MoneyAccountMigrationService();
    openGates(service);
    jest
      .spyOn(service, 'collectBlockers')
      .mockResolvedValue([{ kind: 'pending-money-tx' }]);
    const teardown = jest.spyOn(service, 'teardown');

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).not.toHaveBeenCalled();
    expect(service.snapshot.status).toBe('IDLE');
  });

  it('skips teardown when Gate 1 fails', async () => {
    const service = new MoneyAccountMigrationService();
    jest.spyOn(service, 'assertBatchFromSelf').mockResolvedValue(false);
    const teardown = jest.spyOn(service, 'teardown');

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).not.toHaveBeenCalled();
    expect(service.snapshot.status).toBe('IDLE');
  });

  it('runs teardown, exit batch, residual, then re-provision in that order', async () => {
    const service = new MoneyAccountMigrationService();
    openGates(service);
    const order: string[] = [];
    jest.spyOn(service, 'teardown').mockImplementation(async () => {
      order.push('teardown');
    });
    jest.spyOn(service, 'executeExitBatch').mockImplementation(async () => {
      order.push('batch');
    });
    jest
      .spyOn(service, 'persistResidualDelegation')
      .mockImplementation(async () => {
        order.push('residual');
      });
    jest.spyOn(service, 'reprovision').mockImplementation(async () => {
      order.push('reprovision');
    });

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(order).toEqual(['teardown', 'batch', 'residual', 'reprovision']);
    expect(service.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('unlinks Card only when inventory says the old address is linked', async () => {
    const service = new MoneyAccountMigrationService();
    openGates(service);
    jest.spyOn(service, 'collectInventory').mockResolvedValue(
      plan({ cardLinked: true }),
    );
    const unlink = jest.spyOn(service, 'unlinkCard').mockResolvedValue();

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(unlink).toHaveBeenCalledWith(SOURCE);
  });

  it('resumes the same source and destination after a crash', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'INVENTORIED',
      inventory: plan(),
      destination: DEST,
    });
    const service = new MoneyAccountMigrationService(store);
    openGates(service);
    const teardown = jest.spyOn(service, 'teardown').mockResolvedValue();

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(teardown).toHaveBeenCalled();
    expect(service.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('throws when migrate is called with a different destination while in progress', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'INVENTORIED',
      inventory: plan(),
      destination: DEST,
    });
    const service = new MoneyAccountMigrationService(store);

    await expect(
      service.migrate({ source: SOURCE, destination: OTHER }),
    ).rejects.toThrow('migration-in-progress');
  });

  it('awaits the persisted batch id instead of submitting again', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'TORN_DOWN',
      inventory: plan({ vmUsd: 10n }),
      destination: DEST,
      exitBatchId: BATCH_ID,
      tornDownAt: Date.now(),
    });
    const service = new MoneyAccountMigrationService(store);
    jest
      .spyOn(service, 'collectInventory')
      .mockResolvedValue(plan({ vmUsd: 10n }));
    const submit = jest.spyOn(service, 'submitExitBatch');
    const awaitBatch = jest
      .spyOn(service, 'awaitExitBatch')
      .mockResolvedValue();

    await service.resume();

    expect(submit).not.toHaveBeenCalled();
    expect(awaitBatch).toHaveBeenCalledWith(BATCH_ID);
    expect(service.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('does not submit when chain already shows funds moved', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'TORN_DOWN',
      inventory: plan({ vmUsd: 10n }),
      destination: DEST,
      tornDownAt: Date.now(),
    });
    const service = new MoneyAccountMigrationService(store);
    jest
      .spyOn(service, 'collectInventory')
      .mockResolvedValue(plan({ vmUsd: 0n }));
    const execute = jest.spyOn(service, 'executeExitBatch');

    await service.resume();

    expect(execute).not.toHaveBeenCalled();
    expect(service.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('does not run the exit batch when resuming after BATCH_EXECUTED', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'BATCH_EXECUTED',
      inventory: plan(),
      destination: DEST,
      exitBatchId: BATCH_ID,
    });
    const service = new MoneyAccountMigrationService(store);
    const execute = jest.spyOn(service, 'executeExitBatch');
    const residual = jest
      .spyOn(service, 'persistResidualDelegation')
      .mockResolvedValue();

    await service.resume();

    expect(execute).not.toHaveBeenCalled();
    expect(residual).toHaveBeenCalled();
    expect(service.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('persists the batch id before awaiting confirmation', async () => {
    const store = createMemoryStore();
    const service = new MoneyAccountMigrationService(store);
    openGates(service);
    jest.spyOn(service, 'collectInventory').mockResolvedValue(plan());
    jest.spyOn(service, 'submitExitBatch').mockImplementation(async () => {
      expect(store.load().status).toBe('TORN_DOWN');
      expect(store.load().exitBatchId).toBeNull();
      return BATCH_ID;
    });
    jest.spyOn(service, 'awaitExitBatch').mockImplementation(async () => {
      expect(store.load().exitBatchId).toBe(BATCH_ID);
    });

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(service.snapshot.status).toBe('VERIFIED_INERT');
  });

  it('throws when migrate is already running', async () => {
    const service = new MoneyAccountMigrationService();
    openGates(service);
    let release: () => void = () => undefined;
    let enteredTeardown: () => void = () => undefined;
    const inTeardown = new Promise<void>((resolve) => {
      enteredTeardown = resolve;
    });
    jest.spyOn(service, 'teardown').mockImplementation(
      () =>
        new Promise((resolve) => {
          enteredTeardown();
          release = resolve;
        }),
    );

    const first = service.migrate({ source: SOURCE, destination: DEST });
    await inTeardown;
    await expect(
      service.migrate({ source: SOURCE, destination: DEST }),
    ).rejects.toThrow('migration-in-progress');
    release();
    await first;
  });

  it('aborts INVENTORIED back to IDLE without teardown restore', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'INVENTORIED',
      inventory: plan(),
      destination: DEST,
    });
    const service = new MoneyAccountMigrationService(store);
    const restore = jest.spyOn(service, 'restore');

    await service.abort();

    expect(restore).not.toHaveBeenCalled();
    expect(service.snapshot.status).toBe('IDLE');
  });

  it('refuses abort after the batch is submitted', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'TORN_DOWN',
      inventory: plan(),
      destination: DEST,
      exitBatchId: BATCH_ID,
      tornDownAt: Date.now(),
    });
    const service = new MoneyAccountMigrationService(store);

    await expect(service.abort()).rejects.toThrow('batch-in-flight');
  });

  it('refuses abort after BATCH_EXECUTED', async () => {
    const store = createMemoryStore({
      ...EMPTY_SNAPSHOT,
      status: 'BATCH_EXECUTED',
      inventory: plan(),
      destination: DEST,
    });
    const service = new MoneyAccountMigrationService(store);

    await expect(service.abort()).rejects.toThrow('point-of-no-return');
  });
});
