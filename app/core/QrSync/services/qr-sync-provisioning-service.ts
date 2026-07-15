import type {
  AccountId,
  AccountsControllerGetAccountByAddressAction,
} from '@metamask/accounts-controller';
import {
  AccountGroupType,
  AccountWalletType,
  MultichainAccountWalletId,
  toMultichainAccountGroupId,
  type AccountGroupId,
} from '@metamask/account-api';
import type { EntropySourceId } from '@metamask/keyring-api';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import {
  AccountImportStrategy,
  type KeyringControllerImportAccountWithStrategyAction,
  type KeyringControllerWithKeyringV2Action,
} from '@metamask/keyring-controller';
import { remove0x } from '@metamask/utils';
import type { Messenger } from '@metamask/messenger';
import type {
  AccountTreeControllerGetAccountWalletObjectsAction,
  AccountTreeControllerSetAccountGroupHiddenAction,
  AccountTreeControllerSetAccountGroupNameAction,
  AccountTreeControllerSetAccountGroupPinnedAction,
  AccountTreeControllerSetAccountWalletNameAction,
  AccountTreeControllerSyncWithUserStorageAction,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import type {
  MultichainAccountServiceAlignWalletAction,
  MultichainAccountServiceCreateMultichainAccountGroupAction,
  MultichainAccountServiceCreateMultichainAccountGroupsAction,
  MultichainAccountServiceCreateMultichainAccountWalletAction,
} from '@metamask/multichain-account-service';

import type {
  QrSyncControllerCompleteProvisioningAction,
  QrSyncControllerEnrichProvisioningEntryAction,
  QrSyncControllerGetStateAction,
  QrSyncControllerMarkProvisioningFailedAction,
} from '../controller-types';
import { QrSyncProvisioningStatuses, QrSyncSecretTypes } from '../constants';
import type {
  QrSyncAccountGroup,
  QrSyncProvisioningMetadata,
  QrSyncProvisioningMnemonicEntry,
  QrSyncProvisioningPrivateKeyEntry,
  QrSyncSecretImportEntry,
} from '../types';
import { toFormattedAddress } from '../../../util/address';
import { reportQrSyncFailure } from '../qrSyncTelemetry';

const SERVICE_NAME = 'QrSyncProvisioningService' as const;

export interface QrSyncProvisioningServiceImportSecretsToVaultAction {
  type: `${typeof SERVICE_NAME}:importSecretsToVault`;
  handler: QrSyncProvisioningService['importSecretsToVault'];
}

export interface QrSyncProvisioningServiceProvisionFromMetadataAction {
  type: `${typeof SERVICE_NAME}:provisionFromMetadata`;
  handler: QrSyncProvisioningService['provisionFromMetadata'];
}

export type QrSyncProvisioningServiceActions =
  | QrSyncProvisioningServiceImportSecretsToVaultAction
  | QrSyncProvisioningServiceProvisionFromMetadataAction;

type QrSyncProvisioningServiceAllowedActions =
  | QrSyncProvisioningServiceActions
  | QrSyncControllerGetStateAction
  | QrSyncControllerEnrichProvisioningEntryAction
  | QrSyncControllerMarkProvisioningFailedAction
  | QrSyncControllerCompleteProvisioningAction
  | MultichainAccountServiceCreateMultichainAccountGroupAction
  | MultichainAccountServiceCreateMultichainAccountGroupsAction
  | MultichainAccountServiceCreateMultichainAccountWalletAction
  | MultichainAccountServiceAlignWalletAction
  | KeyringControllerWithKeyringV2Action
  | KeyringControllerImportAccountWithStrategyAction
  | AccountTreeControllerGetAccountWalletObjectsAction
  | AccountTreeControllerSetAccountWalletNameAction
  | AccountTreeControllerSetAccountGroupNameAction
  | AccountTreeControllerSetAccountGroupPinnedAction
  | AccountTreeControllerSetAccountGroupHiddenAction
  | AccountTreeControllerSyncWithUserStorageAction
  | AccountsControllerGetAccountByAddressAction;

export type QrSyncProvisioningServiceMessenger = Messenger<
  typeof SERVICE_NAME,
  QrSyncProvisioningServiceAllowedActions,
  never
>;

/**
 * Applies extension provisioning metadata to the account tree after secrets
 * are imported into the vault (Phase C).
 */
export class QrSyncProvisioningService {
  readonly name: typeof SERVICE_NAME = SERVICE_NAME;

  readonly #messenger: QrSyncProvisioningServiceMessenger;

  constructor({
    messenger,
  }: {
    messenger: QrSyncProvisioningServiceMessenger;
  }) {
    this.#messenger = messenger;
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:importSecretsToVault`,
      this.importSecretsToVault.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:provisionFromMetadata`,
      this.provisionFromMetadata.bind(this),
    );
  }

  /**
   * Imports secrets into the vault (Phase B). Called by QrSyncController after
   * state validation; enriches metadata via the controller messenger.
   */
  async importSecretsToVault(
    secrets: QrSyncSecretImportEntry[],
  ): Promise<void> {
    for (const secret of secrets) {
      try {
        if (secret.type === QrSyncSecretTypes.MNEMONIC) {
          const entropySource = await this.#importMnemonicToVault(secret.value);
          this.#messenger.call(
            'QrSyncController:enrichProvisioningEntry',
            secret.index,
            { entropySource },
          );
        } else if (secret.type === QrSyncSecretTypes.PRIVATE_KEY) {
          const accountAddress = await this.#importPrivateKeyToVault(
            secret.value,
          );

          if (accountAddress) {
            this.#messenger.call(
              'QrSyncController:enrichProvisioningEntry',
              secret.index,
              { accountAddress },
            );
          }
        } else {
          reportQrSyncFailure(
            new Error('QrSyncProvisioningService: Unknown secret type'),
            {
              surface: 'import',
              operation: 'import_secrets_unknown_type',
              source: 'QrSyncProvisioningService.importSecretsToVault',
              extras: { secretType: String(secret.type) },
            },
          );
        }
      } catch (error) {
        reportQrSyncFailure(error, {
          surface: 'import',
          operation: 'import_secrets_to_vault',
          source: 'QrSyncProvisioningService.importSecretsToVault',
        });
      }
    }
  }

  async #importMnemonicToVault(seed: string): Promise<EntropySourceId> {
    const mnemonic = mnemonicPhraseToBytes(seed);

    const wallet = await this.#messenger.call(
      'MultichainAccountService:createMultichainAccountWallet',
      {
        type: 'import',
        mnemonic,
      },
    );
    const entropySource = wallet.entropySource;

    await this.#messenger.call(
      'KeyringController:withKeyringV2',
      { id: entropySource },
      async ({ keyring }) => keyring.getAccounts(),
    );

    return entropySource;
  }

  async #importPrivateKeyToVault(privateKey: string): Promise<string> {
    const importedAccountAddress = await this.#messenger.call(
      'KeyringController:importAccountWithStrategy',
      AccountImportStrategy.privateKey,
      [remove0x(privateKey)],
    );

    return toFormattedAddress(importedAccountAddress);
  }

  /**
   * Creates explicit account groups and applies extension metadata after secrets
   * are imported into the vault.
   */
  async provisionFromMetadata(): Promise<void> {
    const { provisioningMetadata, provisioningStatus } =
      this.#getQrSyncControllerState();

    this.#assertMetadataProvisioningPreconditions(
      provisioningStatus,
      provisioningMetadata,
    );

    try {
      const sortedEntries = [...provisioningMetadata.entries].sort(
        (left, right) => left.index - right.index,
      );
      for (const entry of sortedEntries) {
        if (entry.type === QrSyncSecretTypes.MNEMONIC) {
          await this.#provisionMnemonicEntry(entry);
        } else {
          this.#provisionPrivateKeyEntry(entry);
        }
      }

      await this.#reconcileWithUserStorage();

      this.#messenger.call('QrSyncController:completeProvisioning');
    } catch (error) {
      this.#messenger.call('QrSyncController:markProvisioningFailed');
      throw error;
    }
  }

  #assertMetadataProvisioningPreconditions(
    provisioningStatus: string | null,
    provisioningMetadata: QrSyncProvisioningMetadata | null,
  ): asserts provisioningMetadata is QrSyncProvisioningMetadata {
    if (provisioningStatus !== QrSyncProvisioningStatuses.SECRETS_IMPORTED) {
      throw new Error(
        `QR sync metadata provisioning requires provisioningStatus ${QrSyncProvisioningStatuses.SECRETS_IMPORTED}`,
      );
    }

    if (!provisioningMetadata) {
      throw new Error(
        'QR sync metadata provisioning requires provisioning metadata',
      );
    }
  }

  async #provisionMnemonicEntry(
    entry: QrSyncProvisioningMnemonicEntry,
  ): Promise<void> {
    const entropySource = this.#getRequiredEntropySource(entry);
    await this.#createMnemonicGroups(entropySource, entry.groups ?? []);
    await this.#messenger.call(
      'MultichainAccountService:alignWallet',
      entropySource,
    );

    const wallets = this.#getAccountWalletObjects();
    const wallet = wallets.find(
      (candidate) =>
        candidate.type === AccountWalletType.Entropy &&
        candidate.metadata.entropy?.id === entropySource,
    );

    if (!wallet) {
      throw new Error(
        `Unable to resolve account tree wallet for entropy source ${entropySource}`,
      );
    }

    if (entry.name) {
      this.#messenger.call(
        'AccountTreeController:setAccountWalletName',
        wallet.id,
        entry.name,
      );
    }

    for (const group of entry.groups ?? []) {
      const groupId = toMultichainAccountGroupId(
        wallet.id as MultichainAccountWalletId,
        group.groupIndex,
      );

      if (!wallet.groups[groupId]) {
        throw new Error(
          `Unable to resolve account group ${group.groupIndex} for entropy source ${entropySource}`,
        );
      }

      this.#applyGroupMetadata(groupId, group);
    }
  }

  #provisionPrivateKeyEntry(entry: QrSyncProvisioningPrivateKeyEntry): void {
    const accountAddress = this.#getRequiredAccountAddress(entry);
    const account = this.#messenger.call(
      'AccountsController:getAccountByAddress',
      toFormattedAddress(accountAddress),
    );

    if (!account) {
      throw new Error(
        `Unable to resolve account for address ${accountAddress}`,
      );
    }

    const wallets = this.#getAccountWalletObjects();
    const groupId = this.#findSingleAccountGroupIdByAccountId(
      wallets,
      account.id,
    );

    if (!groupId) {
      throw new Error(
        `Unable to resolve account tree group for address ${accountAddress}`,
      );
    }

    this.#applyGroupMetadata(groupId, entry);
  }

  async #createMnemonicGroups(
    entropySource: EntropySourceId,
    groups: QrSyncAccountGroup[],
  ): Promise<void> {
    if (groups.length === 0) {
      return;
    }

    // Extension exports the full root wallet with contiguous group indices 0..N.
    // Group 0 already exists after restore/import; create 1..maxGroupIndex.
    const maxGroupIndex = Math.max(...groups.map((group) => group.groupIndex));

    if (maxGroupIndex < 1) {
      return;
    }

    if (maxGroupIndex === 1) {
      await this.#messenger.call(
        'MultichainAccountService:createMultichainAccountGroup',
        {
          entropySource,
          groupIndex: 1,
        },
      );
      return;
    }

    await this.#messenger.call(
      'MultichainAccountService:createMultichainAccountGroups',
      {
        entropySource,
        fromGroupIndex: 1,
        toGroupIndex: maxGroupIndex,
      },
    );
  }

  #applyGroupMetadata(
    groupId: AccountGroupId,
    metadata: Pick<QrSyncAccountGroup, 'name' | 'pinned' | 'hidden'>,
  ): void {
    this.#messenger.call(
      'AccountTreeController:setAccountGroupName',
      groupId,
      metadata.name,
    );

    if (metadata.pinned) {
      this.#messenger.call(
        'AccountTreeController:setAccountGroupPinned',
        groupId,
        metadata.pinned,
      );
    }

    if (metadata.hidden) {
      this.#messenger.call(
        'AccountTreeController:setAccountGroupHidden',
        groupId,
        metadata.hidden,
      );
    }
  }

  #findSingleAccountGroupIdByAccountId(
    wallets: AccountWalletObject[],
    accountId: AccountId,
  ): AccountGroupId | undefined {
    for (const wallet of wallets) {
      for (const group of Object.values(wallet.groups)) {
        if (
          group.type === AccountGroupType.SingleAccount &&
          group.accounts.includes(accountId)
        ) {
          return group.id;
        }
      }
    }

    return undefined;
  }

  #getRequiredEntropySource(
    entry: QrSyncProvisioningMnemonicEntry,
  ): EntropySourceId {
    if (!entry.entropySource) {
      throw new Error(
        `QR sync metadata provisioning requires entropySource for entry ${entry.index}`,
      );
    }

    return entry.entropySource;
  }

  #getRequiredAccountAddress(entry: QrSyncProvisioningPrivateKeyEntry): string {
    if (!entry.accountAddress) {
      throw new Error(
        `QR sync metadata provisioning requires accountAddress for entry ${entry.index}`,
      );
    }

    return entry.accountAddress;
  }

  async #reconcileWithUserStorage(): Promise<void> {
    try {
      await this.#messenger.call('AccountTreeController:syncWithUserStorage');
    } catch (error) {
      reportQrSyncFailure(error, {
        surface: 'import',
        operation: 'user_storage_reconciliation',
        source: 'QrSyncProvisioningService.reconcileWithUserStorage',
      });
    }
  }

  #getAccountWalletObjects(): AccountWalletObject[] {
    return this.#messenger.call(
      'AccountTreeController:getAccountWalletObjects',
    );
  }

  #getQrSyncControllerState() {
    return this.#messenger.call('QrSyncController:getState');
  }
}
