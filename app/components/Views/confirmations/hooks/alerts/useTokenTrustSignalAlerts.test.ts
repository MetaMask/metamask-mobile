import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { useTokenTrustSignalAlerts } from './useTokenTrustSignalAlerts';
import { Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('useTokenTrustSignalAlerts', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      simulationData: {
        tokenBalanceChanges: [
          {
            address: '0x1234567890123456789012345678901234567890',
          },
        ],
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);
  });

  it('returns a malicious alert if the token scan result is malicious', () => {
    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Malicious',
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
        key: AlertKeys.TokenTrustSignalMalicious,
        field: RowAlertKey.IncomingTokens,
        message:
          'This token has been identified as malicious. Interacting with this token may result in a loss of funds.',
        title: 'Malicious token',
        severity: Severity.Danger,
        isBlocking: false,
      },
    ]);
  });

  it('returns a warning alert if the token scan result is warning', () => {
    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Warning',
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
        key: AlertKeys.TokenTrustSignalWarning,
        field: RowAlertKey.IncomingTokens,
        message:
          'This token shows strong signs of malicious behavior. Continuing may result in loss of funds.',
        title: 'Suspicious token',
        severity: Severity.Warning,
        isBlocking: false,
      },
    ]);
  });

  it('returns no alerts if the token scan result is benign', () => {
    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Benign',
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

  it('returns no alerts if the token scan result does not exist', () => {
    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {},
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts if the transaction metadata is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Benign',
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

  it('detects malicious token when it is not the first incoming token', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      simulationData: {
        tokenBalanceChanges: [
          {
            address: '0x0000000000000000000000000000000000000001',
            isDecrease: false,
          },
          {
            address: '0x0000000000000000000000000000000000000002',
            isDecrease: false,
          },
        ],
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {
                  '0x1:0x0000000000000000000000000000000000000001': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Benign',
                    },
                  },
                  '0x1:0x0000000000000000000000000000000000000002': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Malicious',
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
        key: AlertKeys.TokenTrustSignalMalicious,
        field: RowAlertKey.IncomingTokens,
        message:
          'This token has been identified as malicious. Interacting with this token may result in a loss of funds.',
        title: 'Malicious token',
        severity: Severity.Danger,
        isBlocking: false,
      },
    ]);
  });

  it('returns the highest severity alert if there are multiple tokens that are flagged as malicious or warning', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      simulationData: {
        tokenBalanceChanges: [
          {
            address: '0x0000000000000000000000000000000000000001',
            isDecrease: false,
          },
          {
            address: '0x0000000000000000000000000000000000000002',
            isDecrease: false,
          },
        ],
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {
                  '0x1:0x0000000000000000000000000000000000000001': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Warning',
                    },
                  },
                  '0x1:0x0000000000000000000000000000000000000002': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Malicious',
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
        key: AlertKeys.TokenTrustSignalMalicious,
        field: RowAlertKey.IncomingTokens,
        message:
          'This token has been identified as malicious. Interacting with this token may result in a loss of funds.',
        title: 'Malicious token',
        severity: Severity.Danger,
        isBlocking: false,
      },
    ]);
  });

  it('returns exactly one alert if there are multiple tokens that are flagged as malicious or warning', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      simulationData: {
        tokenBalanceChanges: [
          {
            address: '0x0000000000000000000000000000000000000001',
            isDecrease: false,
          },
          {
            address: '0x0000000000000000000000000000000000000002',
            isDecrease: false,
          },
          {
            address: '0x0000000000000000000000000000000000000003',
            isDecrease: false,
          },
        ],
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(
      () => useTokenTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                tokenScanCache: {
                  '0x1:0x0000000000000000000000000000000000000001': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Warning',
                    },
                  },
                  '0x1:0x0000000000000000000000000000000000000002': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Malicious',
                    },
                  },
                  '0x1:0x0000000000000000000000000000000000000003': {
                    data: {
                      // @ts-expect-error - TokenScanResultType is not exported in PhishingController
                      result_type: 'Malicious',
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current.length).toBe(1);
  });
});
