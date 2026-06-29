import type { EntropySourceId } from '@metamask/keyring-api';
import {
  KeyringControllerGetStateAction,
  KeyringTypes,
  type KeyringControllerState,
} from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import { KeyringType } from '@metamask/keyring-api/v2';

import { importNewSecretRecoveryPhrase } from '../../../actions/multiSrp';
import { Authentication } from '../..';
import type {
  QrSyncControllerCompleteSecretImportAction,
  QrSyncControllerGetStateAction,
  QrSyncControllerMarkProvisioningFailedAction,
  QrSyncControllerState,
} from '../controller-types';
import { QrSyncSecretTypes } from '../constants';
import type {
  QrSyncProvisioningEntry,
  QrSyncProvisioningMetadata,
  QrSyncProvisioningMnemonicEntry,
  QrSyncProvisioningPrivateKeyEntry,
  QrSyncSecretImportEntry,
} from '../types';
import { toFormattedAddress } from '../../../util/address';

const SERVICE_NAME = 'QrSyncProvisioningService' as const;

export interface QrSyncProvisioningServiceImportRemainingSecretsAction {
  type: `${typeof SERVICE_NAME}:importRemainingSecrets`;
  handler: QrSyncProvisioningService['importRemainingSecrets'];
}

export type QrSyncProvisioningServiceActions =
  QrSyncProvisioningServiceImportRemainingSecretsAction;

type QrSyncProvisioningServiceAllowedActions =
  | QrSyncProvisioningServiceActions
  | QrSyncControllerGetStateAction
  | QrSyncControllerCompleteSecretImportAction
  | QrSyncControllerMarkProvisioningFailedAction
  | KeyringControllerGetStateAction;

export type QrSyncProvisioningServiceMessenger = Messenger<
  typeof SERVICE_NAME,
  QrSyncProvisioningServiceAllowedActions,
  never
>;

function assertProvisioningPreconditions(
  provisioningStatus: string | null,
  pendingSecretImports: QrSyncSecretImportEntry[] | null,
  provisioningMetadata: QrSyncProvisioningMetadata | null,
): asserts provisioningMetadata is QrSyncProvisioningMetadata {
  if (provisioningStatus !== 'awaiting_password') {
    throw new Error(
      'QR sync provisioning requires provisioningStatus awaiting_password',
    );
  }

  if (!pendingSecretImports || pendingSecretImports.length === 0) {
    throw new Error('QR sync provisioning requires pending secret imports');
  }

  if (!provisioningMetadata) {
    throw new Error('QR sync provisioning requires provisioning metadata');
  }
}

function getValidatedPendingSecrets(
  pendingSecretImports: QrSyncSecretImportEntry[] | null,
): QrSyncSecretImportEntry[] {
  if (!pendingSecretImports || pendingSecretImports.length === 0) {
    throw new Error('QR sync provisioning requires pending secret imports');
  }

  return pendingSecretImports;
}

function cloneProvisioningMetadata(
  metadata: QrSyncProvisioningMetadata,
): QrSyncProvisioningMetadata {
  return {
    version: metadata.version,
    entries: metadata.entries.map((entry) => ({ ...entry })),
  };
}

function setMnemonicEntropySource(
  entries: QrSyncProvisioningEntry[],
  index: number,
  entropySource: EntropySourceId,
): QrSyncProvisioningEntry[] {
  return entries.map((entry) => {
    if (entry.index !== index || entry.type !== QrSyncSecretTypes.MNEMONIC) {
      return entry;
    }

    return {
      ...entry,
      entropySource,
    } satisfies QrSyncProvisioningMnemonicEntry;
  });
}

function setPrivateKeyAccountAddress(
  entries: QrSyncProvisioningEntry[],
  index: number,
  accountAddress: string,
): QrSyncProvisioningEntry[] {
  return entries.map((entry) => {
    if (entry.index !== index || entry.type !== QrSyncSecretTypes.PRIVATE_KEY) {
      return entry;
    }

    return {
      ...entry,
      accountAddress,
    } satisfies QrSyncProvisioningPrivateKeyEntry;
  });
}

