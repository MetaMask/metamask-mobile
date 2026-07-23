import { QrSyncProvisioningStatuses, QrSyncSyncFlows } from './constants';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';
import {
  isExistingUserQrReadyForMetadataProvisioning,
  startExistingUserQrMetadataProvisioning,
} from './startExistingUserQrMetadataProvisioning';

const mockProvisionFromMetadata = jest.fn();
const mockQrSyncControllerState = {
  provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED as string,
  provisioningMetadata: { version: '1.0.0', entries: [] } as object | null,
};

jest.mock('../Engine', () => ({
  context: {
    QrSyncController: {
      get state() {
        return mockQrSyncControllerState;
      },
    },
    QrSyncProvisioningService: {
      provisionFromMetadata: (...args: unknown[]) =>
        mockProvisionFromMetadata(...args),
    },
  },
}));

jest.mock('./qrSyncTelemetry', () => {
  const actual = jest.requireActual('./qrSyncTelemetry');
  return {
    ...actual,
    reportQrSyncFailure: jest.fn(),
  };
});

describe('startExistingUserQrMetadataProvisioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQrSyncControllerState.provisioningStatus =
      QrSyncProvisioningStatuses.SECRETS_IMPORTED;
    mockQrSyncControllerState.provisioningMetadata = {
      version: '1.0.0',
      entries: [],
    };
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('reports ready when secrets_imported and metadata exist', () => {
    expect(isExistingUserQrReadyForMetadataProvisioning()).toBe(true);
  });

  it('reports not ready when Phase B is incomplete', () => {
    mockQrSyncControllerState.provisioningStatus =
      QrSyncProvisioningStatuses.AWAITING_PASSWORD;

    expect(isExistingUserQrReadyForMetadataProvisioning()).toBe(false);
  });

  it('starts Phase C when ready and returns true', () => {
    const started = startExistingUserQrMetadataProvisioning(
      QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
    );

    expect(started).toBe(true);
    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
  });

  it('does not start Phase C when Phase B is incomplete and returns false', () => {
    mockQrSyncControllerState.provisioningStatus =
      QrSyncProvisioningStatuses.AWAITING_PASSWORD;

    const started = startExistingUserQrMetadataProvisioning(
      QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
    );

    expect(started).toBe(false);
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
  });

  it('reports failure when provisionFromMetadata rejects', async () => {
    const error = new Error('layout failed');
    mockProvisionFromMetadata.mockRejectedValueOnce(error);

    startExistingUserQrMetadataProvisioning(
      QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(reportQrSyncFailure).toHaveBeenCalledWith(error, {
      surface: QrSyncSurfaces.IMPORT,
      operation: QrSyncOperations.PROVISION_FROM_METADATA,
      source: QrSyncTelemetrySources.FINISH_EXISTING_USER_WITHOUT_MNEMONIC,
      syncFlow: QrSyncSyncFlows.EXISTING_USER,
    });
  });
});
