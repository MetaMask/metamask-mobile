import {
  AccountTreeSnapshot,
  type AccountTreeControllerImportStateAction,
  type AccountTreeControllerSyncWithUserStorageAction,
} from '@metamask/account-tree-controller';
import type { Messenger } from '@metamask/messenger';

import type {
  QrSyncControllerCompleteProvisioningAction,
  QrSyncControllerGetStateAction,
  QrSyncControllerMarkProvisioningFailedAction,
} from '../controller-types';
import { QrSyncProvisioningStatuses, type QrSyncSyncFlow } from '../constants';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from '../qrSyncTelemetry';

const SERVICE_NAME = 'QrSyncProvisioningService' as const;

export interface QrSyncProvisioningServiceImportFromPayloadAction {
  type: `${typeof SERVICE_NAME}:importFromPayload`;
  handler: QrSyncProvisioningService['importFromPayload'];
}

export interface QrSyncProvisioningServiceProvisionFromMetadataAction {
  type: `${typeof SERVICE_NAME}:provisionFromMetadata`;
  handler: QrSyncProvisioningService['provisionFromMetadata'];
}

export type QrSyncProvisioningServiceActions =
  | QrSyncProvisioningServiceImportFromPayloadAction
  | QrSyncProvisioningServiceProvisionFromMetadataAction;

type QrSyncProvisioningServiceAllowedActions =
  | QrSyncProvisioningServiceActions
  | QrSyncControllerGetStateAction
  | QrSyncControllerMarkProvisioningFailedAction
  | QrSyncControllerCompleteProvisioningAction
  | AccountTreeControllerImportStateAction
  | AccountTreeControllerSyncWithUserStorageAction;

export type QrSyncProvisioningServiceMessenger = Messenger<
  typeof SERVICE_NAME,
  QrSyncProvisioningServiceAllowedActions,
  never
>;

/**
 * Applies extension provisioning payload to the account tree (Phase C).
 *
 * Delegates to `AccountTreeController:importState` which handles both secret
 * import and metadata layout in a single call.
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
      `${SERVICE_NAME}:importFromPayload`,
      this.importFromPayload.bind(this),
    );
    this.#messenger.registerActionHandler(
      `${SERVICE_NAME}:provisionFromMetadata`,
      this.provisionFromMetadata.bind(this),
    );
  }

  /**
   * Imports the pending `AccountTreePayload` into the account tree.
   *
   * Delegates to `AccountTreeController:importState`, which imports any missing
   * secrets and applies all metadata (wallet names, group names, pin/hide).
   * Existing wallets (e.g. the primary wallet already in the vault) are matched
   * by entropy source ID and have metadata applied without re-import.
   */
  async importFromPayload(): Promise<void> {
    const { pendingSecretImports } = this.#getQrSyncControllerState();

    if (!pendingSecretImports) {
      return;
    }

    await this.#messenger.call(
      'AccountTreeController:importState',
      await AccountTreeSnapshot.deserialize(pendingSecretImports),
    );
  }

  /**
   * Runs Phase C: applies account metadata (wallet/group names, pin, hidden)
   * via `importState` on the secrets-stripped `provisioningMetadata` payload,
   * reconciles with user storage, and marks provisioning complete.
   *
   * Always runs after Phase B (`QrSyncController:importRemainingSecrets`), for
   * both new-user and existing-user paths:
   *
   * - **New-user** (`SECRETS_IMPORTED` after vault creation): Phase B imported
   *   secondary wallet secrets into the keyring. `provisioningMetadata` carries
   *   a secrets-stripped `AccountTreePayload` (wallet `value` absent); `importState`
   *   matches wallets by entropy source ID and applies names, groups, and layout.
   *
   * - **Existing-user** (`SECRETS_IMPORTED` after `importRemainingSecrets`): Phase B
   *   imported any missing secondary wallet secrets via `importState(stripMetadata)`.
   *   `provisioningMetadata` then applies the full metadata layer in the same way.
   *
   * In both cases the payload shape is identical: a persisted, secrets-stripped
   * `AccountTreePayload` where `value` is absent for every wallet entry.
   */
  async provisionFromMetadata(): Promise<void> {
    const { provisioningMetadata, provisioningStatus } =
      this.#getQrSyncControllerState();

    this.#assertProvisioningPreconditions(provisioningStatus, provisioningMetadata);

    try {
      await this.#messenger.call(
        'AccountTreeController:importState',
        await AccountTreeSnapshot.deserialize(provisioningMetadata),
      );

      await this.#reconcileWithUserStorage();

      this.#messenger.call('QrSyncController:completeProvisioning');
    } catch (error) {
      this.#messenger.call('QrSyncController:markProvisioningFailed');
      throw error;
    }
  }

  #assertProvisioningPreconditions(
    provisioningStatus: string | null,
    provisioningMetadata: unknown,
  ): asserts provisioningMetadata is NonNullable<typeof provisioningMetadata> {
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

  async #reconcileWithUserStorage(): Promise<void> {
    try {
      await this.#messenger.call('AccountTreeController:syncWithUserStorage');
    } catch (error) {
      const syncFlow = this.#getSessionSyncFlow();
      reportQrSyncFailure(error, {
        surface: QrSyncSurfaces.IMPORT,
        operation: QrSyncOperations.USER_STORAGE_RECONCILIATION,
        source: QrSyncTelemetrySources.PROVISIONING_RECONCILE,
        ...(syncFlow ? { syncFlow } : {}),
      });
    }
  }

  #getSessionSyncFlow(): QrSyncSyncFlow | undefined {
    try {
      return this.#getQrSyncControllerState().syncFlow ?? undefined;
    } catch {
      return undefined;
    }
  }

  #getQrSyncControllerState() {
    return this.#messenger.call('QrSyncController:getState');
  }
}
