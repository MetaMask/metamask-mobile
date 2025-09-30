import useConfirmationAlerts from './useConfirmationAlerts';
import useBlockaidAlerts from './useBlockaidAlerts';
import useDomainMismatchAlerts from './useDomainMismatchAlerts';
import { Alert, Severity } from '../../types/alerts';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  siweSignatureConfirmationState,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { useInsufficientBalanceAlert } from './useInsufficientBalanceAlert';
import { useAccountTypeUpgrade } from './useAccountTypeUpgrade';
import { useBatchedUnusedApprovalsAlert } from './useBatchedUnusedApprovalsAlert';
import { useSignedOrSubmittedAlert } from './useSignedOrSubmittedAlert';
import { usePendingTransactionAlert } from './usePendingTransactionAlert';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { useNoPayTokenQuotesAlert } from './useNoPayTokenQuotesAlert';
import { useInsufficientPayTokenNativeAlert } from './useInsufficientPayTokenNativeAlert';

jest.mock('./useBlockaidAlerts');
jest.mock('./useDomainMismatchAlerts');
jest.mock('./useInsufficientBalanceAlert');
jest.mock('./useAccountTypeUpgrade');
jest.mock('./useSignedOrSubmittedAlert');
jest.mock('./usePendingTransactionAlert');
jest.mock('./useBatchedUnusedApprovalsAlert');
jest.mock('./usePerpsDepositMinimumAlert');
jest.mock('./useInsufficientPayTokenBalanceAlert');
jest.mock('./useNoPayTokenQuotesAlert');
jest.mock('./useInsufficientPayTokenNativeAlert');

