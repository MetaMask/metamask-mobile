import { useQuery } from '@metamask/react-data-query';
import { RecommendedAction } from '@metamask/phishing-controller';
import { TransactionMeta } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useOriginTrustSignalAlerts } from './useOriginTrustSignalAlerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import useApprovalRequest from '../useApprovalRequest';

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../signatures/useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

jest.mock('../useApprovalRequest', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('useOriginTrustSignalAlerts', () => {
  const mockUseQuery = jest.mocked(useQuery);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  // Scan results served by the mocked PhishingDataService query, keyed by
  // hostname.
  let scanResultsByHostname: Record<
    string,
    { recommendedAction: RecommendedAction } | undefined
  >;

  function setScanResult(
    hostname: string,
    recommendedAction: RecommendedAction,
  ): void {
    scanResultsByHostname[hostname] = { recommendedAction };
  }
  const mockUseSignatureRequest = jest.mocked(useSignatureRequest);
  const mockUseApprovalRequest = jest.mocked(useApprovalRequest);

  beforeEach(() => {
    jest.clearAllMocks();
    scanResultsByHostname = {};
    mockUseQuery.mockImplementation(
      (options) =>
        ({
          data: scanResultsByHostname[
            String(
              (options as unknown as { queryKey: unknown[] }).queryKey[1],
            )
          ],
        }) as never,
    );
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseSignatureRequest.mockReturnValue(undefined);
    mockUseApprovalRequest.mockReturnValue({
      approvalRequest: undefined,
      pageMeta: {},
      onConfirm: jest.fn(),
      onReject: jest.fn(),
    });
  });

  describe('with useTransactionMetadataRequest', () => {
    beforeEach(() => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        origin: 'https://malicious-site.com',
      } as unknown as TransactionMeta);
    });

    it('returns a malicious alert if the URL scan result is Block', () => {
      setScanResult('malicious-site.com', RecommendedAction.Block);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.OriginTrustSignalMalicious,
          field: RowAlertKey.RequestFrom,
          message:
            'This has been identified as malicious. We recommend not interacting with this site.',
          title: 'Malicious site',
          severity: Severity.Danger,
          isBlocking: false,
        },
      ]);
    });

    it('returns a warning alert if the URL scan result is Warn', () => {
      setScanResult('malicious-site.com', RecommendedAction.Warn);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.OriginTrustSignalWarning,
          field: RowAlertKey.RequestFrom,
          message:
            'This has been identified as suspicious. We recommend not interacting with this site.',
          title: 'Suspicious site',
          severity: Severity.Warning,
          isBlocking: false,
        },
      ]);
    });

    it('returns no alerts if the URL scan result is None', () => {
      setScanResult('malicious-site.com', RecommendedAction.None);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([]);
    });

    it('returns no alerts if the URL scan result is Verified', () => {
      setScanResult('malicious-site.com', RecommendedAction.Verified);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([]);
    });

    it('returns no alerts if the URL scan result does not exist', () => {
      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([]);
    });
  });

  describe('with useSignatureRequest', () => {
    beforeEach(() => {
      mockUseSignatureRequest.mockReturnValue({
        id: 'test-signature-id',
      } as ReturnType<typeof useSignatureRequest>);
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
          origin: 'https://signature-site.com',
          time: Date.now(),
          type: 'eth_signTypedData_v4',
          requestState: null,
          expectsResult: false,
          requestData: {
            meta: {
              url: 'https://signature-site.com/sign',
            },
          },
        },
        pageMeta: {},
        onConfirm: jest.fn(),
        onReject: jest.fn(),
      });
    });

    it('returns a malicious alert using URL from signature request approval', () => {
      setScanResult('signature-site.com', RecommendedAction.Block);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.OriginTrustSignalMalicious,
          field: RowAlertKey.RequestFrom,
          message:
            'This has been identified as malicious. We recommend not interacting with this site.',
          title: 'Malicious site',
          severity: Severity.Danger,
          isBlocking: false,
        },
      ]);
    });
  });

  describe('with useApprovalRequest', () => {
    beforeEach(() => {
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
          origin: 'https://approval-site.com',
          time: Date.now(),
          type: 'transaction',
          requestState: null,
          expectsResult: false,
          requestData: {
            origin: 'https://approval-site.com',
          },
        },
        pageMeta: {},
        onConfirm: jest.fn(),
        onReject: jest.fn(),
      });
    });

    it('returns a malicious alert using origin from approval request', () => {
      setScanResult('approval-site.com', RecommendedAction.Block);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.OriginTrustSignalMalicious,
          field: RowAlertKey.RequestFrom,
          message:
            'This has been identified as malicious. We recommend not interacting with this site.',
          title: 'Malicious site',
          severity: Severity.Danger,
          isBlocking: false,
        },
      ]);
    });
  });

  it('returns no alerts when origin is undefined', () => {
    setScanResult('some-site.com', RecommendedAction.Block);

    const { result } = renderHookWithProvider(() =>
      useOriginTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  describe('origin priority', () => {
    it('prioritizes the URL from useSignatureRequest over useTransactionMetadataRequest', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        origin: 'https://transaction-site.com',
      } as unknown as TransactionMeta);
      mockUseSignatureRequest.mockReturnValue({
        id: 'test-signature-id',
      } as ReturnType<typeof useSignatureRequest>);
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
          origin: 'https://signature-site.com',
          time: Date.now(),
          type: 'eth_signTypedData_v4',
          requestState: null,
          expectsResult: false,
          requestData: {
            meta: {
              url: 'https://signature-site.com',
            },
          },
        },
        pageMeta: {},
        onConfirm: jest.fn(),
        onReject: jest.fn(),
      });

      setScanResult('signature-site.com', RecommendedAction.Block);
      setScanResult('transaction-site.com', RecommendedAction.None);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.OriginTrustSignalMalicious,
          field: RowAlertKey.RequestFrom,
          message:
            'This has been identified as malicious. We recommend not interacting with this site.',
          title: 'Malicious site',
          severity: Severity.Danger,
          isBlocking: false,
        },
      ]);
    });

    it('prioritizes the origin from useTransactionMetadataRequest over useApprovalRequest', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        origin: 'https://transaction-site.com',
      } as unknown as TransactionMeta);
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
          origin: 'https://approval-site.com',
          time: Date.now(),
          type: 'transaction',
          requestState: null,
          expectsResult: false,
          requestData: {
            origin: 'https://approval-site.com',
          },
        },
        pageMeta: {},
        onConfirm: jest.fn(),
        onReject: jest.fn(),
      });

      setScanResult('transaction-site.com', RecommendedAction.Block);
      setScanResult('approval-site.com', RecommendedAction.None);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignalAlerts(),
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.OriginTrustSignalMalicious,
          field: RowAlertKey.RequestFrom,
          message:
            'This has been identified as malicious. We recommend not interacting with this site.',
          title: 'Malicious site',
          severity: Severity.Danger,
          isBlocking: false,
        },
      ]);
    });
  });
});
