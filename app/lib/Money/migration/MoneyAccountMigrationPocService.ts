import { bytesToHex, remove0x, type Hex } from '@metamask/utils';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import {
  AccountImportStrategy,
} from '@metamask/keyring-controller';
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
  createDelegation,
  getDeleGatorEnvironment,
  ROOT_AUTHORITY,
  getDelegationHashOffchain,
  type Delegation,
} from '../../../core/Delegation';
import { whenMoneyAccountUpgradeReady } from '../../../core/Engine/controllers/money-account-upgrade-controller-init';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
} from '../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { toCardFundingToken } from '../../../components/UI/Card/util/toCardTokenAllowance';
import { getVedaTokenConfig } from '../../../components/UI/Card/util/vedaToken';
import { applySlippage } from '../../../components/UI/Money/utils/moneyAccountTransactions';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../components/UI/Money/queryKeys';
import { isMoneyAccountDelegatedForCard } from '../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { getMoneyAccountVaultConfig } from '../../../selectors/featureFlagController/moneyAccount';
import {
  buildMigrationExecutionContexts,
  buildMigrationRedemption,
  deriveAddressFromPrivateKey,
  getMusdAmountForShares,
  type MigrationExecutionContexts,
} from './MoneyAccountMigrationDelegatedBatch';
import type {
  MigrationBlocker,
  MigrationInventory,
  MoneyAccountMigrationPocParams,
} from './types';

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
const MIGRATION_ORIGIN = 'metamask:money-account-migration';
const INNER_TX_RETRIES = 5;
const INNER_TX_RETRY_MS = 50;
const FAILED_TX_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.failed,
  TransactionStatus.dropped,
  TransactionStatus.rejected,
]);

export type MigrationPhasePrompt = (phase: string) => Promise<void>;

interface MigrationKeyParams
  extends Pick<MoneyAccountMigrationPocParams, 'bPrivateKey' | 'cPrivateKey'> {}

