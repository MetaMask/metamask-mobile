import {
  AccountTreeSnapshot,
  type AccountTreePayload,
  type AccountWalletPayloadId,
  type AccountGroupPayloadId,
} from '@metamask/account-tree-controller';
import { decodeMnemonicWords } from '@metamask/keyring-sdk';
import { BaseController, type StateMetadata } from '@metamask/base-controller';
import type { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';

import {
  QR_SYNC_CONTROLLER_NAME,
  type QrSyncControllerMessenger,
  type QrSyncControllerState,
} from './controller-types';
import type {
  QrSyncConnectionStatus,
  QrSyncError,
  QrSyncErrorCode,
  QrSyncPhase,
  QrSyncServiceEvent,
  QrSyncTestSyncReadyPayload,
  QrSyncWireMessage,
} from './types';
import { createQrSyncWalletClient } from './services/create-qr-sync-wallet-client';
import {
  parseQrSyncConnectionRequest,
  validateQrSyncPayloadForOnboarding,
} from './services/qr-sync-validation';
import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSyncFlows,
  RELAY_URL,
} from './constants';
import { routeIncomingQrSyncMessage } from './services/qr-sync-message-router';
import { hasTestOverrides } from '../../util/test/utils';
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
  syncFlow: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: false,
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
  pendingPayload: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
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
  syncFlow: null,
  pendingPayload: null,
  provisioningStatus: null,
  otp: null,
  error: null,
};

