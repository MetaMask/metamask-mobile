import { RecommendedAction } from '@metamask/phishing-controller';
import { TransactionMeta } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useUrlTrustSignalAlerts } from './useUrlTrustSignalAlerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import useApprovalRequest from '../useApprovalRequest';

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

describe('useUrlTrustSignalAlerts', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseSignatureRequest = jest.mocked(useSignatureRequest);
  const mockUseApprovalRequest = jest.mocked(useApprovalRequest);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseSignatureRequest.mockReturnValue(undefined);
    mockUseApprovalRequest.mockReturnValue({
      approvalRequest: undefined,
      pageMeta: {},
      onConfirm: jest.fn(),
      onReject: jest.fn(),
    });
  });

  describe('with transaction metadata origin', () => {
    beforeEach(() => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        origin: 'https://malicious-site.com',
      } as unknown as TransactionMeta);
    });

    it('returns a malicious alert if the URL scan result is Block', () => {
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'malicious-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Block,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.UrlTrustSignalMalicious,
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
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'malicious-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Warn,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.UrlTrustSignalWarning,
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
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'malicious-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.None,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([]);
    });

    it('returns no alerts if the URL scan result is Verified', () => {
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'malicious-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Verified,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([]);
    });

    it('returns no alerts if the URL scan result does not exist', () => {
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {},
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([]);
    });
  });

  describe('with signature request URL', () => {
    beforeEach(() => {
      mockUseSignatureRequest.mockReturnValue({
        id: 'test-signature-id',
      } as ReturnType<typeof useSignatureRequest>);
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
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
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'signature-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Block,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.UrlTrustSignalMalicious,
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

  describe('with approval request origin', () => {
    beforeEach(() => {
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
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
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'approval-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Block,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.UrlTrustSignalMalicious,
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

  describe('with no origin', () => {
    it('returns no alerts when origin is undefined', () => {
      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'some-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Block,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([]);
    });
  });

  describe('origin priority', () => {
    it('prioritizes signature request URL over transaction metadata origin', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        origin: 'https://transaction-site.com',
      } as unknown as TransactionMeta);
      mockUseSignatureRequest.mockReturnValue({
        id: 'test-signature-id',
      } as ReturnType<typeof useSignatureRequest>);
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
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

      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'signature-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Block,
                      },
                    },
                    'transaction-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.None,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.UrlTrustSignalMalicious,
          field: RowAlertKey.RequestFrom,
          message:
            'This has been identified as malicious. We recommend not interacting with this site.',
          title: 'Malicious site',
          severity: Severity.Danger,
          isBlocking: false,
        },
      ]);
    });

    it('prioritizes transaction metadata origin over approval request origin', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        origin: 'https://transaction-site.com',
      } as unknown as TransactionMeta);
      mockUseApprovalRequest.mockReturnValue({
        approvalRequest: {
          id: 'test-approval-id',
          requestData: {
            origin: 'https://approval-site.com',
          },
        },
        pageMeta: {},
        onConfirm: jest.fn(),
        onReject: jest.fn(),
      });

      const { result } = renderHookWithProvider(
        () => useUrlTrustSignalAlerts(),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  urlScanCache: {
                    'transaction-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.Block,
                      },
                    },
                    'approval-site.com': {
                      data: {
                        recommendedAction: RecommendedAction.None,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([
        {
          key: AlertKeys.UrlTrustSignalMalicious,
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
