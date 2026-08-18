import { Hex } from '@metamask/utils';
import Engine from '../../../core/Engine';
import { emptyCardHomeData } from '../../../core/Engine/controllers/card-controller/provider-types';
import { whenMoneyAccountUpgradeReady } from '../../../core/Engine/controllers/money-account-upgrade-controller-init';
import { MoneyAccountMigrationPocService } from './MoneyAccountMigrationPocService';
import type { MigrationInventory } from './types';

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
    context: {
      CardController: {
        getCardHomeData: jest.fn(),
        linkMoneyAccountCard: jest.fn(),
      },
    },
  },
}));

jest.mock(
  '../../../core/Engine/controllers/money-account-upgrade-controller-init',
  () => ({
    whenMoneyAccountUpgradeReady: jest.fn(() => Promise.resolve()),
  }),
);

const SOURCE = '0x1111111111111111111111111111111111111111' as Hex;
const DEST = '0x2222222222222222222222222222222222222222' as Hex;
const PRIVATE_KEY =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex;
const INTENT_HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;
const DELEGATION_HASH =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex;

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockGetCardHomeData = Engine.context.CardController
  .getCardHomeData as jest.MockedFunction<
  typeof Engine.context.CardController.getCardHomeData
>;
const mockLinkMoneyAccountCard = Engine.context.CardController
  .linkMoneyAccountCard as jest.MockedFunction<
  typeof Engine.context.CardController.linkMoneyAccountCard
>;
const mockWhenMoneyAccountUpgradeReady =
  whenMoneyAccountUpgradeReady as jest.MockedFunction<
    typeof whenMoneyAccountUpgradeReady
  >;

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

const stubMessenger = () => {
  mockCall.mockImplementation(async (action: string) => {
    switch (action) {
      case 'RemoteFeatureFlagController:getState':
        return { remoteFeatureFlags: {} };
      case 'MoneyAccountBalanceService:getVmusdBalance':
      case 'MoneyAccountBalanceService:getMusdBalance':
        return { balance: '0' };
      case 'ChompApiService:getIntentsByAddress':
        return [];
      case 'AuthenticatedUserStorageService:listDelegations':
        return [];
      case 'CardController:getState':
        return { moneyAccountCardLinkInProgress: false };
      case 'MoneyAccountUpgradeController:upgradeAccount':
        return undefined;
      case 'AuthenticatedUserStorageService:revokeDelegation':
        return undefined;
      default:
        throw new Error(`unexpected action ${action}`);
    }
  });
  mockGetCardHomeData.mockResolvedValue(emptyCardHomeData());
  mockLinkMoneyAccountCard.mockResolvedValue(undefined);
};

describe('MoneyAccountMigrationPocService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhenMoneyAccountUpgradeReady.mockResolvedValue(undefined);
    stubMessenger();
  });

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

  it('returns a dummy address and private key for the new account', async () => {
    const service = new MoneyAccountMigrationPocService();

    const created = await service.createDestination();

    expect(created).toEqual({
      address: DEST,
      privateKey: PRIVATE_KEY,
    });
  });

  it('uses createDestination when migrate is called without a destination', async () => {
    const service = new MoneyAccountMigrationPocService();
    openGates(service);
    const created = jest.spyOn(service, 'createDestination').mockResolvedValue({
      address: DEST,
      privateKey: PRIVATE_KEY,
    });
    const collectInventory = jest
      .spyOn(service, 'collectInventory')
      .mockResolvedValue(plan());

    await service.migrate({ source: SOURCE });

    expect(created).toHaveBeenCalled();
    expect(collectInventory).toHaveBeenCalledWith(SOURCE, DEST);
  });

  it('reads balances, CHOMP intents, storage delegations, and Card home data', async () => {
    mockCall.mockImplementation(async (action: string) => {
      switch (action) {
        case 'RemoteFeatureFlagController:getState':
          return { remoteFeatureFlags: { moneyAccountVaultConfig: { chainId: '0x8f' } } };
        case 'MoneyAccountBalanceService:getVmusdBalance':
          return { balance: '5' };
        case 'MoneyAccountBalanceService:getMusdBalance':
          return { balance: '12' };
        case 'ChompApiService:getIntentsByAddress':
          return [{ status: 'active', delegationHash: INTENT_HASH }];
        case 'AuthenticatedUserStorageService:listDelegations':
          return [
            {
              signedDelegation: { delegator: SOURCE },
              metadata: { delegationHash: DELEGATION_HASH },
            },
          ];
        case 'CardController:getState':
          return { moneyAccountCardLinkInProgress: false };
        default:
          throw new Error(`unexpected action ${action}`);
      }
    });
    const service = new MoneyAccountMigrationPocService();

    const inventory = await service.collectInventory(SOURCE, DEST);

    expect(inventory.vmUsd).toBe(5n);
    expect(inventory.musd).toBe(12n);
    expect(inventory.chompIntentHashes).toEqual([INTENT_HASH]);
    expect(inventory.chompDelegationHashes).toEqual([DELEGATION_HASH]);
    expect(inventory.cardLinked).toBe(false);
    expect(mockGetCardHomeData).toHaveBeenCalledWith(SOURCE);
  });

  it('returns in-flight-card-spend when Card link is in progress', async () => {
    mockCall.mockImplementation(async (action: string) => {
      if (action === 'CardController:getState') {
        return { moneyAccountCardLinkInProgress: true };
      }
      throw new Error(`unexpected action ${action}`);
    });
    const service = new MoneyAccountMigrationPocService();

    const blockers = await service.collectBlockers(plan());

    expect(blockers).toEqual([{ kind: 'in-flight-card-spend' }]);
  });

  it('unlinks Card by revoking the Money Account delegation amount', async () => {
    const service = new MoneyAccountMigrationPocService();

    await service.unlinkCard(SOURCE);

    expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith({
      moneyAccountAddress: SOURCE,
      delegationAmountHuman: '0',
    });
  });

  it('waits for upgrade bootstrap before calling upgradeAccount', async () => {
    const order: string[] = [];
    mockWhenMoneyAccountUpgradeReady.mockImplementation(async () => {
      order.push('ready');
    });
    mockCall.mockImplementation(async (action: string) => {
      if (action === 'MoneyAccountUpgradeController:upgradeAccount') {
        order.push('upgrade');
      }
    });
    const service = new MoneyAccountMigrationPocService();

    await service.upgradeDestination(DEST);

    expect(order).toEqual(['ready', 'upgrade']);
    expect(mockCall).toHaveBeenCalledWith(
      'MoneyAccountUpgradeController:upgradeAccount',
      DEST,
    );
  });

  it('does not call upgradeAccount when bootstrap has not been scheduled', async () => {
    mockWhenMoneyAccountUpgradeReady.mockRejectedValue(
      new Error(
        'MoneyAccountUpgradeController bootstrap has not been scheduled yet',
      ),
    );
    const service = new MoneyAccountMigrationPocService();

    await expect(service.upgradeDestination(DEST)).rejects.toThrow(
      'MoneyAccountUpgradeController bootstrap has not been scheduled yet',
    );

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('revokes CHOMP storage delegations through the messenger', async () => {
    const service = new MoneyAccountMigrationPocService();

    await service.revokeStorageDelegations([DELEGATION_HASH]);

    expect(mockCall).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:revokeDelegation',
      DELEGATION_HASH,
    );
  });
});
