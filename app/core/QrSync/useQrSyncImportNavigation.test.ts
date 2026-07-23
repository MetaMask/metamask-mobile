import { renderHook, waitFor } from '@testing-library/react-native';

import Routes from '../../constants/navigation/Routes';
import { QrSyncSecretTypes } from './constants';
import { useQrSyncImportNavigation } from './useQrSyncImportNavigation';

const mockNavigate = jest.fn();
const mockGetAccounts = jest.fn();
const mockImportRemainingSecrets = jest.fn();
const mockResetState = jest.fn();
const mockProvisionFromMetadata = jest.fn();
const mockCompleteExistingUserQrSyncImport = jest.fn();
const mockNavigateToQrSyncImport = jest.fn();
const mockShowAlreadySyncedSheet = jest.fn();
const mockShowImportFailedSheet = jest.fn();

let mockCompletedOnboarding = false;
let mockShouldNavigateToImport = false;
let mockQrSyncMnemonic: string | null = null;

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
  selectQrSyncExistingUserImportMnemonic: () => mockQrSyncMnemonic,
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      getAccounts: (...args: unknown[]) => mockGetAccounts(...args),
    },
    QrSyncController: {
      state: {
        pendingSecretImports: null as unknown,
      },
      importRemainingSecrets: (...args: unknown[]) =>
        mockImportRemainingSecrets(...args),
      resetState: () => mockResetState(),
    },
    QrSyncProvisioningService: {
      provisionFromMetadata: (...args: unknown[]) =>
        mockProvisionFromMetadata(...args),
    },
  },
}));

jest.mock('./completeExistingUserQrSyncImport', () => ({
  completeExistingUserQrSyncImport: (...args: unknown[]) =>
    mockCompleteExistingUserQrSyncImport(...args),
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

import Engine from '../Engine';
import { reportQrSyncFailure } from './qrSyncTelemetry';

const flushAsync = async () => {
  await waitFor(() => {
    expect(
      mockCompleteExistingUserQrSyncImport.mock.calls.length +
        mockImportRemainingSecrets.mock.calls.length +
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
    mockQrSyncMnemonic = null;
    Engine.context.QrSyncController.state.pendingSecretImports = null;
    mockGetAccounts.mockResolvedValue([]);
    mockImportRemainingSecrets.mockResolvedValue(undefined);
    mockCompleteExistingUserQrSyncImport.mockResolvedValue(undefined);
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('navigates to QR sync import for new users when secrets are ready', async () => {
    mockCompletedOnboarding = false;
    mockShouldNavigateToImport = true;

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await flushAsync();

    expect(mockNavigateToQrSyncImport).toHaveBeenCalledTimes(1);
    expect(mockCompleteExistingUserQrSyncImport).not.toHaveBeenCalled();
  });

  it('imports primary mnemonic for existing users from controller pending secrets', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    Engine.context.QrSyncController.state.pendingSecretImports = [
      {
        index: 0,
        type: QrSyncSecretTypes.MNEMONIC,
        value: 'primary seed phrase',
        isPrimary: true,
      },
    ];

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await flushAsync();

    expect(mockCompleteExistingUserQrSyncImport).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      'primary seed phrase',
    );
  });

  it('imports first mnemonic when pending secrets omit isPrimary', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    Engine.context.QrSyncController.state.pendingSecretImports = [
      {
        index: 0,
        type: QrSyncSecretTypes.PRIVATE_KEY,
        value: '0xabc',
      },
      {
        index: 1,
        type: QrSyncSecretTypes.MNEMONIC,
        value: 'fallback mnemonic',
        isPrimary: false,
      },
    ];

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await flushAsync();

    expect(mockCompleteExistingUserQrSyncImport).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      'fallback mnemonic',
    );
  });

  it('shows already-synced sheet when private-key sync adds no accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    Engine.context.QrSyncController.state.pendingSecretImports = [
      {
        index: 0,
        type: QrSyncSecretTypes.PRIVATE_KEY,
        value: '0xdeadbeef',
      },
    ];
    mockGetAccounts.mockResolvedValue(['0xexisting']);

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockShowAlreadySyncedSheet).toHaveBeenCalledTimes(1);
    });

    expect(mockImportRemainingSecrets).toHaveBeenCalledTimes(1);
    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('shows import-failed sheet when private-key sync throws and adds no accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    Engine.context.QrSyncController.state.pendingSecretImports = [
      {
        index: 0,
        type: QrSyncSecretTypes.PRIVATE_KEY,
        value: '0xdeadbeef',
      },
    ];
    mockGetAccounts.mockResolvedValue(['0xexisting']);
    mockImportRemainingSecrets.mockRejectedValueOnce(new Error('vault locked'));

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockShowImportFailedSheet).toHaveBeenCalledTimes(1);
    });

    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('navigates home without sheet when private-key sync adds accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    Engine.context.QrSyncController.state.pendingSecretImports = [
      {
        index: 0,
        type: QrSyncSecretTypes.PRIVATE_KEY,
        value: '0xdeadbeef',
      },
    ];
    mockGetAccounts
      .mockResolvedValueOnce(['0xold'])
      .mockResolvedValueOnce(['0xold', '0xnew']);

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockImportRemainingSecrets).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('resets QR sync and goes home when existing user has no pending secrets', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncMnemonic = null;
    Engine.context.QrSyncController.state.pendingSecretImports = null;

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(mockResetState).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    expect(mockCompleteExistingUserQrSyncImport).not.toHaveBeenCalled();
    expect(mockImportRemainingSecrets).not.toHaveBeenCalled();
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

    expect(mockCompleteExistingUserQrSyncImport).not.toHaveBeenCalled();
    expect(mockNavigateToQrSyncImport).not.toHaveBeenCalled();
    expect(mockImportRemainingSecrets).not.toHaveBeenCalled();
  });

  it('reports and resets when existing-user mnemonic import rejects', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncMnemonic = 'seed from redux';
    Engine.context.QrSyncController.state.pendingSecretImports = null;
    mockCompleteExistingUserQrSyncImport.mockRejectedValueOnce(
      new Error('unexpected'),
    );

    renderHook(() => useQrSyncImportNavigation({ enabled: true }));

    await waitFor(() => {
      expect(reportQrSyncFailure).toHaveBeenCalled();
      expect(mockResetState).toHaveBeenCalled();
    });
  });
});
