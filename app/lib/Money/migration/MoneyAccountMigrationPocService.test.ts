import { Interface } from '@ethersproject/abi';
import { Hex, bytesToHex } from '@metamask/utils';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import type { MoneyAccount } from '@metamask/money-account-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { MUSD_TOKEN_ADDRESS } from '@metamask/money-account-utils';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { awaitTransactionConfirmed } from '../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import Engine from '../../../core/Engine';
import { emptyCardHomeData } from '../../../core/Engine/controllers/card-controller/provider-types';
import { whenMoneyAccountUpgradeReady } from '../../../core/Engine/controllers/money-account-upgrade-controller-init';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../components/UI/Money/queryKeys';
import { MONEY_ACCOUNT_DELEGATION_NETWORK } from '../../../components/UI/Card/util/vedaToken';
import { FEATURE_FLAG_NAME as GAS_FEES_SPONSORED_FLAG } from '../../../selectors/featureFlagController/gasFeesSponsored';
import {
  ROOT_AUTHORITY,
  getDelegationHashOffchain,
} from '../../../core/Delegation';
import { MoneyAccountMigrationPocService } from './MoneyAccountMigrationPocService';
import type { MigrationInventory } from './types';

jest.mock('@ethersproject/providers', () => ({
  Web3Provider: jest.fn(),
}));

jest.mock('@ethersproject/contracts', () => ({
  Contract: jest.fn(),
}));

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

jest.mock(
  '../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed',
  () => ({
    awaitTransactionConfirmed: jest.fn(),
  }),
);

const SOURCE = '0x1111111111111111111111111111111111111111' as Hex;
const DEST = '0x2222222222222222222222222222222222222222' as Hex;
const BORING_VAULT = '0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae' as Hex;
const CARD_DELEGATION = '0xc7f1b2228fbf28451c7bf791c4f610111f0f32cb' as Hex;
const INTENT_HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;
const DELEGATION_HASH =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex;
const BATCH_ID =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as Hex;
const ERC20 = new Interface(abiERC20);

const destinationAccount = (address: Hex = DEST): MoneyAccount => ({
  id: 'money-account-stub',
  type: EthAccountType.Eoa,
  address,
  scopes: [EthScope.Eoa],
  options: {
    entropy: {
      type: 'mnemonic',
      id: 'entropy-stub',
      groupIndex: 0,
      derivationPath: MONEY_DERIVATION_PATH,
    },
    exportable: false,
  },
  methods: [
    EthMethod.PersonalSign,
    EthMethod.SignTypedDataV1,
    EthMethod.SignTypedDataV3,
    EthMethod.SignTypedDataV4,
  ],
});

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
const mockAwaitTransactionConfirmed =
  awaitTransactionConfirmed as jest.MockedFunction<
    typeof awaitTransactionConfirmed
  >;