describe('useConfirmationAlerts', () => {
  const ALERT_MESSAGE_MOCK = 'This is a test alert message.';
  const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
  const mockBlockaidAlerts: Alert[] = [
    {
      key: 'alert1',
      title: 'Test Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Warning,
      alertDetails: ALERT_DETAILS_MOCK,
    },
  ];
  const mockDomainMisMatchAlerts: Alert[] = [
    {
      key: 'domainMismatchAlert',
      title: 'Test Domain Mismatch Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Danger,
      alertDetails: ALERT_DETAILS_MOCK,
    },
  ];

  const mockUpgradeAccountAlert = [
    {
      field: 'accountTypeUpgrade',
      key: 'accountTypeUpgrade',
      severity: 'info',
      title: 'Updating your account',
    },
  ];

  const mockInsufficientBalanceAlert: Alert[] = [
    {
      key: 'insufficientBalanceAlert',
      title: 'Test Insufficient Balance Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Danger,
      alertDetails: ALERT_DETAILS_MOCK,
    },
  ];

  const mockSignedOrSubmittedAlert: Alert[] = [
    {
      key: 'signedOrSubmittedAlert',
      title: 'Test Signed or Submitted Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Danger,
    },
  ];

  const mockPendingTransactionAlert: Alert[] = [
    {
      key: 'pendingTransactionAlert',
      title: 'Test Pending Transaction Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Warning,
    },
  ];

  const mockBatchedUnusedApprovalsAlert: Alert[] = [
    {
      key: 'BatchedUnusedApprovalsAlert',
      title: 'Test Batched UnusedApprovals Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Danger,
    },
  ];

  const mockPerpsDepositMinimumAlert: Alert[] = [
    {
      key: 'PerpsDepositMinimumAlert',
      title: 'Test Perps Deposit Minimum Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Warning,
    },
  ];

  const mockInsufficientPayTokenBalanceAlert: Alert[] = [
    {
      key: 'InsufficientPayTokenBalance',
      title: 'Test Insufficient Pay Token Balance Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Danger,
    },
  ];

  const mockNoPayTokenQuotesAlert: Alert[] = [
    {
      key: 'NoPayTokenQuotesAlert',
      title: 'Test No Pay Token Quotes Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Warning,
    },
  ];

  const mockInsufficientPayTokenNativeAlert: Alert[] = [
    {
      key: 'InsufficientPayTokenNativeAlert',
      title: 'Test Insufficient Pay Token Native Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Danger,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useBlockaidAlerts as jest.Mock).mockReturnValue([]);
    (useDomainMismatchAlerts as jest.Mock).mockReturnValue([]);
    (useInsufficientBalanceAlert as jest.Mock).mockReturnValue([]);
    (useAccountTypeUpgrade as jest.Mock).mockReturnValue([]);
    (useSignedOrSubmittedAlert as jest.Mock).mockReturnValue([]);
    (usePendingTransactionAlert as jest.Mock).mockReturnValue([]);
    (useBatchedUnusedApprovalsAlert as jest.Mock).mockReturnValue([]);
    (usePerpsDepositMinimumAlert as jest.Mock).mockReturnValue([]);
    (useInsufficientPayTokenBalanceAlert as jest.Mock).mockReturnValue([]);
    (useNoPayTokenQuotesAlert as jest.Mock).mockReturnValue([]);
    (useInsufficientPayTokenNativeAlert as jest.Mock).mockReturnValue([]);
  });

  it('returns empty array if no alerts', () => {
    const { result } = renderHookWithProvider(() => useConfirmationAlerts());
    expect(result.current).toEqual([]);
  });

  it('returns blockaid alerts', () => {
    (useBlockaidAlerts as jest.Mock).mockReturnValue(mockBlockaidAlerts);
    const { result } = renderHookWithProvider(() => useConfirmationAlerts(), {
      state: siweSignatureConfirmationState,
    });
    expect(result.current).toEqual(mockBlockaidAlerts);
  });

  it('returns domain mismatch alerts', () => {
    (useDomainMismatchAlerts as jest.Mock).mockReturnValue(
      mockDomainMisMatchAlerts,
    );
    const { result } = renderHookWithProvider(() => useConfirmationAlerts(), {
      state: siweSignatureConfirmationState,
    });
    expect(result.current).toEqual(mockDomainMisMatchAlerts);
  });

  it('returns upgrade account info', () => {
    (useAccountTypeUpgrade as jest.Mock).mockReturnValue(
      mockUpgradeAccountAlert,
    );
    const { result } = renderHookWithProvider(() => useConfirmationAlerts(), {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(result.current).toEqual(mockUpgradeAccountAlert);
  });

  it('returns combined alerts when both blockaid and domain mismatch alerts are present', () => {
    (useBlockaidAlerts as jest.Mock).mockReturnValue(mockBlockaidAlerts);
    (useDomainMismatchAlerts as jest.Mock).mockReturnValue(
      mockDomainMisMatchAlerts,
    );
    (useInsufficientBalanceAlert as jest.Mock).mockReturnValue(
      mockInsufficientBalanceAlert,
    );
    (useAccountTypeUpgrade as jest.Mock).mockReturnValue(
      mockUpgradeAccountAlert,
    );
    (useSignedOrSubmittedAlert as jest.Mock).mockReturnValue(
      mockSignedOrSubmittedAlert,
    );
    (usePendingTransactionAlert as jest.Mock).mockReturnValue(
      mockPendingTransactionAlert,
    );
    (useBatchedUnusedApprovalsAlert as jest.Mock).mockReturnValue(
      mockBatchedUnusedApprovalsAlert,
    );
    (usePerpsDepositMinimumAlert as jest.Mock).mockReturnValue(
      mockPerpsDepositMinimumAlert,
    );
    (useInsufficientPayTokenBalanceAlert as jest.Mock).mockReturnValue(
      mockInsufficientPayTokenBalanceAlert,
    );
    (useNoPayTokenQuotesAlert as jest.Mock).mockReturnValue(
      mockNoPayTokenQuotesAlert,
    );
    (useInsufficientPayTokenNativeAlert as jest.Mock).mockReturnValue(
      mockInsufficientPayTokenNativeAlert,
    );
    const { result } = renderHookWithProvider(() => useConfirmationAlerts(), {
      state: siweSignatureConfirmationState,
    });
    expect(result.current).toEqual([
      ...mockBlockaidAlerts,
      ...mockDomainMisMatchAlerts,
      ...mockInsufficientBalanceAlert,
      ...mockBatchedUnusedApprovalsAlert,
      ...mockPendingTransactionAlert,
      ...mockSignedOrSubmittedAlert,
      ...mockPerpsDepositMinimumAlert,
      ...mockInsufficientPayTokenBalanceAlert,
      ...mockNoPayTokenQuotesAlert,
      ...mockInsufficientPayTokenNativeAlert,
      ...mockUpgradeAccountAlert,
    ]);
  });
});
