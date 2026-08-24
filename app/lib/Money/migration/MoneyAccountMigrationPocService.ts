import { bytesToHex, type Hex } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { toHex } from '@metamask/controller-utils';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import type { MoneyAccount } from '@metamask/money-account-controller';
import {
  MUSD_TOKEN_ADDRESS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '@metamask/money-account-utils';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../../../core/Engine';
import {
  ROOT_AUTHORITY,
  getDelegationHashOffchain,
} from '../../../core/Delegation';
import { whenMoneyAccountUpgradeReady } from '../../../core/Engine/controllers/money-account-upgrade-controller-init';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
} from '../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { toCardFundingToken } from '../../../components/UI/Card/util/toCardTokenAllowance';
import { getVedaTokenConfig } from '../../../components/UI/Card/util/vedaToken';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../components/UI/Money/queryKeys';
import { isMoneyAccountDelegatedForCard } from '../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { FEATURE_FLAG_NAME as GAS_FEES_SPONSORED_FLAG } from '../../../selectors/featureFlagController/gasFeesSponsored';
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

// Money account is avaiable on monad only
const DEFAULT_CHAIN_ID = '0x8f' as Hex;
const PENDING_READ = { blockTag: 'pending' } as const;
const ERC20 = new Interface(abiERC20);
const ZERO_VALUE = '0x0' as Hex;
const MIGRATION_ORIGIN = 'metamask:money-account-migration';
const INNER_TX_RETRIES = 5;
const INNER_TX_RETRY_MS = 50;
const FAILED_TX_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.failed,
  TransactionStatus.dropped,
  TransactionStatus.rejected,
]);

interface ExitCall {
  to: Hex;
  data: Hex;
  value: Hex;
}

const buildExitCalls = (
  inventory: MigrationInventory,
  {
    boringVault,
    musdAddress,
    cardSpender,
    nativeSweepWei,
  }: {
    boringVault?: string;
    musdAddress: Hex;
    cardSpender?: string;
    nativeSweepWei: bigint;
  },
): ExitCall[] => {
  const calls: ExitCall[] = [];
  if (BigInt(inventory.vmUsd) > 0n) {
    if (!boringVault) {
      throw new Error('missing-vault-config');
    }
    calls.push({
      to: boringVault as Hex,
      data: ERC20.encodeFunctionData('transfer', [
        inventory.destination,
        inventory.vmUsd,
      ]) as Hex,
      value: ZERO_VALUE,
    });
  }
  if (BigInt(inventory.musd) > 0n) {
    calls.push({
      to: musdAddress,
      data: ERC20.encodeFunctionData('transfer', [
        inventory.destination,
        inventory.musd,
      ]) as Hex,
      value: ZERO_VALUE,
    });
  }
  if (BigInt(inventory.vaultAllowance) > 0n) {
    if (!boringVault) {
      throw new Error('missing-vault-config');
    }
    calls.push({
      to: musdAddress,
      data: ERC20.encodeFunctionData('approve', [boringVault, '0']) as Hex,
      value: ZERO_VALUE,
    });
  }
  if (BigInt(inventory.cardAllowance) > 0n && cardSpender) {
    calls.push({
      to: musdAddress,
      data: ERC20.encodeFunctionData('approve', [cardSpender, '0']) as Hex,
      value: ZERO_VALUE,
    });
  }
  if (nativeSweepWei > 0n) {
    calls.push({
      to: inventory.destination,
      data: '0x',
      value: toHex(nativeSweepWei),
    });
  }
  return calls;
};

export type MigrationPhasePrompt = (phase: string) => Promise<void>;

const findInnerTxForBatch = async (batchId: Hex): Promise<TransactionMeta> => {
  const messenger = Engine.controllerMessenger;
  for (let attempt = 0; attempt < INNER_TX_RETRIES; attempt++) {
    const { transactions } = (await messenger.call(
      'TransactionController:getState',
    )) as { transactions: TransactionMeta[] };
    const match = transactions.find((tx) => tx.batchId === batchId);
    if (match) {
      return match;
    }
    if (attempt < INNER_TX_RETRIES - 1) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, INNER_TX_RETRY_MS),
      );
    }
  }
  throw new Error('exit-batch-tx-not-found');
};

