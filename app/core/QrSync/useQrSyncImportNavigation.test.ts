import { AccountWalletPayloadType } from '@metamask/account-tree-controller';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import Routes from '../../constants/navigation/Routes';
import { QrSyncProvisioningStatuses } from './constants';
import { useQrSyncImportNavigation } from './useQrSyncImportNavigation';
import {
  clearQrSyncAccountsReview,
  getQrSyncAccountsReviewSnapshot,
} from './qrSyncAccountsReview';
import { RouteMessengerContext } from '../../contexts/route-messenger';
import { createMockRouteMessenger } from '../../util/test/mock-route-messenger';

const mockNavigate = jest.fn();
const mockGetAccounts = jest.fn<Promise<string[]>, []>();
const mockImportRemainingSecrets = jest.fn();
const mockResetState = jest.fn().mockResolvedValue(undefined);
const mockHasPendingSecretImports = jest.fn().mockResolvedValue(false);
const mockProvisionFromMetadata = jest.fn();
const mockShowAlreadySyncedSheet = jest.fn();
const mockShowImportFailedSheet = jest.fn();
const mockLoggerLog = jest.fn();

let mockCompletedOnboarding = false;
let mockShouldNavigateToImport = false;

const mockPendingSecretImportsPayload = {
  version: 1 as const,
  wallets: [
    {
      id: 'wallet:test' as `wallet:${string}`,
      type: AccountWalletPayloadType.Mnemonic,
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
  pendingSecretImports: typeof mockPendingSecretImportsPayload | null;
  provisioningMetadata: typeof mockPendingSecretImportsPayload | null;
  provisioningStatus: string;
} = {
  pendingSecretImports: null,
  provisioningMetadata: null,
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
  selectQrSyncAccountImportPayload: () => ({
    pendingSecretImports: mockQrSyncControllerState.pendingSecretImports,
    provisioningMetadata: mockQrSyncControllerState.provisioningMetadata,
  }),
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
        (getQrSyncAccountsReviewSnapshot().review ? 1 : 0),
    ).toBeGreaterThan(0);
  });
  // Allow in-flight finally handlers to clear module-level locks.
  await Promise.resolve();
  await Promise.resolve();
};

const renderUseQrSyncImportNavigation = <TProps>(
  callback: (props: TProps) => void,
  options?: { initialProps?: TProps },
) =>
  renderHook(callback, {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        RouteMessengerContext.Provider,
        {
          value: createMockRouteMessenger({
            'QrSyncController:resetState': mockResetState,
            'QrSyncController:hasPendingSecretImports':
              mockHasPendingSecretImports,
            'QrSyncController:handleScannedQrPayload': jest.fn(),
            'KeyringController:getAccounts': mockGetAccounts,
            'QrSyncController:importRemainingSecrets':
              mockImportRemainingSecrets,
          }),
        },
        children,
      ),
    ...options,
  });

