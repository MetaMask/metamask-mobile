import { TransactionMeta } from '@metamask/transaction-controller';
import { SignatureRequest } from '@metamask/signature-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useAddressTrustSignalAlerts } from './useAddressTrustSignalAlerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../useApproveTransactionData';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import {
  isRecognizedPermit,
  parseAndNormalizeSignTypedData,
  isPermitDaiRevoke,
} from '../../utils/signature';

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../useApproveTransactionData', () => ({
  useApproveTransactionData: jest.fn(),
}));

jest.mock('../signatures/useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

jest.mock('../../utils/signature', () => ({
  isRecognizedPermit: jest.fn(),
  parseAndNormalizeSignTypedData: jest.fn(),
  isPermitDaiRevoke: jest.fn(),
}));

describe('useAddressTrustSignalAlerts', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseApproveTransactionData = jest.mocked(useApproveTransactionData);
  const mockUseSignatureRequest = jest.mocked(useSignatureRequest);
  const mockIsRecognizedPermit = jest.mocked(isRecognizedPermit);
  const mockParseAndNormalizeSignTypedData = jest.mocked(
    parseAndNormalizeSignTypedData,
  );
  const mockIsPermitDaiRevoke = jest.mocked(isPermitDaiRevoke);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);
    mockUseApproveTransactionData.mockReturnValue({
      isRevoke: false,
      isLoading: false,
    });
    mockUseSignatureRequest.mockReturnValue(undefined);
    mockIsRecognizedPermit.mockReturnValue(false);
    mockParseAndNormalizeSignTypedData.mockReturnValue({
      domain: { verifyingContract: '0x0' },
      message: {},
    });
    mockIsPermitDaiRevoke.mockReturnValue(false);
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
        title: 'Address needs review',
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

  describe('revoke operations', () => {
    it('returns no alerts for transaction revoke operations with malicious address', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: true,
        isLoading: false,
      });

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

    it('returns no alerts for transaction revoke operations with warning address', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: true,
        isLoading: false,
      });

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

      expect(result.current).toEqual([]);
    });

    it('returns alerts for non-revoke operations', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: false,
      });

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

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(AlertKeys.AddressTrustSignalMalicious);
    });

    it('returns no alerts while revoke detection is loading', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: true,
      });

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
  });

  describe('signature revoke detection', () => {
    const mockSignatureRequest = {
      messageParams: {
        data: '{"domain":{},"message":{}}',
      },
    } as unknown as SignatureRequest;

    const createMaliciousAddressState = () =>
      ({
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                addressScanCache: {
                  '0x1:0x1234567890123456789012345678901234567890': {
                    data: {
                      result_type: 'Malicious',
                    },
                  },
                },
              },
            },
          },
        },
      }) as Parameters<typeof renderHookWithProvider>[1];

    it('returns no alerts for permit signature with value "0" (string)', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xTokenAddress' },
        message: { value: '0' },
      });

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current).toEqual([]);
    });

    it('returns no alerts for permit signature with value 0 (number)', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xTokenAddress' },
        message: { value: 0 },
      });

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current).toEqual([]);
    });

    it('returns no alerts for DAI permit with allowed: false', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xDAIAddress' },
        message: { allowed: false, value: '100' },
      });
      mockIsPermitDaiRevoke.mockReturnValue(true);

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current).toEqual([]);
    });

    it('returns alerts for permit signature with non-zero value', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xTokenAddress' },
        message: { value: '1000000' },
      });

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(AlertKeys.AddressTrustSignalMalicious);
    });

    it('returns alerts for NFT permit with tokenId (not treated as ERC20 revoke)', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xNFTAddress' },
        message: { tokenId: '0', value: '0' },
      });

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(AlertKeys.AddressTrustSignalMalicious);
    });

    it('returns alerts for NFT permit with tokenId as number 0', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xNFTAddress' },
        message: { tokenId: 0, value: '0' },
      });

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(AlertKeys.AddressTrustSignalMalicious);
    });

    it('returns alerts for non-permit signature', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(false);

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(AlertKeys.AddressTrustSignalMalicious);
    });

    it('returns alerts when signature request messageParams data is missing', () => {
      mockUseSignatureRequest.mockReturnValue({
        messageParams: {},
      } as unknown as SignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(AlertKeys.AddressTrustSignalMalicious);
    });

    it('returns alerts when parseAndNormalizeSignTypedData throws', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignalAlerts(),
        createMaliciousAddressState(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(AlertKeys.AddressTrustSignalMalicious);
    });
  });
});