async function runMigrationPhase<T>(
  phase: string,
  operation: () => Promise<T>,
  onBeforePhase?: MigrationPhasePrompt,
): Promise<T> {
  await onBeforePhase?.(phase);
  return operation();
}

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
    onBeforePhase,
  }: {
    source: Hex;
    destination?: Hex;
    onBeforePhase?: MigrationPhasePrompt;
  }): Promise<void> {
    const dest = await runMigrationPhase<Hex>(
      'resolve-destination',
      async () =>
        destination ?? ((await this.createDestination()).address as Hex),
      onBeforePhase,
    );
    const inventory = await runMigrationPhase(
      'collect-inventory',
      () => this.collectInventory(source, dest),
      onBeforePhase,
    );
    const blockers = await runMigrationPhase(
      'collect-blockers',
      () => this.collectBlockers(inventory),
      onBeforePhase,
    );
    if (blockers.length > 0) {
      throw new Error(blockers[0].kind);
    }
    const batchSupported = await runMigrationPhase(
      'assert-atomic-batch-support',
      () => this.assertBatchFromSelf(inventory),
      onBeforePhase,
    );
    if (!batchSupported) {
      throw new Error('atomic-batch-unsupported');
    }

    await runMigrationPhase(
      'teardown',
      () => this.teardown(inventory),
      onBeforePhase,
    );
    await runMigrationPhase(
      'execute-exit-batch',
      () => this.executeExitBatch(inventory),
      onBeforePhase,
    );
    await runMigrationPhase(
      'persist-residual-delegation',
      () =>
        this.persistResidualDelegation(
          inventory.source,
          inventory.destination,
          inventory.chainId,
        ),
      onBeforePhase,
    );
    await runMigrationPhase(
      'reprovision',
      () => this.reprovision(inventory.destination, inventory),
      onBeforePhase,
    );
    await runMigrationPhase(
      'verify-old-inert',
      () => this.verifyOldInert(inventory),
      onBeforePhase,
    );
  }

  // Stub MoneyAccount MFA
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
    const [flagState, vmUsdBalance, musdBalance, intents, delegations, home] =
      await Promise.all([
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
    const chainId =
      (vaultConfig?.chainId as Hex | undefined) ?? DEFAULT_CHAIN_ID;
    const musdAddress =
      MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId] ?? MUSD_TOKEN_ADDRESS;
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
      vmUsd: BigInt(vmUsdBalance.balance).toString(),
      musd: BigInt(musdBalance.balance).toString(),
      nativeWei: BigInt(nativeBalance.toString()).toString(),
      vaultAllowance: BigInt(vaultAllowanceRaw.toString()).toString(),
      cardAllowance: BigInt(cardAllowanceRaw.toString()).toString(),
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
    // TODO: add validation for batch from self
    return true;
  }

  async teardown(inventory: MigrationInventory): Promise<void> {
    // keep chomp connection alive
    // can a profile have 2 chomp associated address ( old and new account )?
    // await this.revokeChompIntents(inventory.chompIntentHashes);
    // await this.revokeStorageDelegations(inventory.chompDelegationHashes);
    if (inventory.cardLinked) {
      await this.unlinkCard(inventory.source);
    }
  }

  // async revokeChompIntents(_hashes: Hex[]): Promise<void> {
  // }

  // async revokeStorageDelegations(hashes: Hex[]): Promise<void> {
  //   await Promise.all(
  //     hashes.map((hash) =>
  //       Engine.controllerMessenger.call(
  //         'AuthenticatedUserStorageService:revokeDelegation',
  //         hash,
  //       ),
  //     ),
  //   );
  // }

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

  async submitExitBatch(inventory: MigrationInventory): Promise<Hex | null> {
    const messenger = Engine.controllerMessenger;
    const flagState = await messenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const vaultConfig = getMoneyAccountVaultConfig(
      flagState.remoteFeatureFlags,
    );
    const sponsored = Boolean(
      (
        flagState.remoteFeatureFlags?.[GAS_FEES_SPONSORED_FLAG] as
          | Record<string, boolean>
          | undefined
      )?.[inventory.chainId],
    );
    let cardSpender: string | undefined;
    if (BigInt(inventory.cardAllowance) > 0n) {
      const home = await Engine.context.CardController.getCardHomeData(
        inventory.source,
      );
      cardSpender = getVedaTokenConfig(
        home.delegationSettings,
      )?.delegationContract;
    }
    const calls = buildExitCalls(inventory, {
      boringVault: vaultConfig?.boringVault,
      musdAddress:
        MUSD_TOKEN_ADDRESS_BY_CHAIN[inventory.chainId] ?? MUSD_TOKEN_ADDRESS,
      cardSpender,
      nativeSweepWei: sponsored ? BigInt(inventory.nativeWei) : 0n,
    });
    if (calls.length === 0) {
      return null;
    }
    const networkClientId = await messenger.call(
      'NetworkController:findNetworkClientIdByChainId',
      inventory.chainId,
    );
    const { batchId } = await messenger.call(
      'TransactionController:addTransactionBatch',
      {
        from: inventory.source,
        networkClientId,
        origin: MIGRATION_ORIGIN,
        requireApproval: false,
        disableHook: false,
        disableSequential: true,
        isGasFeeSponsored: sponsored,
        atomic: true,
        transactions: calls.map((call) => ({
          params: {
            to: call.to,
            data: call.data,
            value: call.value,
          },
          type: TransactionType.contractInteraction,
        })),
      },
    );
    return batchId ?? null;
  }

  async awaitExitBatch(batchId: Hex): Promise<void> {
    const innerTx = await findInnerTxForBatch(batchId);
    if (innerTx.status === TransactionStatus.confirmed) {
      return;
    }
    if (FAILED_TX_STATUSES.has(innerTx.status)) {
      throw new Error('exit-batch-failed');
    }
    await awaitTransactionConfirmed({
      messenger:
        Engine.controllerMessenger as unknown as AwaitTransactionConfirmedMessenger,
      submit: async () => ({
        result: Promise.resolve(innerTx.hash ?? ''),
        transactionMeta: innerTx,
      }),
    });
  }

  async persistResidualDelegation(
    source: Hex,
    destination: Hex,
    chainId: Hex,
  ): Promise<void> {
    const messenger = Engine.controllerMessenger;
    const salt = bytesToHex(
      globalThis.crypto.getRandomValues(new Uint8Array(32)),
    );
    const unsigned = {
      delegate: destination,
      delegator: source,
      authority: ROOT_AUTHORITY as Hex,
      caveats: [],
      salt,
    };
    const signature = (await messenger.call(
      'DelegationController:signDelegation',
      { delegation: unsigned, chainId },
    )) as Hex;
    const signedDelegation = { ...unsigned, signature };
    await messenger.call('AuthenticatedUserStorageService:createDelegation', {
      signedDelegation,
      metadata: {
        delegationHash: getDelegationHashOffchain(signedDelegation),
        chainIdHex: chainId,
        type: 'money-account-migration-residual',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'native',
        allowance: '0x0',
      },
    });
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

  // upgrade MoneyAccount MFA and approve CHOMP intents
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

export const MoneyAccountMigrationPoc = new MoneyAccountMigrationPocService();