/**
 * Service that imports QR sync secrets after primary mnemonic restore and
 * enriches persisted provisioning metadata via controller messengers.
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
      `${SERVICE_NAME}:importRemainingSecrets`,
      this.importRemainingSecrets.bind(this),
    );
  }

  /**
   * Imports QR sync secrets that remain after primary mnemonic restore, enriches
   * persisted provisioning metadata with runtime IDs, and clears ephemeral secrets.
   */
  async importRemainingSecrets(): Promise<void> {
    const { pendingSecretImports, provisioningMetadata, provisioningStatus } =
      this.#getQrSyncControllerState();

    assertProvisioningPreconditions(
      provisioningStatus,
      pendingSecretImports,
      provisioningMetadata,
    );

    let enrichedMetadata = cloneProvisioningMetadata(provisioningMetadata);
    const sortedSecrets = [
      ...getValidatedPendingSecrets(pendingSecretImports),
    ].sort((left, right) => left.index - right.index);

    try {
      for (const secretEntry of sortedSecrets) {
        if (
          secretEntry.type === QrSyncSecretTypes.MNEMONIC &&
          secretEntry.isPrimary
        ) {
          enrichedMetadata = {
            ...enrichedMetadata,
            entries: setMnemonicEntropySource(
              enrichedMetadata.entries,
              secretEntry.index,
              this.#getPrimaryEntropySourceId(),
            ),
          };
          continue;
        }

        if (secretEntry.type === QrSyncSecretTypes.MNEMONIC) {
          const { address } = await importNewSecretRecoveryPhrase(
            secretEntry.value,
            { shouldSelectAccount: false, skipDiscovery: true },
          );
          enrichedMetadata = {
            ...enrichedMetadata,
            entries: setMnemonicEntropySource(
              enrichedMetadata.entries,
              secretEntry.index,
              this.#getEntropySourceForAccountAddress(address),
            ),
          };
          continue;
        }

        const accountsBeforeImport = this.#getKeyringAccountAddresses();
        const importSucceeded =
          await Authentication.importAccountFromPrivateKey(secretEntry.value, {
            shouldSelectAccount: false,
            shouldCreateSocialBackup: false,
          });

        if (!importSucceeded) {
          throw new Error(
            'Private key import failed during QR sync provisioning',
          );
        }

        const accountAddress =
          this.#findNewAccountAddress(accountsBeforeImport);
        enrichedMetadata = {
          ...enrichedMetadata,
          entries: setPrivateKeyAccountAddress(
            enrichedMetadata.entries,
            secretEntry.index,
            accountAddress,
          ),
        };
      }

      this.#messenger.call(
        'QrSyncController:completeSecretImport',
        enrichedMetadata,
      );
    } catch (error) {
      this.#messenger.call('QrSyncController:markProvisioningFailed');
      throw error;
    }
  }

  #getQrSyncControllerState(): QrSyncControllerState {
    return this.#messenger.call('QrSyncController:getState');
  }

  #getKeyringControllerState(): KeyringControllerState {
    return this.#messenger.call('KeyringController:getState');
  }

  #getPrimaryEntropySourceId(): EntropySourceId {
    const { keyrings } = this.#getKeyringControllerState();
    const primaryHdKeyring = keyrings.find(
      (keyring) =>
        keyring.type === KeyringTypes.hd || keyring.type === KeyringType.Hd,
    );

    if (!primaryHdKeyring) {
      throw new Error('Primary HD keyring not found after wallet restore');
    }

    return primaryHdKeyring.metadata.id;
  }

  #getEntropySourceForAccountAddress(address: string): EntropySourceId {
    const keyring = this.#getKeyringByAddress(address);

    if (!keyring?.metadata?.id) {
      throw new Error(
        `Unable to resolve entropy source for account address ${address}`,
      );
    }

    return keyring.metadata.id;
  }

  #getKeyringByAddress(
    address: string,
  ): KeyringControllerState['keyrings'][number] | undefined {
    const formattedAddress = toFormattedAddress(address);
    const { keyrings } = this.#getKeyringControllerState();

    return keyrings.find((keyring) =>
      keyring.accounts
        .map((account) => toFormattedAddress(account))
        .includes(formattedAddress),
    );
  }

  #getKeyringAccountAddresses(): Set<string> {
    const { keyrings } = this.#getKeyringControllerState();

    return new Set(
      keyrings.flatMap((keyring) =>
        keyring.accounts.map((account) => toFormattedAddress(account)),
      ),
    );
  }

  #findNewAccountAddress(before: Set<string>): string {
    const after = this.#getKeyringAccountAddresses();

    for (const address of after) {
      if (!before.has(address)) {
        return address;
      }
    }

    throw new Error(
      'Unable to resolve account address after private key import',
    );
  }
}
