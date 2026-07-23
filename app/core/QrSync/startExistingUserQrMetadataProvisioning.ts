import Engine from '../Engine';
import { QrSyncProvisioningStatuses, QrSyncSyncFlows } from './constants';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';

/**
 * Returns whether existing-user QR sync is ready for Phase C metadata layout.
 * Mirrors `selectQrSyncNeedsProvisioning` for imperative call sites.
 */
export const isExistingUserQrReadyForMetadataProvisioning = (): boolean => {
  const { provisioningStatus, provisioningMetadata } =
    Engine.context.QrSyncController.state;

  return (
    provisioningStatus === QrSyncProvisioningStatuses.SECRETS_IMPORTED &&
    provisioningMetadata !== null
  );
};

/**
 * Runs Phase C (extension layout metadata) for the existing-user QR sync path.
 * Non-blocking — callers navigate Home without awaiting, matching new-user
 * `finalizeOnboardingCompletion` behavior.
 *
 * @returns `true` when Phase C was started; `false` when Phase B is incomplete
 * (caller should clear QR sync state instead of leaving a stuck session).
 */
export const startExistingUserQrMetadataProvisioning = (
  source:
    | typeof QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT
    | typeof QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
): boolean => {
  if (!isExistingUserQrReadyForMetadataProvisioning()) {
    return false;
  }

  Engine.context.QrSyncProvisioningService.provisionFromMetadata().catch(
    (error: unknown) => {
      reportQrSyncFailure(error, {
        surface: QrSyncSurfaces.IMPORT,
        operation: QrSyncOperations.PROVISION_FROM_METADATA,
        source,
        syncFlow: QrSyncSyncFlows.EXISTING_USER,
      });
    },
  );

  return true;
};
