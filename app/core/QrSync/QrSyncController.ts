import { BaseController, type StateMetadata } from '@metamask/base-controller';
import type { EntropySourceId } from '@metamask/keyring-api';
import type { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';

import {
  QR_SYNC_CONTROLLER_NAME,
  type QrSyncControllerMessenger,
  type QrSyncControllerState,
  type QrSyncProvisioningEntryEnrichment,
} from './controller-types';
import type {
  QrSyncConnectionStatus,
  QrSyncError,
  QrSyncErrorCode,
  QrSyncPhase,
  QrSyncServiceEvent,
  QrSyncWireMessage,
} from './types';
import { createQrSyncWalletClient } from './services/create-qr-sync-wallet-client';
import {
  parseQrSyncConnectionRequest,
  isQrSyncReadyForSecretImport,
  resolveQrSyncProvisioningEntryForEnrichment,
  validateQrSyncSecretImportsForOnboarding,
} from './services/qr-sync-validation';
import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
  RELAY_URL,
} from './constants';
import { routeIncomingQrSyncMessage } from './services/qr-sync-message-router';
import {
  addQrSyncPhaseBreadcrumb,
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';

const metadata: StateMetadata<QrSyncControllerState> = {
  phase: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  connectionStatus: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  otp: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  error: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  pendingSecretImports: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  provisioningMetadata: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  provisioningStatus: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
};

export const defaultQrSyncControllerState: QrSyncControllerState = {
  phase: QrSyncPhases.IDLE,
  connectionStatus: 'disconnected',
  pendingSecretImports: null,
  provisioningMetadata: null,
  provisioningStatus: null,
  otp: null,
  error: null,
};

/**
 * Controller that owns serialized QR sync state and coordinates runtime helpers.
 *
 * Runtime-only objects such as `WalletClient` are intentionally kept out of
 * controller state. `pendingSecretImports` holds secret material and is excluded
 * from debug snapshots, state logs, and persistence.
 */
export class QrSyncController extends BaseController<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState,
  QrSyncControllerMessenger
> {
  private readonly keyManager: IKeyManager;

  private readonly relayUrl: string;

  private readonly getIsOnboardingCompleted: () => boolean;

  private client: WalletClient | null = null;

  private sessionId: string | null = null;

  constructor({
    messenger,
    state,
    keyManager,
    relayUrl = RELAY_URL,
    getIsOnboardingCompleted,
  }: {
    messenger: QrSyncControllerMessenger;
    state?: Partial<QrSyncControllerState>;
    keyManager: IKeyManager;
    relayUrl?: string;
    getIsOnboardingCompleted: () => boolean;
  }) {
    super({
      name: QR_SYNC_CONTROLLER_NAME,
      messenger,
      metadata,
      state: {
        ...defaultQrSyncControllerState,
        ...state,
      },
    });

    this.keyManager = keyManager;
    this.relayUrl = relayUrl;
    this.getIsOnboardingCompleted = getIsOnboardingCompleted;
  }

  /**
   * Primary mobile entrypoint for QR sync.
   *
   * Expects the scanned deeplink
   * `metamask://connect/mwp?p=<base64-encoded-session-request>` (optional
   * `&c=1` when compressed). The controller validates the payload, creates the
   * wallet-side MWP session, attaches it, and starts the connection handshake.
   */
  public async handleScannedQrPayload(scannedQrData: string): Promise<void> {
    const connectionRequest = parseQrSyncConnectionRequest(scannedQrData);

    // Destroy any existing session before starting a new one.
    await this.destroySession();
    this.clearControllerState();
    this.transitionTo(QrSyncPhases.INITIALIZING);

    try {
      const { sessionRequest } = connectionRequest;

      const { sessionId, client } = await createQrSyncWalletClient({
        sessionId: sessionRequest.id,
        keyManager: this.keyManager,
        relayUrl: this.relayUrl,
      });

      this.attachClient(client, sessionId);
      this.setConnectionStatus('connecting');
      await client.connect({ sessionRequest });
      await this.sendSyncOffer();
    } catch (error) {
      this.terminateWithError(this.toQrSyncError(error, 'CHANNEL_INIT_FAILED'));
    }
  }

  /**
   * Resets serialized controller state and tears down any active session.
   * Clears secret material such as `importPlan` from memory.
   */
  public resetState(): void {
    this.destroySession().catch(() => undefined);
    this.clearControllerState();
  }

  /**
   * Terminates an in-progress session and notifies the extension.
   * No-op when the session is already idle, completed, or failed.
   */
  public cancelSession(): void {
    if (this.client === null) {
      return;
    }

    this.notifyPeerAndEndSession(QrSyncActionTypes.SYNC_CANCEL).catch(
      () => undefined,
    );
  }

  /**
   * Phase B entrypoint: validates state, then delegates vault imports to the
   * provisioning service for non-primary pending secrets.
   */
  public async importRemainingSecrets(): Promise<void> {
    if (!isQrSyncReadyForSecretImport(this.state)) {
      return;
    }

    const { pendingSecretImports } = this.state;
    const remainingSecrets =
      pendingSecretImports?.filter(
        (secret) =>
          !(secret.type === QrSyncSecretTypes.MNEMONIC && secret.isPrimary),
      ) ?? [];

    await this.messenger.call(
      'QrSyncProvisioningService:importSecretsToVault',
      remainingSecrets,
    );

    try {
      this.finalizeSecretImport();
    } catch (error) {
      reportQrSyncFailure(error, {
        surface: QrSyncSurfaces.IMPORT,
        operation: QrSyncOperations.IMPORT_REMAINING_SECRETS_FINALIZE,
        phase: this.state.phase,
        source: QrSyncTelemetrySources.CONTROLLER_IMPORT_REMAINING,
      });
    }
  }

  /**
   * Merges vault-derived runtime IDs into a persisted provisioning metadata entry.
   */
  public enrichProvisioningEntry(
    index: number,
    enrichment: QrSyncProvisioningEntryEnrichment,
  ): void {
    const { entryIndex, entry } = resolveQrSyncProvisioningEntryForEnrichment(
      this.state,
      index,
    );

    if ('entropySource' in enrichment) {
      if (entry.type !== QrSyncSecretTypes.MNEMONIC) {
        throw new Error(`QR sync metadata entry ${index} is not a mnemonic`);
      }
    } else if (entry.type !== QrSyncSecretTypes.PRIVATE_KEY) {
      throw new Error(`QR sync metadata entry ${index} is not a private key`);
    }

    const enrichedEntry =
      'entropySource' in enrichment
        ? { ...entry, entropySource: enrichment.entropySource }
        : { ...entry, accountAddress: enrichment.accountAddress };

    this.update((state) => {
      if (!state.provisioningMetadata) {
        return;
      }

      const entries = [...state.provisioningMetadata.entries];
      entries[entryIndex] = enrichedEntry;
      state.provisioningMetadata = {
        ...state.provisioningMetadata,
        entries,
      };
    });
  }

  /**
   * Marks onboarding provisioning as failed and clears ephemeral secrets.
   * Persisted metadata is retained for potential retry (Phase C).
   */
  public markProvisioningFailed(): void {
    this.update((state) => {
      state.provisioningStatus = QrSyncProvisioningStatuses.FAILED;
      state.pendingSecretImports = null;
    });
  }

  /**
   * Marks metadata provisioning complete and clears persisted metadata.
   */
  public completeProvisioning(): void {
    this.update(() => ({
      ...defaultQrSyncControllerState,
      provisioningStatus: QrSyncProvisioningStatuses.COMPLETED,
    }));
  }

  private attachClient(client: WalletClient, sessionId: string): void {
    if (this.client !== null) {
      throw new Error(
        'QrSyncController.attachClient called while a client already exists',
      );
    }

    this.client = client;
    this.sessionId = sessionId;
    this.bindClientListeners();
  }

  private readonly handleClientDisplayOtp = (
    otp: string,
    deadline: number,
  ): void => {
    this.handleSessionServiceEvent({
      type: QrSyncActionTypes.OTP_DISPLAY_GRANT,
      data: { otp, deadline },
    });
  };

  private readonly handleClientConnected = (): void => {
    // Wallet-client `connected` fires after the extension verifies OTP (handshake_ack).
    this.setConnectionStatus('connected');
  };

  private readonly handleClientDisconnected = (): void => {
    if (
      this.client === null ||
      this.state.phase === QrSyncPhases.IDLE ||
      this.state.phase === QrSyncPhases.COMPLETED ||
      this.state.phase === QrSyncPhases.FAILED
    ) {
      return;
    }

    this.terminateWithError({
      code: 'CHANNEL_DISCONNECTED',
      message: 'QR sync connection was lost.',
    });
  };

  private readonly handleClientMessage = (message: unknown): void => {
    try {
      const routedMessage = routeIncomingQrSyncMessage(message);

      if (!routedMessage) {
        return;
      }

      if (routedMessage.event.type === QrSyncActionTypes.SYNC_READY) {
        const isOnboardingCompleted = this.getIsOnboardingCompleted();
        if (!isOnboardingCompleted) {
          // If onboarding is not completed, we need to validate that the pending secret imports include a primary mnemonic.
          const secretImportValidation =
            validateQrSyncSecretImportsForOnboarding(
              routedMessage.pendingSecretImports,
            );

          if (!secretImportValidation.valid && secretImportValidation.error) {
            this.terminateWithError(secretImportValidation.error);
            return;
          }
        }

        if (!this.client) {
          throw this.toQrSyncError(new Error('Wallet client not found'));
        }
      }

      this.handleSessionServiceEvent(routedMessage.event);

      if (routedMessage.event.type === QrSyncActionTypes.SYNC_READY) {
        const { pendingSecretImports, provisioningMetadata } = routedMessage;
        if (pendingSecretImports && provisioningMetadata) {
          this.update((state) => {
            state.pendingSecretImports = pendingSecretImports;
            state.provisioningMetadata = provisioningMetadata;
            state.provisioningStatus =
              QrSyncProvisioningStatuses.AWAITING_PASSWORD;
          });
        }

        this.sendSyncCompleted().catch(() => undefined);
      }
    } catch (error) {
      this.terminateWithError(this.toQrSyncError(error, 'SYNC_FAILED'));
    }
  };

  private readonly handleClientError = (error: Error): void => {
    this.setConnectionStatus('errored');
    this.handleSessionServiceEvent({
      type: QrSyncActionTypes.SYNC_ERROR,
      data: this.toClientSyncError(error),
    });
  };

  private readonly handleSessionServiceEvent = (event: QrSyncServiceEvent) => {
    switch (event.type) {
      case QrSyncActionTypes.OTP_DISPLAY_GRANT: {
        const from = this.state.phase;
        if (from !== QrSyncPhases.DISPLAYING_OTP) {
          addQrSyncPhaseBreadcrumb({
            from,
            to: QrSyncPhases.DISPLAYING_OTP,
          });
        }
        this.update((state) => {
          state.phase = QrSyncPhases.DISPLAYING_OTP;
          state.otp = event.data;
          state.error = null;
        });
        break;
      }
      case QrSyncActionTypes.SYNC_READY: {
        const from = this.state.phase;
        if (from !== QrSyncPhases.REVIEWING_IMPORT) {
          addQrSyncPhaseBreadcrumb({
            from,
            to: QrSyncPhases.REVIEWING_IMPORT,
          });
        }
        this.update((state) => {
          state.phase = QrSyncPhases.REVIEWING_IMPORT;
          state.error = null;
        });
        break;
      }
      case QrSyncActionTypes.SYNC_COMPLETED: {
        const from = this.state.phase;
        if (from !== QrSyncPhases.COMPLETED) {
          addQrSyncPhaseBreadcrumb({
            from,
            to: QrSyncPhases.COMPLETED,
          });
        }
        this.update((state) => {
          state.phase = QrSyncPhases.COMPLETED;
          state.otp = null;
          state.error = null;
        });
        this.destroySession().catch(() => undefined);
        break;
      }
      case QrSyncActionTypes.SYNC_CANCEL: {
        this.clearControllerState();
        this.destroySession().catch(() => undefined);
        break;
      }
      case QrSyncActionTypes.SYNC_ERROR: {
        this.terminateWithError(event.data);
        break;
      }

      default:
      // no-op
    }
  };

  private async sendSyncOffer(): Promise<void> {
    await this.sendMessage({
      type: QrSyncActionTypes.SYNC_OFFER,
      version: QrSyncMessageVersion.V1,
      data: {
        sessionId: this.sessionId ?? undefined,
        isOnboardingCompleted: this.getIsOnboardingCompleted(),
      },
    });

    const from = this.state.phase;
    this.update((state) => {
      state.otp = null;
      state.phase = QrSyncPhases.AWAITING_SYNC_READY;
    });
    if (from !== QrSyncPhases.AWAITING_SYNC_READY) {
      addQrSyncPhaseBreadcrumb({
        from,
        to: QrSyncPhases.AWAITING_SYNC_READY,
      });
    }
  }

  private async sendSyncCompleted(): Promise<void> {
    await this.sendMessage({
      type: QrSyncActionTypes.SYNC_COMPLETED,
      version: QrSyncMessageVersion.V1,
    });

    const from = this.state.phase;
    this.update((state) => {
      state.phase = QrSyncPhases.COMPLETED;
      state.otp = null;
      state.error = null;
    });
    if (from !== QrSyncPhases.COMPLETED) {
      addQrSyncPhaseBreadcrumb({
        from,
        to: QrSyncPhases.COMPLETED,
      });
    }
    await this.destroySession();
  }

  /**
   * Enriches the primary mnemonic entry after the primary vault restore.
   */
  public enrichPrimaryProvisioningEntry(
    primaryEntropySource: EntropySourceId,
  ): void {
    if (!isQrSyncReadyForSecretImport(this.state)) {
      return;
    }

    const primarySecret = this.state.pendingSecretImports?.find(
      (secret) =>
        secret.type === QrSyncSecretTypes.MNEMONIC && secret.isPrimary,
    );

    if (!primarySecret) {
      return;
    }

    try {
      this.enrichProvisioningEntry(primarySecret.index, {
        entropySource: primaryEntropySource,
      });
    } catch (error) {
      reportQrSyncFailure(error, {
        surface: QrSyncSurfaces.IMPORT,
        operation: QrSyncOperations.ENRICH_PRIMARY_PROVISIONING_ENTRY,
        phase: this.state.phase,
        source: QrSyncTelemetrySources.CONTROLLER_ENRICH_PRIMARY,
      });
    }
  }

  /**
   * Clears ephemeral secrets and marks Phase B complete. Persisted metadata is
   * left as-is (possibly partially enriched).
   */
  private finalizeSecretImport(): void {
    if (!this.state.provisioningMetadata) {
      throw new Error('QR sync finalize requires provisioning metadata');
    }

    this.update((state) => {
      state.pendingSecretImports = null;
      state.provisioningStatus = QrSyncProvisioningStatuses.SECRETS_IMPORTED;
    });
  }

  private async sendMessage(message: QrSyncWireMessage): Promise<void> {
    if (!this.client) {
      return this.terminateWithError(
        this.toQrSyncError(
          new Error('No connected session found'),
          'CHANNEL_DISCONNECTED',
        ),
      );
    }

    await this.client.sendResponse(message);
  }

  private transitionTo(phase: QrSyncPhase, errorCode?: QrSyncErrorCode): void {
    const from = this.state.phase;
    if (from !== phase) {
      addQrSyncPhaseBreadcrumb({ from, to: phase, errorCode });
    }
    this.update((state) => {
      state.phase = phase;
    });
  }

  private terminateWithError(error: QrSyncError): void {
    this.notifyPeerAndEndSession(QrSyncActionTypes.SYNC_ERROR, error).catch(
      () => undefined,
    );
  }

  private async notifyPeerAndEndSession(
    wireType:
      | typeof QrSyncActionTypes.SYNC_CANCEL
      | typeof QrSyncActionTypes.SYNC_ERROR,
    error?: QrSyncError,
  ): Promise<void> {
    if (this.client) {
      try {
        if (wireType === QrSyncActionTypes.SYNC_ERROR && error) {
          await this.sendMessage({
            type: QrSyncActionTypes.SYNC_ERROR,
            version: QrSyncMessageVersion.V1,
            data: error,
          });
        } else {
          await this.sendMessage({
            type: QrSyncActionTypes.SYNC_CANCEL,
            version: QrSyncMessageVersion.V1,
          });
        }
      } catch {
        // Best-effort peer notification; still terminate locally.
      }
    }

    await this.destroySession();

    if (wireType === QrSyncActionTypes.SYNC_ERROR && error) {
      const from = this.state.phase;
      if (from !== QrSyncPhases.FAILED) {
        addQrSyncPhaseBreadcrumb({
          from,
          to: QrSyncPhases.FAILED,
          errorCode: error.code,
        });
      }
      reportQrSyncFailure(new Error(error.message), {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
        errorCode: error.code,
        phase: from,
        source: QrSyncTelemetrySources.CONTROLLER,
      });
      this.update((state) => {
        state.phase = QrSyncPhases.FAILED;
        state.error = error;
      });
      return;
    }

    this.clearControllerState();
  }

  private async destroySession(): Promise<void> {
    if (!this.client) {
      return;
    }

    this.unbindClientListeners();

    const client = this.client;
    this.client = null;
    this.sessionId = null;

    try {
      await client.disconnect();
    } catch {
      // Best-effort teardown.
    }
  }

  private bindClientListeners(): void {
    if (!this.client) {
      return;
    }

    this.client.on('display_otp', this.handleClientDisplayOtp);
    this.client.on('connected', this.handleClientConnected);
    this.client.on('disconnected', this.handleClientDisconnected);
    this.client.on('message', this.handleClientMessage);
    this.client.on('error', this.handleClientError);
  }

  private unbindClientListeners(): void {
    if (!this.client) {
      return;
    }

    this.client.off('display_otp', this.handleClientDisplayOtp);
    this.client.off('connected', this.handleClientConnected);
    this.client.off('disconnected', this.handleClientDisconnected);
    this.client.off('message', this.handleClientMessage);
    this.client.off('error', this.handleClientError);
  }

  private setConnectionStatus(status: QrSyncConnectionStatus): void {
    this.update((state) => {
      state.connectionStatus = status;
    });
  }

  private clearControllerState(): void {
    this.update(() => ({
      ...defaultQrSyncControllerState,
    }));
  }

  private toClientSyncError(error: Error): QrSyncError {
    return {
      code: 'SYNC_FAILED',
      message: error.message,
    };
  }

  private toQrSyncError(
    error: unknown,
    code: QrSyncErrorCode = 'INVALID_PAYLOAD',
  ): QrSyncError {
    const message = error instanceof Error ? error.message : String(error);

    return {
      code,
      message,
    };
  }
}
