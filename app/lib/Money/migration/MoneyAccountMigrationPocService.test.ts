import { Hex } from '@metamask/utils';
import { MoneyAccountMigrationPocService } from './MoneyAccountMigrationPocService';
import type { MigrationInventory } from './types';

const SOURCE = '0x1111111111111111111111111111111111111111' as Hex;
const DEST = '0x2222222222222222222222222222222222222222' as Hex;

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

describe('MoneyAccountMigrationPocService', () => {
  const openGates = (service: MoneyAccountMigrationPocService) => {
    jest.spyOn(service, 'assertBatchFromSelf').mockResolvedValue(true);
    jest.spyOn(service, 'submitExitBatch').mockResolvedValue(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex,
    );
  };

  it('throws when a blocker is present', async () => {
    const service = new MoneyAccountMigrationPocService();
    openGates(service);
    jest
      .spyOn(service, 'collectBlockers')
      .mockResolvedValue([{ kind: 'pending-money-tx' }]);
    const teardown = jest.spyOn(service, 'teardown');

    await expect(
      service.migrate({ source: SOURCE, destination: DEST }),
    ).rejects.toThrow('pending-money-tx');

    expect(teardown).not.toHaveBeenCalled();
  });

  it('throws when Gate 1 fails', async () => {
    const service = new MoneyAccountMigrationPocService();
    jest.spyOn(service, 'assertBatchFromSelf').mockResolvedValue(false);
    const teardown = jest.spyOn(service, 'teardown');

    await expect(
      service.migrate({ source: SOURCE, destination: DEST }),
    ).rejects.toThrow('atomic-batch-unsupported');

    expect(teardown).not.toHaveBeenCalled();
  });

  it('throws when the exit batch is not submitted', async () => {
    const service = new MoneyAccountMigrationPocService();
    jest.spyOn(service, 'assertBatchFromSelf').mockResolvedValue(true);
    const residual = jest.spyOn(service, 'persistResidualDelegation');

    await expect(
      service.migrate({ source: SOURCE, destination: DEST }),
    ).rejects.toThrow('exit-batch-not-submitted');

    expect(residual).not.toHaveBeenCalled();
  });

  it('runs teardown, exit batch, residual, then re-provision in that order', async () => {
    const service = new MoneyAccountMigrationPocService();
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
  });

  it('unlinks Card only when inventory says the old address is linked', async () => {
    const service = new MoneyAccountMigrationPocService();
    openGates(service);
    jest.spyOn(service, 'collectInventory').mockResolvedValue(
      plan({ cardLinked: true }),
    );
    const unlink = jest.spyOn(service, 'unlinkCard').mockResolvedValue();

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(unlink).toHaveBeenCalledWith(SOURCE);
  });

  it('re-links Card from the inventory taken before teardown', async () => {
    const service = new MoneyAccountMigrationPocService();
    openGates(service);
    jest.spyOn(service, 'collectInventory').mockResolvedValue(
      plan({ cardLinked: true }),
    );
    jest.spyOn(service, 'unlinkCard').mockResolvedValue();
    const relink = jest.spyOn(service, 'relinkCard').mockResolvedValue();

    await service.migrate({ source: SOURCE, destination: DEST });

    expect(relink).toHaveBeenCalledWith(DEST);
  });
});
