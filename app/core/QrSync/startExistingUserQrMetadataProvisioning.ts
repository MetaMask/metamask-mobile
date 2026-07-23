import Engine from '../Engine';
import { QrSyncSyncFlows } from './constants';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';

/**
 * Runs Phase C (extension layout metadata) for the existing-user QR sync path.
 * Non-blocking — callers navigate Home without awaiting, matching new-user
 * `finalizeOnboardingCompletion` behavior.
 *
 * Preconditions: `provisioningStatus === secrets_imported` and
 * `provisioningMetadata` enriched with vault IDs.
 */
export const startExistingUserQrMetadataProvisioning = (
  source:
    | typeof QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT
    | typeof QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
): void => {
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
};
