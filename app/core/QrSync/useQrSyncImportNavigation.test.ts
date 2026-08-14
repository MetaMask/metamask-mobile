import { renderHook, waitFor } from '@testing-library/react-native';

import Routes from '../../constants/navigation/Routes';
import { QrSyncProvisioningStatuses } from './constants';
import { useQrSyncImportNavigation } from './useQrSyncImportNavigation';

const mockNavigate = jest.fn();
const mockGetAccounts = jest.fn();
const mockResetState = jest.fn();
const mockProvisionFromMetadata = jest.fn();
const mockNavigateToQrSyncImport = jest.fn();
const mockShowAlreadySyncedSheet = jest.fn();
const mockShowImportFailedSheet = jest.fn();
const mockLoggerLog = jest.fn();

let mockCompletedOnboarding = false;
let mockShouldNavigateToImport = false;

const mockPendingPayload = {
  version: 1 as const,
  wallets: [
    {
      id: 'wallet:test' as `wallet:${string}`,
      type: 'mnemonic' as const,
      value: [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6],
      metadata: { name: 'Wallet 1' },
      groups: [
        {
          id: 'wallet:test/0' as `wallet:${string}/${string}`,
          groupIndex: 0,
          metadata: { name: 'Account 1', pinned: false, hidden: false },
        },
      ],
    },
  ],
};

const mockQrSyncControllerState: {
  pendingPayload: typeof mockPendingPayload | null;
  provisioningStatus: string;
} = {
  pendingPayload: null,
  provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../selectors/onboarding', () => ({
  selectCompletedOnboarding: () => mockCompletedOnboarding,
}));

jest.mock('../../selectors/qrSyncController', () => ({
  selectQrSyncShouldNavigateToImport: () => mockShouldNavigateToImport,
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: (...args: unknown[]) => mockLoggerLog(...args),
    error: jest.fn(),
  },
}));

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      getAccounts: (...args: unknown[]) => mockGetAccounts(...args),
    },
    QrSyncController: {
      get state() {
        return mockQrSyncControllerState;
      },
      resetState: () => mockResetState(),
    },
    QrSyncProvisioningService: {
      provisionFromMetadata: (...args: unknown[]) =>
        mockProvisionFromMetadata(...args),
    },
  },
}));

jest.mock('./navigateToQrSyncImport', () => ({
  navigateToQrSyncImport: (...args: unknown[]) =>
    mockNavigateToQrSyncImport(...args),
}));

jest.mock(
  '../../components/Views/AddDeviceToWallet/showAlreadySyncedSheet',
  () => ({
    showAlreadySyncedSheet: (...args: unknown[]) =>
      mockShowAlreadySyncedSheet(...args),
  }),
);

jest.mock(
  '../../components/Views/AddDeviceToWallet/showImportFailedSheet',
  () => ({
    showImportFailedSheet: (...args: unknown[]) =>
      mockShowImportFailedSheet(...args),
  }),
);

jest.mock('./qrSyncTelemetry', () => {
  const actual = jest.requireActual('./qrSyncTelemetry');
  return {
    ...actual,
    reportQrSyncFailure: jest.fn(),
  };
});

import { reportQrSyncFailure } from './qrSyncTelemetry';

const flushAsync = async () => {
  await waitFor(() => {
    expect(
      mockProvisionFromMetadata.mock.calls.length +
        mockResetState.mock.calls.length +
        mockNavigateToQrSyncImport.mock.calls.length,
    ).toBeGreaterThan(0);
  });
  // Allow in-flight finally handlers to clear module-level locks.
  await Promise.resolve();
  await Promise.resolve();
};

describe('useQrSyncImportNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompletedOnboarding = false;
    mockShouldNavigateToImport = false;
    mockQrSyncControllerState.pendingPayload = null;
    mockQrSyncControllerState.provisioningStatus =
      QrSyncProvisioningStatuses.SECRETS_IMPORTED;
    mockGetAccounts.mockResolvedValue([]);
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('navigates to QR sync import for new users when payload is ready', async () => {
    mockCompletedOnboarding = false;
    mockShouldNavigateToImport = true;

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await flushAsync();

    expect(mockNavigateToQrSyncImport).toHaveBeenCalledTimes(1);
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
  });

  it('calls provisionFromMetadata for existing users with pending payload', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingPayload = mockPendingPayload;
    mockGetAccounts
      .mockResolvedValueOnce(['0xold'])
      .mockResolvedValueOnce(['0xold', '0xnew']);

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
  });

  it('shows already-synced sheet when provisionFromMetadata adds no accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingPayload = mockPendingPayload;
    mockGetAccounts.mockResolvedValue(['0xexisting']);

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockShowAlreadySyncedSheet).toHaveBeenCalledTimes(1);
    });

    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('shows import-failed sheet when provisionFromMetadata throws and adds no accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingPayload = mockPendingPayload;
    mockGetAccounts.mockResolvedValue(['0xexisting']);
    mockProvisionFromMetadata.mockRejectedValueOnce(new Error('vault locked'));

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockShowImportFailedSheet).toHaveBeenCalledTimes(1);
    });

    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('navigates home without resetting when provisioning adds new accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingPayload = mockPendingPayload;
    mockGetAccounts
      .mockResolvedValueOnce(['0xold'])
      .mockResolvedValueOnce(['0xold', '0xnew']);

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('resets QR sync and goes home when existing user has no pending payload', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingPayload = null;

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockResetState).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    expect(mockLoggerLog).toHaveBeenCalled();
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
  });

  it('resets handled flag when import is no longer ready', () => {
    mockShouldNavigateToImport = true;
    mockCompletedOnboarding = false;

    const { rerender } = renderHook(
      ({
        enabled,
        shouldNavigate,
      }: {
        enabled: boolean;
        shouldNavigate: boolean;
      }) => {
        mockShouldNavigateToImport = shouldNavigate;
        useQrSyncImportNavigation({ enabled });
      },
      { initialProps: { enabled: true, shouldNavigate: true } },
    );

    expect(mockNavigateToQrSyncImport).toHaveBeenCalledTimes(1);

    rerender({ enabled: true, shouldNavigate: false });
    mockNavigateToQrSyncImport.mockClear();
    rerender({ enabled: true, shouldNavigate: true });

    expect(mockNavigateToQrSyncImport).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', () => {
    mockShouldNavigateToImport = true;
    mockCompletedOnboarding = true;

    renderHook(() => useQrSyncImportNavigation({ enabled: false }));

    expect(mockNavigateToQrSyncImport).not.toHaveBeenCalled();
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
  });

  it('reports and resets when existing-user finish path rejects', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingPayload = mockPendingPayload;
    mockGetAccounts.mockRejectedValueOnce(new Error('unexpected'));

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(reportQrSyncFailure).toHaveBeenCalled();
      expect(mockResetState).toHaveBeenCalled();
    });
  });
});