describe('useQrSyncImportNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompletedOnboarding = false;
    mockShouldNavigateToImport = false;
    clearQrSyncAccountsReview();
    mockQrSyncControllerState.pendingSecretImports = null;
    mockQrSyncControllerState.provisioningMetadata = null;
    mockQrSyncControllerState.provisioningStatus =
      QrSyncProvisioningStatuses.SECRETS_IMPORTED;
    mockGetAccounts.mockResolvedValue([]);
    mockImportRemainingSecrets.mockResolvedValue(undefined);
    mockHasPendingSecretImports.mockResolvedValue(false);
    mockResetState.mockResolvedValue(undefined);
    mockProvisionFromMetadata.mockResolvedValue(undefined);
  });

  it('shows the accounts review for new users when secrets are ready', async () => {
    mockCompletedOnboarding = false;
    mockShouldNavigateToImport = true;

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await flushAsync();

    expect(getQrSyncAccountsReviewSnapshot().review?.mode).toBe('new-user');
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('imports remaining secrets and provisions metadata for existing users with pending secrets', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingSecretImports =
      mockPendingSecretImportsPayload;
    mockHasPendingSecretImports.mockResolvedValue(true);
    mockGetAccounts
      .mockResolvedValueOnce(['0xold'])
      .mockResolvedValueOnce(['0xold', '0xnew']);

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await waitFor(() => {
      expect(mockImportRemainingSecrets).toHaveBeenCalledTimes(1);
      expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
      expect(getQrSyncAccountsReviewSnapshot().review?.mode).toBe(
        'existing-user',
      );
    });

    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
  });

  it('runs Phase C and shows the accounts review when existing-user sync adds no accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingSecretImports =
      mockPendingSecretImportsPayload;
    mockHasPendingSecretImports.mockResolvedValue(true);
    mockGetAccounts.mockResolvedValue(['0xexisting']);

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await waitFor(() => {
      expect(getQrSyncAccountsReviewSnapshot().review?.mode).toBe(
        'existing-user',
      );
    });

    // Phase C must run even when no new accounts were added — it applies
    // wallet/account names, groups, and layout from the extension.
    expect(mockImportRemainingSecrets).toHaveBeenCalledTimes(1);
    expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET_VIEW);
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('shows import-failed sheet when existing-user sync throws and adds no accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingSecretImports =
      mockPendingSecretImportsPayload;
    mockHasPendingSecretImports.mockResolvedValue(true);
    mockGetAccounts.mockResolvedValue(['0xexisting']);
    mockImportRemainingSecrets.mockRejectedValueOnce(new Error('vault locked'));

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await waitFor(() => {
      expect(mockShowImportFailedSheet).toHaveBeenCalled();
    });

    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('starts Phase C without resetting when sync adds accounts', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingSecretImports =
      mockPendingSecretImportsPayload;
    mockHasPendingSecretImports.mockResolvedValue(true);
    mockGetAccounts
      .mockResolvedValueOnce(['0xold'])
      .mockResolvedValueOnce(['0xold', '0xnew']);

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await waitFor(() => {
      expect(mockImportRemainingSecrets).toHaveBeenCalledTimes(1);
      expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
      expect(getQrSyncAccountsReviewSnapshot().review?.mode).toBe(
        'existing-user',
      );
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET_VIEW);

    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockShowAlreadySyncedSheet).not.toHaveBeenCalled();
    expect(mockShowImportFailedSheet).not.toHaveBeenCalled();
  });

  it('resets QR sync and goes home when existing user has no pending secrets', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingSecretImports = null;
    mockHasPendingSecretImports.mockResolvedValue(false);

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await waitFor(() => {
      expect(mockResetState).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    expect(mockLoggerLog).toHaveBeenCalled();
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
  });

  it('resets handled flag when import is no longer ready', async () => {
    mockShouldNavigateToImport = true;
    mockCompletedOnboarding = false;

    const { rerender } = renderUseQrSyncImportNavigation(
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

    await waitFor(() => {
      expect(getQrSyncAccountsReviewSnapshot().review?.mode).toBe('new-user');
    });

    clearQrSyncAccountsReview();
    rerender({ enabled: true, shouldNavigate: false });
    rerender({ enabled: true, shouldNavigate: true });

    await waitFor(() => {
      expect(getQrSyncAccountsReviewSnapshot().review?.mode).toBe('new-user');
    });
  });

  it('does nothing when disabled', () => {
    mockShouldNavigateToImport = true;
    mockCompletedOnboarding = true;

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: false }),
    );

    expect(getQrSyncAccountsReviewSnapshot().review).toBeNull();
    expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
  });

  it('reports and resets when existing-user finish path rejects', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockQrSyncControllerState.pendingSecretImports =
      mockPendingSecretImportsPayload;
    mockHasPendingSecretImports.mockResolvedValue(true);
    mockGetAccounts.mockRejectedValueOnce(new Error('unexpected'));

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await waitFor(() => {
      expect(reportQrSyncFailure).toHaveBeenCalled();
      expect(mockResetState).toHaveBeenCalled();
    });
  });

  it('does not reset pending secrets when the pending-import probe fails', async () => {
    mockCompletedOnboarding = true;
    mockShouldNavigateToImport = true;
    mockHasPendingSecretImports.mockRejectedValueOnce(
      new Error('messenger down'),
    );

    renderUseQrSyncImportNavigation(() =>
      useQrSyncImportNavigation({ enabled: true }),
    );

    await waitFor(() => {
      expect(reportQrSyncFailure).toHaveBeenCalled();
    });

    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockImportRemainingSecrets).not.toHaveBeenCalled();
  });
});
