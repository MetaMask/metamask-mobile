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

export interface QrSyncProvisioningServiceProvisionFromMetadataAction {
  type: `${typeof SERVICE_NAME}:provisionFromMetadata`;
  handler: QrSyncProvisioningService['provisionFromMetadata'];
}

export type QrSyncProvisioningServiceActions =
  QrSyncProvisioningServiceProvisionFromMetadataAction;

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
      `${SERVICE_NAME}:provisionFromMetadata`,
      this.provisionFromMetadata.bind(this),
    );
  }

  /**
   * Runs Phase C: imports the pending payload via `importState`, reconciles with
   * user storage, and marks provisioning complete.
   *
   * Accepts both `awaiting_password` (existing-user path, where no vault-creation
   * marker was set) and `secrets_imported` (new-user path after vault creation).
   */
  async provisionFromMetadata(): Promise<void> {
    const { pendingPayload, provisioningStatus } =
      this.#getQrSyncControllerState();

    this.#assertProvisioningPreconditions(provisioningStatus, pendingPayload);

    try {
      await this.#messenger.call(
        'AccountTreeController:importState',
        await AccountTreeSnapshot.deserialize(pendingPayload),
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
    pendingPayload: unknown,
  ): asserts pendingPayload is NonNullable<typeof pendingPayload> {
    const isValidStatus =
      provisioningStatus === QrSyncProvisioningStatuses.AWAITING_PASSWORD ||
      provisioningStatus === QrSyncProvisioningStatuses.SECRETS_IMPORTED;

    if (!isValidStatus) {
      throw new Error(
        `QR sync metadata provisioning requires provisioningStatus ${QrSyncProvisioningStatuses.AWAITING_PASSWORD} or ${QrSyncProvisioningStatuses.SECRETS_IMPORTED}`,
      );
    }

    if (!pendingPayload) {
      throw new Error(
        'QR sync metadata provisioning requires a pending payload',
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