const mockGetBalance = jest.fn();
const mockAllowance = jest.fn();

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
      case 'MoneyAccountBalanceService:invalidateQueries':
      case 'ChompApiService:invalidateQueries':
      case 'AuthenticatedUserStorageService:invalidateQueries':
        return undefined;
      case 'CardController:getState':
        return { moneyAccountCardLinkInProgress: false };
      case 'MoneyAccountUpgradeController:upgradeAccount':
        return undefined;
      case 'AuthenticatedUserStorageService:revokeDelegation':
        return undefined;
      case 'NetworkController:findNetworkClientIdByChainId':
        return 'monad';
      case 'NetworkController:getNetworkClientById':
        return { provider: {} };
      case 'TransactionController:addTransactionBatch':
        return { batchId: BATCH_ID };
      case 'DelegationController:signDelegation':
        return '0xsig';
      case 'AuthenticatedUserStorageService:createDelegation':
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
    mockAwaitTransactionConfirmed.mockResolvedValue({
      txHash: '0xhash',
      transactionMeta: { id: 'tx-1' },
    } as never);
    mockGetBalance.mockResolvedValue({ toString: () => '0' });
    mockAllowance.mockResolvedValue({ toString: () => '0' });
    (Web3Provider as unknown as jest.Mock).mockImplementation(() => ({
      getBalance: mockGetBalance,
    }));
    (Contract as unknown as jest.Mock).mockImplementation(() => ({
      allowance: mockAllowance,
    }));
    stubMessenger();
  });

  const openGates = (service: MoneyAccountMigrationPocService) => {
    jest.spyOn(service, 'assertBatchFromSelf').mockResolvedValue(true);
    jest.spyOn(service, 'submitExitBatch').mockResolvedValue(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex,
    );
    jest.spyOn(service, 'awaitExitBatch').mockResolvedValue();
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

  it('returns a MoneyAccount with address, id, and non-exportable options', async () => {
    const service = new MoneyAccountMigrationPocService();

    const created = await service.createDestination();

    expect(created).toEqual(destinationAccount());
    expect(created).not.toHaveProperty('privateKey');
  });

  it('uses createDestination when migrate is called without a destination', async () => {
    const service = new MoneyAccountMigrationPocService();
    openGates(service);
    const created = jest
      .spyOn(service, 'createDestination')
      .mockResolvedValue(destinationAccount());
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
        case 'MoneyAccountBalanceService:invalidateQueries':
        case 'ChompApiService:invalidateQueries':
        case 'AuthenticatedUserStorageService:invalidateQueries':
          return undefined;
        case 'CardController:getState':
          return { moneyAccountCardLinkInProgress: false };
        case 'NetworkController:findNetworkClientIdByChainId':
          return 'monad';
        case 'NetworkController:getNetworkClientById':
          return { provider: {} };
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

  it('invalidates cached balances, intents, and delegations before reading them', async () => {
    const order: string[] = [];
    mockCall.mockImplementation(async (action: string) => {
      order.push(action);
      switch (action) {
        case 'MoneyAccountBalanceService:invalidateQueries':
        case 'ChompApiService:invalidateQueries':
        case 'AuthenticatedUserStorageService:invalidateQueries':
          return undefined;
        case 'RemoteFeatureFlagController:getState':
          return { remoteFeatureFlags: {} };
        case 'MoneyAccountBalanceService:getVmusdBalance':
        case 'MoneyAccountBalanceService:getMusdBalance':
          return { balance: '0' };
        case 'ChompApiService:getIntentsByAddress':
          return [];
        case 'AuthenticatedUserStorageService:listDelegations':
          return [];
        case 'NetworkController:findNetworkClientIdByChainId':
          return 'monad';
        case 'NetworkController:getNetworkClientById':
          return { provider: {} };
        default:
          throw new Error(`unexpected action ${action}`);
      }
    });
    const service = new MoneyAccountMigrationPocService();

    await service.collectInventory(SOURCE, DEST);

    expect(mockCall).toHaveBeenCalledWith(
      'MoneyAccountBalanceService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_VMUSD_BALANCE,
          SOURCE,
        ],
      },
    );
    expect(mockCall).toHaveBeenCalledWith(
      'MoneyAccountBalanceService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE,
          SOURCE,
        ],
      },
    );
    expect(mockCall).toHaveBeenCalledWith(
      'ChompApiService:invalidateQueries',
      {
        queryKey: ['ChompApiService:getIntentsByAddress', SOURCE],
      },
    );
    expect(mockCall).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:invalidateQueries',
      {
        queryKey: ['AuthenticatedUserStorageService:listDelegations'],
      },
    );

    const lastInvalidate = Math.max(
      ...order.flatMap((action, index) =>
        action.endsWith(':invalidateQueries') ? [index] : [],
      ),
      -1,
    );
    const firstFetch = Math.min(
      order.indexOf('MoneyAccountBalanceService:getVmusdBalance'),
      order.indexOf('MoneyAccountBalanceService:getMusdBalance'),
      order.indexOf('ChompApiService:getIntentsByAddress'),
      order.indexOf('AuthenticatedUserStorageService:listDelegations'),
    );
    expect(lastInvalidate).toBeGreaterThanOrEqual(0);
    expect(lastInvalidate).toBeLessThan(firstFetch);
  });

  it('reads native balance and mUSD allowances from RPC', async () => {
    mockCall.mockImplementation(async (action: string) => {
      switch (action) {
        case 'RemoteFeatureFlagController:getState':
          return {
            remoteFeatureFlags: {
              moneyAccountVaultConfig: {
                chainId: '0x8f',
                boringVault: BORING_VAULT,
              },
            },
          };
        case 'MoneyAccountBalanceService:getVmusdBalance':
        case 'MoneyAccountBalanceService:getMusdBalance':
          return { balance: '0' };
        case 'ChompApiService:getIntentsByAddress':
          return [];
        case 'AuthenticatedUserStorageService:listDelegations':
          return [];
        case 'MoneyAccountBalanceService:invalidateQueries':
        case 'ChompApiService:invalidateQueries':
        case 'AuthenticatedUserStorageService:invalidateQueries':
          return undefined;
        case 'NetworkController:findNetworkClientIdByChainId':
          return 'monad';
        case 'NetworkController:getNetworkClientById':
          return { provider: {} };
        default:
          throw new Error(`unexpected action ${action}`);
      }
    });
    mockGetCardHomeData.mockResolvedValue({
      ...emptyCardHomeData(),
      delegationSettings: {
        networks: [
          {
            network: MONEY_ACCOUNT_DELEGATION_NETWORK,
            environment: 'staging',
            chainId: '143',
            delegationContract: CARD_DELEGATION,
            tokens: {
              veda: {
                symbol: 'veda',
                decimals: 6,
                address: BORING_VAULT,
              },
            },
          },
        ],
        count: 1,
        _links: { self: '' },
      },
    });
    mockGetBalance.mockResolvedValue({ toString: () => '10000000000000000' });
    mockAllowance.mockImplementation(async (_owner: string, spender: string) => {
      if (spender.toLowerCase() === BORING_VAULT) {
        return { toString: () => '7' };
      }
      if (spender.toLowerCase() === CARD_DELEGATION) {
        return { toString: () => '9' };
      }
      return { toString: () => '0' };
    });
    const service = new MoneyAccountMigrationPocService();

    const inventory = await service.collectInventory(SOURCE, DEST);

    expect(inventory.nativeWei).toBe(10n ** 16n);
    expect(inventory.vaultAllowance).toBe(7n);
    expect(inventory.cardAllowance).toBe(9n);
    expect(mockCall).toHaveBeenCalledWith(
      'NetworkController:findNetworkClientIdByChainId',
      '0x8f',
    );
    expect(mockGetBalance).toHaveBeenCalledWith(SOURCE, 'pending');
    expect(mockAllowance).toHaveBeenCalledWith(
      SOURCE,
      BORING_VAULT,
      { blockTag: 'pending' },
    );
    expect(mockAllowance).toHaveBeenCalledWith(
      SOURCE,
      CARD_DELEGATION,
      { blockTag: 'pending' },
    );
  });

  it('leaves cardAllowance at 0 when Card has no delegation contract', async () => {
    mockCall.mockImplementation(async (action: string) => {
      switch (action) {
        case 'RemoteFeatureFlagController:getState':
          return {
            remoteFeatureFlags: {
              moneyAccountVaultConfig: {
                chainId: '0x8f',
                boringVault: BORING_VAULT,
              },
            },
          };
        case 'MoneyAccountBalanceService:getVmusdBalance':
        case 'MoneyAccountBalanceService:getMusdBalance':
          return { balance: '0' };
        case 'ChompApiService:getIntentsByAddress':
          return [];
        case 'AuthenticatedUserStorageService:listDelegations':
          return [];
        case 'MoneyAccountBalanceService:invalidateQueries':
        case 'ChompApiService:invalidateQueries':
        case 'AuthenticatedUserStorageService:invalidateQueries':
          return undefined;
        case 'NetworkController:findNetworkClientIdByChainId':
          return 'monad';
        case 'NetworkController:getNetworkClientById':
          return { provider: {} };
        default:
          throw new Error(`unexpected action ${action}`);
      }
    });
    mockGetBalance.mockResolvedValue({ toString: () => '1' });
    mockAllowance.mockResolvedValue({ toString: () => '7' });
    const service = new MoneyAccountMigrationPocService();

    const inventory = await service.collectInventory(SOURCE, DEST);

    expect(inventory.vaultAllowance).toBe(7n);
    expect(inventory.cardAllowance).toBe(0n);
    expect(mockAllowance).toHaveBeenCalledTimes(1);
    expect(mockAllowance).toHaveBeenCalledWith(
      SOURCE,
      BORING_VAULT,
      { blockTag: 'pending' },
    );
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

  it('submits one atomic exit batch with transfers, approve(0), and native last', async () => {
    mockCall.mockImplementation(async (action: string) => {
      switch (action) {
        case 'RemoteFeatureFlagController:getState':
          return {
            remoteFeatureFlags: {
              moneyAccountVaultConfig: {
                chainId: '0x8f',
                boringVault: BORING_VAULT,
              },
              [GAS_FEES_SPONSORED_FLAG]: { '0x8f': true },
            },
          };
        case 'NetworkController:findNetworkClientIdByChainId':
          return 'monad';
        case 'TransactionController:addTransactionBatch':
          return { batchId: BATCH_ID };
        default:
          throw new Error(`unexpected action ${action}`);
      }
    });
    mockGetCardHomeData.mockResolvedValue({
      ...emptyCardHomeData(),
      delegationSettings: {
        networks: [
          {
            network: MONEY_ACCOUNT_DELEGATION_NETWORK,
            environment: 'staging',
            chainId: '143',
            delegationContract: CARD_DELEGATION,
            tokens: {
              veda: {
                symbol: 'veda',
                decimals: 6,
                address: BORING_VAULT,
              },
            },
          },
        ],
        count: 1,
        _links: { self: '' },
      },
    });
    const service = new MoneyAccountMigrationPocService();

    const batchId = await service.submitExitBatch(
      plan({
        vmUsd: 5n,
        musd: 12n,
        nativeWei: 10n ** 16n,
        vaultAllowance: 7n,
        cardAllowance: 9n,
      }),
    );

    expect(batchId).toBe(BATCH_ID);
    expect(mockCall).toHaveBeenCalledWith(
      'TransactionController:addTransactionBatch',
      {
        from: SOURCE,
        networkClientId: 'monad',
        origin: 'metamask:money-account-migration',
        requireApproval: false,
        disableHook: false,
        disableSequential: true,
        isGasFeeSponsored: true,
        atomic: true,
        transactions: [
          {
            params: {
              to: BORING_VAULT,
              data: ERC20.encodeFunctionData('transfer', [DEST, '5']),
              value: '0x0',
            },
            type: TransactionType.contractInteraction,
          },
          {
            params: {
              to: MUSD_TOKEN_ADDRESS,
              data: ERC20.encodeFunctionData('transfer', [DEST, '12']),
              value: '0x0',
            },
            type: TransactionType.contractInteraction,
          },
          {
            params: {
              to: MUSD_TOKEN_ADDRESS,
              data: ERC20.encodeFunctionData('approve', [BORING_VAULT, '0']),
              value: '0x0',
            },
            type: TransactionType.contractInteraction,
          },
          {
            params: {
              to: MUSD_TOKEN_ADDRESS,
              data: ERC20.encodeFunctionData('approve', [CARD_DELEGATION, '0']),
              value: '0x0',
            },
            type: TransactionType.contractInteraction,
          },
          {
            params: {
              to: DEST,
              data: '0x',
              value: '0x2386f26fc10000',
            },
            type: TransactionType.contractInteraction,
          },
        ],
      },
    );
  });

  it('skips zero-amount transfers and unsponsored native sweep', async () => {
    mockCall.mockImplementation(async (action: string) => {
      switch (action) {
        case 'RemoteFeatureFlagController:getState':
          return {
            remoteFeatureFlags: {
              moneyAccountVaultConfig: {
                chainId: '0x8f',
                boringVault: BORING_VAULT,
              },
            },
          };
        case 'NetworkController:findNetworkClientIdByChainId':
          return 'monad';
        case 'TransactionController:addTransactionBatch':
          return { batchId: BATCH_ID };
        default:
          throw new Error(`unexpected action ${action}`);
      }
    });
    const service = new MoneyAccountMigrationPocService();

    await service.submitExitBatch(
      plan({ musd: 10n, nativeWei: 5n }),
    );

    const request = mockCall.mock.calls.find(
      ([action]) => action === 'TransactionController:addTransactionBatch',
    )?.[1] as { transactions: unknown[]; isGasFeeSponsored: boolean };

    expect(request.isGasFeeSponsored).toBe(false);
    expect(request.transactions).toEqual([
      {
        params: {
          to: MUSD_TOKEN_ADDRESS,
          data: ERC20.encodeFunctionData('transfer', [DEST, '10']),
          value: '0x0',
        },
        type: TransactionType.contractInteraction,
      },
    ]);
  });

  it('does not submit a batch when inventory amounts are all zero', async () => {
    const service = new MoneyAccountMigrationPocService();

    const batchId = await service.submitExitBatch(plan());

    expect(batchId).toBeNull();
    expect(mockCall).not.toHaveBeenCalledWith(
      'TransactionController:addTransactionBatch',
      expect.anything(),
    );
  });

  it('signs and stores a root residual Delegation from source to destination', async () => {
    const saltBytes = new Uint8Array(32).fill(1);
    jest.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(
      (buffer) => {
        const bytes = buffer as Uint8Array;
        bytes.set(saltBytes);
        return bytes;
      },
    );
    const salt = bytesToHex(saltBytes);
    const signature = '0xsig' as Hex;
    mockCall.mockImplementation(async (action: string) => {
      switch (action) {
        case 'DelegationController:signDelegation':
          return signature;
        case 'AuthenticatedUserStorageService:createDelegation':
          return undefined;
        default:
          throw new Error(`unexpected action ${action}`);
      }
    });
    const service = new MoneyAccountMigrationPocService();
    const unsigned = {
      delegate: DEST,
      delegator: SOURCE,
      authority: ROOT_AUTHORITY,
      caveats: [],
      salt,
    };

    await service.persistResidualDelegation(SOURCE, DEST, '0x8f');

    expect(mockCall).toHaveBeenCalledWith(
      'DelegationController:signDelegation',
      { delegation: unsigned, chainId: '0x8f' },
    );
    const signedDelegation = { ...unsigned, signature };
    expect(mockCall).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:createDelegation',
      {
        signedDelegation,
        metadata: {
          delegationHash: getDelegationHashOffchain(signedDelegation),
          chainIdHex: '0x8f',
          type: 'money-account-migration-residual',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'native',
          allowance: '0x0',
        },
      },
    );
  });

  it('returns when the exit batch inner transaction is already confirmed', async () => {
    mockCall.mockImplementation(async (action: string) => {
      if (action === 'TransactionController:getState') {
        return {
          transactions: [
            {
              id: 'tx-1',
              batchId: BATCH_ID,
              status: TransactionStatus.confirmed,
              hash: '0xhash',
            },
          ],
        };
      }
      throw new Error(`unexpected action ${action}`);
    });
    const service = new MoneyAccountMigrationPocService();

    await service.awaitExitBatch(BATCH_ID);

    expect(mockAwaitTransactionConfirmed).not.toHaveBeenCalled();
  });

  it('waits for confirmation when the exit batch inner transaction is still submitted', async () => {
    mockCall.mockImplementation(async (action: string) => {
      if (action === 'TransactionController:getState') {
        return {
          transactions: [
            {
              id: 'tx-1',
              batchId: BATCH_ID,
              status: TransactionStatus.submitted,
              hash: '0xhash',
            },
          ],
        };
      }
      throw new Error(`unexpected action ${action}`);
    });
    const service = new MoneyAccountMigrationPocService();

    await service.awaitExitBatch(BATCH_ID);

    expect(mockAwaitTransactionConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: Engine.controllerMessenger,
        submit: expect.any(Function),
      }),
    );
  });

  it('throws when the exit batch inner transaction has failed', async () => {
    mockCall.mockImplementation(async (action: string) => {
      if (action === 'TransactionController:getState') {
        return {
          transactions: [
            {
              id: 'tx-1',
              batchId: BATCH_ID,
              status: TransactionStatus.failed,
            },
          ],
        };
      }
      throw new Error(`unexpected action ${action}`);
    });
    const service = new MoneyAccountMigrationPocService();

    await expect(service.awaitExitBatch(BATCH_ID)).rejects.toThrow(
      'exit-batch-failed',
    );
    expect(mockAwaitTransactionConfirmed).not.toHaveBeenCalled();
  });
});
