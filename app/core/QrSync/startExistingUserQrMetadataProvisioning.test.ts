import { QrSyncSyncFlows } from './constants';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from './qrSyncTelemetry';
import { startExistingUserQrMetadataProvisioning } from './startExistingUserQrMetadataProvisioning';

const mockProvisionFromMetadata = jest.fn();

jest.mock('../Engine', () => ({
  context: {
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
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('starts Phase C without awaiting', () => {
    startExistingUserQrMetadataProvisioning(
      QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
    );

    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
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
