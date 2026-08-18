import type { Hex } from '@metamask/utils';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import type { MoneyAccount } from '@metamask/money-account-controller';
import {
  MUSD_TOKEN_ADDRESS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '@metamask/money-account-utils';
import Engine from '../../../core/Engine';
import { whenMoneyAccountUpgradeReady } from '../../../core/Engine/controllers/money-account-upgrade-controller-init';
import { toCardFundingToken } from '../../../components/UI/Card/util/toCardTokenAllowance';
import { getVedaTokenConfig } from '../../../components/UI/Card/util/vedaToken';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../components/UI/Money/queryKeys';
import { isMoneyAccountDelegatedForCard } from '../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { getMoneyAccountVaultConfig } from '../../../selectors/featureFlagController/moneyAccount';
import type { MigrationBlocker, MigrationInventory } from './types';

const STUB_DESTINATION_ADDRESS =
  '0x2222222222222222222222222222222222222222' as Hex;
const STUB_DESTINATION_ACCOUNT: MoneyAccount = {
  id: 'money-account-stub',
  type: EthAccountType.Eoa,
  address: STUB_DESTINATION_ADDRESS,
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
};
const DEFAULT_CHAIN_ID = '0x8f' as Hex;
const PENDING_READ = { blockTag: 'pending' } as const;

/**
 * Option B Money Account footprint migration (ADR 0006) for POC.
 * Linear: inventory → teardown → one exit batch → residual → re-provision.
 * No persist, resume, or abort.
 */
export class MoneyAccountMigrationPocService {
  #cardDelegationAmountHuman = '0';

  async migrate({
    source,
    destination,
  }: {
    source: Hex;
    destination?: Hex;
  }): Promise<void> {
    const dest =
      destination ?? (await this.createDestination()).address;
    const inventory = await this.collectInventory(source, dest);
    const blockers = await this.collectBlockers(inventory);
    if (blockers.length > 0) {
      throw new Error(blockers[0].kind);
    }
    if (!(await this.assertBatchFromSelf(inventory))) {
      throw new Error('atomic-batch-unsupported');
    }

    await this.teardown(inventory);
    await this.executeExitBatch(inventory);
    await this.persistResidualDelegation(inventory.source, inventory.destination);
    await this.reprovision(inventory.destination, inventory);
    await this.verifyOldInert(inventory);
  }

  // ponytail: stub MoneyAccount until MoneyAccountController.createMoneyAccount(entropySource)
  async createDestination(): Promise<MoneyAccount> {
    return STUB_DESTINATION_ACCOUNT;
  }

  async collectInventory(
    source: Hex,
    destination: Hex,
  ): Promise<MigrationInventory> {
    const messenger = Engine.controllerMessenger;
    await Promise.all([
      messenger.call('MoneyAccountBalanceService:invalidateQueries', {
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_VMUSD_BALANCE,
          source,
        ],
      }),
      messenger.call('MoneyAccountBalanceService:invalidateQueries', {
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE,
          source,
        ],
      }),
      messenger.call('ChompApiService:invalidateQueries', {
        queryKey: ['ChompApiService:getIntentsByAddress', source],
      }),
      messenger.call('AuthenticatedUserStorageService:invalidateQueries', {
        queryKey: ['AuthenticatedUserStorageService:listDelegations'],
      }),
    ]);
    const [
      flagState,
      vmUsdBalance,
      musdBalance,
      intents,
      delegations,
      home,
    ] = await Promise.all([
      messenger.call('RemoteFeatureFlagController:getState'),
      messenger.call('MoneyAccountBalanceService:getVmusdBalance', source),
      messenger.call('MoneyAccountBalanceService:getMusdBalance', source),
      messenger.call('ChompApiService:getIntentsByAddress', source),
      messenger.call('AuthenticatedUserStorageService:listDelegations'),
      Engine.context.CardController.getCardHomeData(source),
    ]);

    const vaultConfig = getMoneyAccountVaultConfig(
      flagState.remoteFeatureFlags,
    );
    const vedaConfig = getVedaTokenConfig(home.delegationSettings);
    const fundingTokens = home.fundingAssets.map((asset) =>
      toCardFundingToken(asset),
    );
    const cardLinked = isMoneyAccountDelegatedForCard({
      fundingTokens,
      moneyAccountAddress: source,
      vedaConfig,
    });
    if (cardLinked) {
      const linked = fundingTokens.find(
        (token) => token.walletAddress?.toLowerCase() === source.toLowerCase(),
      );
      this.#cardDelegationAmountHuman =
        linked?.originalSpendingCap ?? linked?.spendingCap ?? '0';
    }

    const sourceLower = source.toLowerCase();
    const chainId = (vaultConfig?.chainId as Hex | undefined) ?? DEFAULT_CHAIN_ID;
    const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId] ?? MUSD_TOKEN_ADDRESS;
    const networkClientId = await messenger.call(
      'NetworkController:findNetworkClientIdByChainId',
      chainId,
    );
    const { provider } = await messenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );
    const ethersProvider = new Web3Provider(provider);
    const musd = new Contract(musdAddress, abiERC20, ethersProvider);
    const cardSpender = vedaConfig?.delegationContract;
    const [nativeBalance, vaultAllowanceRaw, cardAllowanceRaw] =
      await Promise.all([
        ethersProvider.getBalance(source, 'pending'),
        vaultConfig?.boringVault
          ? musd.allowance(source, vaultConfig.boringVault, PENDING_READ)
          : 0n,
        cardSpender ? musd.allowance(source, cardSpender, PENDING_READ) : 0n,
      ]);

    return {
      source,
      destination,
      chainId,
      vmUsd: BigInt(vmUsdBalance.balance),
      musd: BigInt(musdBalance.balance),
      nativeWei: BigInt(nativeBalance.toString()),
      vaultAllowance: BigInt(vaultAllowanceRaw.toString()),
      cardAllowance: BigInt(cardAllowanceRaw.toString()),
      chompIntentHashes: intents
        .filter((intent) => intent.status === 'active')
        .map((intent) => intent.delegationHash),
      chompDelegationHashes: delegations
        .filter(
          (entry) =>
            entry.signedDelegation.delegator.toLowerCase() === sourceLower,
        )
        .map((entry) => entry.metadata.delegationHash),
      cardLinked,
    };
  }

  async collectBlockers(
    _inventory: MigrationInventory,
  ): Promise<MigrationBlocker[]> {
    const { moneyAccountCardLinkInProgress } =
      await Engine.controllerMessenger.call('CardController:getState');
    if (moneyAccountCardLinkInProgress) {
      return [{ kind: 'in-flight-card-spend' }];
    }
    return [];
  }

  async assertBatchFromSelf(_inventory: MigrationInventory): Promise<boolean> {
    return false;
  }

  async teardown(inventory: MigrationInventory): Promise<void> {
    await this.revokeChompIntents(inventory.chompIntentHashes);
    await this.revokeStorageDelegations(inventory.chompDelegationHashes);
    if (inventory.cardLinked) {
      await this.unlinkCard(inventory.source);
    }
  }

  async revokeChompIntents(_hashes: Hex[]): Promise<void> {
    // ponytail: ChompApiService.revokeIntents is not published yet
  }

  async revokeStorageDelegations(hashes: Hex[]): Promise<void> {
    await Promise.all(
      hashes.map((hash) =>
        Engine.controllerMessenger.call(
          'AuthenticatedUserStorageService:revokeDelegation',
          hash,
        ),
      ),
    );
  }

  async unlinkCard(address: Hex): Promise<void> {
    await Engine.context.CardController.linkMoneyAccountCard({
      moneyAccountAddress: address,
      delegationAmountHuman: '0',
    });
  }

  async executeExitBatch(inventory: MigrationInventory): Promise<void> {
    const exitBatchId = await this.submitExitBatch(inventory);
    if (!exitBatchId) {
      throw new Error('exit-batch-not-submitted');
    }
    await this.awaitExitBatch(exitBatchId);
  }

  async submitExitBatch(_inventory: MigrationInventory): Promise<Hex | null> {
    // addTransactionBatch({ atomic: true, disableSequential: true })
    return null;
  }

  async awaitExitBatch(_batchId: Hex): Promise<void> {
    // Await existing batch.
  }

  async persistResidualDelegation(
    _source: Hex,
    _destination: Hex,
  ): Promise<void> {
    // Sign once: delegator=old, delegate=new, empty caveats.
  }

  async reprovision(
    destination: Hex,
    inventory: MigrationInventory,
  ): Promise<void> {
    await this.upgradeDestination(destination);
    if (inventory.cardLinked) {
      await this.relinkCard(destination);
    }
    await this.setActiveMoneyAccountId(destination);
  }

  async upgradeDestination(destination: Hex): Promise<void> {
    await whenMoneyAccountUpgradeReady();
    await Engine.controllerMessenger.call(
      'MoneyAccountUpgradeController:upgradeAccount',
      destination,
    );
  }

  async relinkCard(destination: Hex): Promise<void> {
    await Engine.context.CardController.linkMoneyAccountCard({
      moneyAccountAddress: destination,
      delegationAmountHuman: this.#cardDelegationAmountHuman,
    });
  }

  async setActiveMoneyAccountId(_destination: Hex): Promise<void> {
    // not in mobile yet: persist pointer vs primary-HD selector
  }

  async verifyOldInert(_inventory: MigrationInventory): Promise<void> {
    // vmUSD/mUSD/allowances 0, 7702 kept, no active CHOMP intents, Card unlinked.
  }
}