/**
 * Controller that owns serialized QR sync state and coordinates runtime helpers.
 *
 * Runtime-only objects such as `WalletClient` are intentionally kept out of
 * controller state. `pendingPayload` holds secret material and is excluded
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
    // Capture sync flow once from local onboarding status at session start.
    this.update((state) => {
      state.syncFlow = this.getIsOnboardingCompleted()
        ? QrSyncSyncFlows.EXISTING_USER
        : QrSyncSyncFlows.NEW_USER;
    });
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
   * Clears secret material such as `pendingPayload` from memory.
   */
  public resetState(): void {
    this.destroySession().catch(() => undefined);
    this.clearControllerState();
  }

  /**
   * Whether ephemeral secrets are waiting for vault import.
   * UI callers should use this instead of reading `pendingPayload` directly.
   */
  public hasPendingSecretImports(): boolean {
    // TODO: pendingPayload always includes the primary wallet, so this returns
    // true for any non-null payload. Old model only counted non-primary wallets.
    // Revisit if we need to skip provisionFromMetadata when only a primary is present.
    return this.state.pendingPayload !== null;
  }

  /**
   * E2E-only: apply an SRP sync-ready payload without MWP pairing.
   *
   * Constructs a minimal `AccountTreePayload` from the test parameters and
   * stores it as `pendingPayload` so `useQrSyncImportNavigation` can continue
   * the new-user or existing-user import path.
   *
   * @throws If `HAS_TEST_OVERRIDES` is not enabled, or onboarding requires a
   * primary mnemonic and the payload omits it.
   */
  public applyTestSyncReadyPayload(payload: QrSyncTestSyncReadyPayload): void {
    if (!hasTestOverrides) {
      throw new Error(
        'QrSyncController.applyTestSyncReadyPayload is only available when HAS_TEST_OVERRIDES=true',
      );
    }

    const mnemonic = payload.mnemonic?.trim();
    if (!mnemonic) {
      throw new Error(
        'QrSyncController.applyTestSyncReadyPayload requires a non-empty mnemonic',
      );
    }

    const pendingPayload: AccountTreePayload = {
      version: 1,
      wallets: [
        {
          id: 'wallet:test-primary' as AccountWalletPayloadId,
          type: 'mnemonic',
          value: Array.from(decodeMnemonicWords(mnemonic)),
          metadata: { name: payload.walletName ?? 'Extension Wallet' },
          groups: [
            {
              id: 'wallet:test-primary/0' as AccountGroupPayloadId,
              groupIndex: 0,
              metadata: {
                name: payload.accountName ?? 'Account 1',
                pinned: false,
                hidden: false,
              },
            },
          ],
        },
      ],
    };

    if (!this.getIsOnboardingCompleted()) {
      const payloadValidation =
        validateQrSyncPayloadForOnboarding(pendingPayload);
      if (!payloadValidation.valid && payloadValidation.error) {
        throw new Error(payloadValidation.error.message);
      }
    }

    this.update((state) => {
      state.syncFlow = this.getIsOnboardingCompleted()
        ? QrSyncSyncFlows.EXISTING_USER
        : QrSyncSyncFlows.NEW_USER;
      state.pendingPayload = pendingPayload;
      state.provisioningStatus = QrSyncProvisioningStatuses.AWAITING_PASSWORD;
      state.phase = QrSyncPhases.REVIEWING_IMPORT;
      state.otp = null;
      state.error = null;
      state.connectionStatus = 'disconnected';
    });
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
   * Phase B (new-user): imports the pending account tree and marks vault
   * creation complete so Phase C can proceed.
   *
   * Called from `Authentication.newWalletAndRestore` after the primary vault
   * is created. Calls `AccountTreeController:importState` to import secondary
   * wallets and apply metadata while the vault is unlocked, then sets
   * `provisioningStatus = 'secrets_imported'`.
   */
  public async finalizeVaultCreation(): Promise<void> {
    if (
      this.state.provisioningStatus !==
      QrSyncProvisioningStatuses.AWAITING_PASSWORD
    ) {
      return;
    }

    const { pendingPayload } = this.state;
    if (pendingPayload) {
      await this.messenger.call(
        'AccountTreeController:importState',
        await AccountTreeSnapshot.deserialize(pendingPayload),
      );
    }

    this.update((state) => {
      state.provisioningStatus = QrSyncProvisioningStatuses.SECRETS_IMPORTED;
    });
  }

  /**
   * Marks onboarding provisioning as failed and clears ephemeral payload.
   * Persisted status is retained for potential recovery.
   */
  public markProvisioningFailed(): void {
    this.update((state) => {
      state.provisioningStatus = QrSyncProvisioningStatuses.FAILED;
      state.pendingPayload = null;
    });
  }

  /**
   * Marks metadata provisioning complete and clears all provisioning state.
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
          // If onboarding is not completed, we need to validate that the payload
          // includes a primary mnemonic with a value for vault creation.
          const payloadValidation = validateQrSyncPayloadForOnboarding(
            routedMessage.pendingPayload,
          );

          if (!payloadValidation.valid && payloadValidation.error) {
            this.terminateWithError(payloadValidation.error);
            return;
          }
        }

        if (!this.client) {
          throw this.toQrSyncError(new Error('Wallet client not found'));
        }
      }

      this.handleSessionServiceEvent(routedMessage.event);

      if (routedMessage.event.type === QrSyncActionTypes.SYNC_READY) {
        const { pendingPayload } = routedMessage;
        if (pendingPayload) {
          this.update((state) => {
            state.pendingPayload = pendingPayload;
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
      case QrSyncActionTypes.OTP_DISPLAY_GRANT:
        this.transitionTo(QrSyncPhases.DISPLAYING_OTP, {
          patch: (state) => {
            state.otp = event.data;
            state.error = null;
          },
        });
        break;
      case QrSyncActionTypes.SYNC_READY:
        this.transitionTo(QrSyncPhases.REVIEWING_IMPORT, {
          patch: (state) => {
            state.error = null;
          },
        });
        break;
      case QrSyncActionTypes.SYNC_COMPLETED:
        this.transitionTo(QrSyncPhases.COMPLETED, {
          patch: (state) => {
            state.otp = null;
            state.error = null;
          },
        });
        this.destroySession().catch(() => undefined);
        break;
      case QrSyncActionTypes.SYNC_CANCEL:
        this.clearControllerState();
        this.destroySession().catch(() => undefined);
        break;
      case QrSyncActionTypes.SYNC_ERROR:
        this.terminateWithError(event.data);
        break;
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

    this.transitionTo(QrSyncPhases.AWAITING_SYNC_READY, {
      patch: (state) => {
        state.otp = null;
      },
    });
  }

  private async sendSyncCompleted(): Promise<void> {
    await this.sendMessage({
      type: QrSyncActionTypes.SYNC_COMPLETED,
      version: QrSyncMessageVersion.V1,
    });

    this.transitionTo(QrSyncPhases.COMPLETED, {
      patch: (state) => {
        state.otp = null;
        state.error = null;
      },
    });
    await this.destroySession();
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

  private transitionTo(
    phase: QrSyncPhase,
    options?: {
      errorCode?: QrSyncErrorCode;
      patch?: (state: QrSyncControllerState) => void;
    },
  ): void {
    const phaseFrom = this.state.phase;
    if (phaseFrom !== phase) {
      addQrSyncPhaseBreadcrumb({
        phaseFrom,
        phaseTo: phase,
        errorCode: options?.errorCode,
      });
    }
    this.update((state) => {
      state.phase = phase;
      options?.patch?.(state);
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
      const phaseFrom = this.state.phase;
      reportQrSyncFailure(new Error(error.message), {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
        errorCode: error.code,
        phase: phaseFrom,
        source: QrSyncTelemetrySources.CONTROLLER,
        ...(this.state.syncFlow ? { syncFlow: this.state.syncFlow } : {}),
      });
      this.transitionTo(QrSyncPhases.FAILED, {
        errorCode: error.code,
        patch: (state) => {
          state.error = error;
        },
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
