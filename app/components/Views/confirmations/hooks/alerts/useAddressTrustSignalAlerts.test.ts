import { TransactionMeta } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useAddressTrustSignalAlerts } from './useAddressTrustSignalAlerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('useAddressTrustSignalAlerts', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);
  });

  it('returns a malicious alert if the address scan result is Malicious', () => {
    const { result } = renderHookWithProvider(
      () => useAddressTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - AddressScanResultType is not exported in PhishingController
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
        key: AlertKeys.AddressTrustSignalMalicious,
        field: RowAlertKey.InteractingWith,
        message:
          'If you confirm this request, you will probably lose your assets to a scammer.',
        title: 'Malicious address',
        severity: Severity.Danger,
        isBlocking: false,
      },
    ]);
  });

  it('returns a warning alert if the address scan result is Warning', () => {
    const { result } = renderHookWithProvider(
      () => useAddressTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - AddressScanResultType is not exported in PhishingController
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
        key: AlertKeys.AddressTrustSignalWarning,
        field: RowAlertKey.InteractingWith,
        message:
          "We can't verify this address. It may be new or unverified. Only continue if you trust the source.",
        title: 'Address Needs Review',
        severity: Severity.Warning,
        isBlocking: false,
      },
    ]);
  });

  it('returns no alerts if the address scan result is Benign', () => {
    const { result } = renderHookWithProvider(
      () => useAddressTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - AddressScanResultType is not exported in PhishingController
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

  it('returns no alerts if the address scan result does not exist', () => {
    const { result } = renderHookWithProvider(
      () => useAddressTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {},
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
      () => useAddressTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - AddressScanResultType is not exported in PhishingController
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

    expect(result.current).toEqual([]);
  });

  it('returns no alerts if chainId is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
      },
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(
      () => useAddressTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      // @ts-expect-error - AddressScanResultType is not exported in PhishingController
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

    expect(result.current).toEqual([]);
  });

  it('returns no alerts for transactions with no to address', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {},
      chainId: '0x1',
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(
      () => useAddressTrustSignalAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {},
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual([]);
  });
});