interface MigrationSubmission {
  transactionMeta: TransactionMeta;
  sourceDelegation: Delegation;
}

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
    bPrivateKey,
    cPrivateKey,
    onBeforePhase,
  }: {
    source: Hex;
    destination?: Hex;
    bPrivateKey: string;
    cPrivateKey: string;
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
    const sourceDelegation = await runMigrationPhase(
      'execute-exit-batch',
      () =>
        this.executeExitBatch(inventory, {
          bPrivateKey,
          cPrivateKey,
        }),
      onBeforePhase,
    );
    await runMigrationPhase(
      'persist-residual-delegation',
      () =>
        this.persistResidualDelegation(
          inventory.source,
          inventory.destination,
          inventory.chainId,
          sourceDelegation,
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

  async executeExitBatch(
    inventory: MigrationInventory,
    keys: MigrationKeyParams,
  ): Promise<Delegation> {
    return this.withTemporarySubmitter(keys.cPrivateKey, async () => {
      const submission = await this.submitExitBatch(inventory, keys);
      if (!submission) {
        throw new Error('exit-batch-not-submitted');
      }
      await this.awaitExitBatch(submission.transactionMeta);
      return submission.sourceDelegation;
    });
  }

  async submitExitBatch(
    inventory: MigrationInventory,
    { bPrivateKey, cPrivateKey }: MigrationKeyParams,
  ): Promise<MigrationSubmission | null> {
    const messenger = Engine.controllerMessenger;
    const flagState = await messenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const vmUsdShares = BigInt(inventory.vmUsd);
    if (vmUsdShares === 0n) {
      return null;
    }
    const vaultConfig = getMoneyAccountVaultConfig(
      flagState.remoteFeatureFlags,
    );
    if (!vaultConfig) {
      throw new Error('missing-vault-config');
    }

    const networkClientId = await messenger.call(
      'NetworkController:findNetworkClientIdByChainId',
      inventory.chainId,
    );
    const { provider } = await messenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );
    const ethersProvider = new Web3Provider(provider);
    const musdAddress =
      MUSD_TOKEN_ADDRESS_BY_CHAIN[inventory.chainId] ?? MUSD_TOKEN_ADDRESS;
    const accountant = new Contract(
      vaultConfig.accountantAddress,
      ['function getRate() view returns (uint256 rate)'],
      ethersProvider,
    );
    const exchangeRate = BigInt((await accountant.getRate()).toString());
    const musdAmount = getMusdAmountForShares(vmUsdShares, exchangeRate);
    if (musdAmount === 0n) {
      throw new Error('vmusd-balance-too-small');
    }

    const lens = new Contract(
      vaultConfig.lensAddress,
      [
        'function previewDeposit(address depositAsset, uint256 depositAmount, address boringVault, address accountant) view returns (uint256 shares)',
      ],
      ethersProvider,
    );
    const expectedMint = BigInt(
      (
        await lens.previewDeposit(
          musdAddress,
          musdAmount.toString(),
          vaultConfig.boringVault,
          vaultConfig.accountantAddress,
        )
      ).toString(),
    );
    const contexts: MigrationExecutionContexts =
      buildMigrationExecutionContexts({
        source: inventory.source,
        destination: inventory.destination,
        musdAddress,
        boringVault: vaultConfig.boringVault as Hex,
        tellerAddress: vaultConfig.tellerAddress as Hex,
        vmUsdShares,
        musdAmount,
        minimumMint: applySlippage(expectedMint),
      });
    const sourceDelegation = await this.createSourceDelegation(
      inventory.source,
      inventory.destination,
      inventory.chainId,
    );
    const environment = getDeleGatorEnvironment(
      parseInt(inventory.chainId, 16),
    );
    const submitter = deriveAddressFromPrivateKey(cPrivateKey);
    const redemption = await buildMigrationRedemption({
      chainId: inventory.chainId,
      environment,
      sourceDelegation,
      source: inventory.source,
      destination: inventory.destination,
      submitter,
      bPrivateKey,
      contexts,
    });

    const transactionMeta =
      await Engine.context.TransactionController.addTransaction(
        {
          from: submitter,
          to: environment.DelegationManager,
          data: redemption.transactionData,
          value: '0x0',
        },
        {
          networkClientId,
          origin: MIGRATION_ORIGIN,
          requireApproval: false,
          isInternal: true,
          type: TransactionType.contractInteraction,
        },
      );

    return { transactionMeta: transactionMeta.transactionMeta, sourceDelegation };
  }

  async awaitExitBatch(transaction: TransactionMeta | Hex): Promise<void> {
    const innerTx =
      typeof transaction === 'string'
        ? await findInnerTxForBatch(transaction)
        : transaction;
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

  async createSourceDelegation(
    source: Hex,
    destination: Hex,
    chainId: Hex,
  ): Promise<Delegation> {
    const unsigned = createDelegation({
      from: source,
      to: destination,
      caveats: [],
    });
    const signature = (await Engine.controllerMessenger.call(
      'DelegationController:signDelegation',
      { delegation: unsigned, chainId },
    )) as Hex;
    return { ...unsigned, signature };
  }

  async withTemporarySubmitter<T>(
    privateKey: string,
    operation: (address: Hex) => Promise<T>,
  ): Promise<T> {
    const address = deriveAddressFromPrivateKey(privateKey);
    const { KeyringController } = Engine.context;
    const accounts = (await KeyringController.getAccounts()) ?? [];
    const wasAlreadyImported = accounts.some(
      (account) => account.toLowerCase() === address.toLowerCase(),
    );
    if (!wasAlreadyImported) {
      await KeyringController.importAccountWithStrategy(
        AccountImportStrategy.privateKey,
        [remove0x(privateKey)],
      );
    }
    let result: T | undefined;
    let operationError: unknown;
    try {
      result = await operation(address);
    } catch (error) {
      operationError = error;
    }

    if (!wasAlreadyImported) {
      try {
        await KeyringController.removeAccount(address);
      } catch {
        if (operationError === undefined) {
          throw new Error('temporary-submitter-cleanup-failed');
        }
      }
    }

    if (operationError !== undefined) {
      throw operationError;
    }
    return result as T;
  }

  async persistResidualDelegation(
    source: Hex,
    destination: Hex,
    chainId: Hex,
    existingDelegation?: Delegation,
  ): Promise<void> {
    const messenger = Engine.controllerMessenger;
    const signedDelegation =
      existingDelegation ??
      (await (async () => {
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
        return { ...unsigned, signature };
      })());
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
