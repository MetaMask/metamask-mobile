import { TransactionMeta } from '@metamask/transaction-controller';
import { SignatureRequest } from '@metamask/signature-controller';
import { useQueries } from '@tanstack/react-query';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useAddressTrustSignalAlerts } from './useAddressTrustSignalAlerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
import { useApproveTransactionData } from '../useApproveTransactionData';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import {
  isRecognizedPermit,
  parseAndNormalizeSignTypedData,
  isPermitRevoke,
} from '../../utils/signature';
import { extractSpenderFromApprovalData } from '../../../../../lib/address-scanning/address-scan-util';

jest.mock('@tanstack/react-query', () => ({
  useQueries: jest.fn(),
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../transactions/useTransferRecipient', () => ({
  useTransferRecipient: jest.fn(),
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
  isPermitRevoke: jest.fn(),
}));

jest.mock('../../../../../lib/address-scanning/address-scan-util', () => ({
  ...jest.requireActual(
    '../../../../../lib/address-scanning/address-scan-util',
  ),
  extractSpenderFromApprovalData: jest.fn(),
}));

describe('useAddressTrustSignalAlerts', () => {
  const mockUseQueries = jest.mocked(useQueries);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  // Scan results served by the mocked PhishingDataService queries, keyed by
  // lowercased address.
  let scanResultsByAddress: Record<
    string,
    { result_type: string } | undefined
  >;

  function setScanResult(address: string, resultType: string): void {
    scanResultsByAddress[address.toLowerCase()] = { result_type: resultType };
  }
  const mockUseTransferRecipient = jest.mocked(useTransferRecipient);
  const mockUseApproveTransactionData = jest.mocked(useApproveTransactionData);
  const mockUseSignatureRequest = jest.mocked(useSignatureRequest);
  const mockIsRecognizedPermit = jest.mocked(isRecognizedPermit);
  const mockParseAndNormalizeSignTypedData = jest.mocked(
    parseAndNormalizeSignTypedData,
  );
  const mockIsPermitRevoke = jest.mocked(isPermitRevoke);
  const mockExtractSpender = jest.mocked(extractSpenderFromApprovalData);

  beforeEach(() => {
    jest.clearAllMocks();
    scanResultsByAddress = {};
    mockUseQueries.mockImplementation(
      (options) =>
        (
          options as unknown as { queries: { queryKey: unknown[] }[] }
        ).queries.map((query) => ({
          data: scanResultsByAddress[String(query.queryKey[2])],
        })) as never,
    );
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);
    mockUseTransferRecipient.mockReturnValue(
      '0x1234567890123456789012345678901234567890',
    );
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
    mockIsPermitRevoke.mockReturnValue(false);
    mockExtractSpender.mockReturnValue(undefined);
  });

  it('returns a malicious alert if the address scan result is Malicious', () => {
    setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current).toEqual([
      {
        key: `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
        field: RowAlertKey.FromToAddress,
        message:
          'Security partners have flagged this address for malicious activity.',
        title: 'Address flagged as high risk',
        severity: Severity.Danger,
        isBlocking: false,
      },
    ]);
  });

  it('returns a warning alert if the address scan result is Warning', () => {
    setScanResult('0x1234567890123456789012345678901234567890', 'Warning');

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current).toEqual([
      {
        key: `${AlertKeys.AddressTrustSignalWarning}_${RowAlertKey.FromToAddress}`,
        field: RowAlertKey.FromToAddress,
        message:
          "Security partners don't have enough reliable history to verify this address.",
        title: 'Limited or mixed address signals',
        severity: Severity.Warning,
        isBlocking: false,
      },
    ]);
  });

  it('returns no alerts if the address scan result is Benign', () => {
    setScanResult('0x1234567890123456789012345678901234567890', 'Benign');

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts if the address scan result does not exist', () => {
    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts if the transaction metadata is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts if chainId is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
      },
    } as unknown as TransactionMeta);

    setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts for transactions with no to address', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {},
      chainId: '0x1',
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns alerts for simple ETH transfers even when revoke loading is true', () => {
    // For simple ETH transfers (no data), useApproveTransactionData returns
    // isLoading: true permanently because there's nothing to parse.
    // Alerts should NOT be suppressed in this case.
    mockUseApproveTransactionData.mockReturnValue({
      isRevoke: false,
      isLoading: true,
    });
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);

    setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].key).toBe(
      `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
    );
  });

  it('returns alerts for simple ETH transfers with 0x data when revoke loading is true', () => {
    mockUseApproveTransactionData.mockReturnValue({
      isRevoke: false,
      isLoading: true,
    });
    mockUseTransactionMetadataRequest.mockReturnValue({
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);

    setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignalAlerts(),
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].key).toBe(
      `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
    );
  });

  describe('revoke operations', () => {
    it('returns no alerts for transaction revoke operations with malicious address', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: true,
        isLoading: false,
      });

      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current).toEqual([]);
    });

    it('returns no alerts for transaction revoke operations with warning address', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: true,
        isLoading: false,
      });

      setScanResult('0x1234567890123456789012345678901234567890', 'Warning');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current).toEqual([]);
    });

    it('returns alerts for non-revoke operations', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: false,
      });

      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });

    it('uses InteractingWith field for contract interactions with approval data', () => {
      const spenderAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: false,
      });
      mockExtractSpender.mockReturnValue(spenderAddress);
      mockUseTransactionMetadataRequest.mockReturnValue({
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          data: '0x095ea7b3',
        },
        chainId: '0x1',
      } as unknown as TransactionMeta);

      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].field).toBe(RowAlertKey.InteractingWith);
    });

    it('uses Spender field when the spender address is malicious', () => {
      const spenderAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: false,
      });
      mockExtractSpender.mockReturnValue(spenderAddress);
      mockUseTransactionMetadataRequest.mockReturnValue({
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          data: '0x095ea7b3',
        },
        chainId: '0x1',
      } as unknown as TransactionMeta);

      setScanResult(spenderAddress, 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].field).toBe(RowAlertKey.Spender);
    });

    it('returns alerts for non-approval contract interactions even when revoke loading is true', () => {
      // For non-approval contract interactions (no extractable spender),
      // useApproveTransactionData may return isLoading: true permanently.
      // Alerts should NOT be suppressed in this case.
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: true,
      });
      mockExtractSpender.mockReturnValue(undefined);
      mockUseTransferRecipient.mockReturnValue(
        '0x1234567890123456789012345678901234567890',
      );
      mockUseTransactionMetadataRequest.mockReturnValue({
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          data: '0xef5cfb8c000000000000000000000000',
        },
        chainId: '0x1',
      } as unknown as TransactionMeta);

      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.InteractingWith}`,
      );
      expect(result.current[0].field).toBe(RowAlertKey.InteractingWith);
    });

    it('uses InteractingWith field for contract interactions with data but no spender', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: false,
      });
      mockExtractSpender.mockReturnValue(undefined);
      mockUseTransferRecipient.mockReturnValue(
        '0x1234567890123456789012345678901234567890',
      );
      mockUseTransactionMetadataRequest.mockReturnValue({
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          data: '0xef5cfb8c000000000000000000000000',
        },
        chainId: '0x1',
      } as unknown as TransactionMeta);

      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].field).toBe(RowAlertKey.InteractingWith);
    });

    it('uses FromToAddress field for simple transfers without data', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: false,
      });

      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].field).toBe(RowAlertKey.FromToAddress);
    });

    it('uses FromToAddress field for token transfers with malicious recipient', () => {
      const tokenContract = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const maliciousRecipient = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

      mockUseTransactionMetadataRequest.mockReturnValue({
        txParams: {
          to: tokenContract,
          data: '0xa9059cbb', // transfer() selector — spender extraction returns nothing
        },
        chainId: '0x1',
      } as unknown as TransactionMeta);
      // The transfer recipient differs from txParams.to
      mockUseTransferRecipient.mockReturnValue(maliciousRecipient);

      setScanResult(maliciousRecipient, 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].field).toBe(RowAlertKey.FromToAddress);
    });

    it('returns no alerts while revoke detection is loading for approval transactions', () => {
      const spenderAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: true,
      });
      // Must have a spender for isRevokeLoading to gate alerts
      mockExtractSpender.mockReturnValue(spenderAddress);
      mockUseTransactionMetadataRequest.mockReturnValue({
        txParams: {
          to: '0x1234567890123456789012345678901234567890',
          data: '0x095ea7b3000000000000000000000000abcdef1234567890abcdef12345678901234567800000000000000000000000000000000000000000000000000000000000f4240',
        },
        chainId: '0x1',
      } as unknown as TransactionMeta);

      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
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

    const setMaliciousAddressScanResult = () =>
      setScanResult('0x1234567890123456789012345678901234567890', 'Malicious');

    it('suppresses alerts when the permit is classified as a revoke', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xTokenAddress' },
        message: { value: '0' },
      });
      mockIsPermitRevoke.mockReturnValue(true);

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current).toEqual([]);
    });

    it('forwards the parsed types and primaryType to isPermitRevoke', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      const parsed = {
        domain: { verifyingContract: '0xTokenAddress' },
        message: { allowed: false, value: '0' },
        types: { Permit: [{ name: 'value', type: 'uint256' }] },
        primaryType: 'Permit',
      };
      mockParseAndNormalizeSignTypedData.mockReturnValue(parsed);

      setMaliciousAddressScanResult();

      renderHookWithProvider(() => useAddressTrustSignalAlerts());

      expect(mockIsPermitRevoke).toHaveBeenCalledWith(
        '0xTokenAddress',
        false,
        '0',
        parsed.types,
        'Permit',
      );
    });

    it('does not suppress alerts for a Permit2 PermitBatch with an injected "value": "0" sibling', () => {
      mockIsPermitRevoke.mockImplementation(
        jest.requireActual('../../utils/signature').isPermitRevoke,
      );
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: {
          verifyingContract: '0x000000000022d473030f116ddee9f6b43ac78ba3',
        },
        message: {
          details: [
            {
              token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              amount: '1461501637330902918203684832716283019655932542975',
            },
          ],
          spender: '0x4444444444444444444444444444444444444444',
          // Injected sibling not declared in PermitBatch.
          value: '0',
        },
        types: {
          PermitBatch: [
            { name: 'details', type: 'PermitDetails[]' },
            { name: 'spender', type: 'address' },
            { name: 'sigDeadline', type: 'uint256' },
          ],
        },
        primaryType: 'PermitBatch',
      });

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });

    it('returns alerts for permit signature with non-zero value', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xTokenAddress' },
        message: { value: '1000000' },
      });

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });

    it('returns alerts for NFT permit with tokenId (not treated as ERC20 revoke)', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xNFTAddress' },
        message: { tokenId: '0', value: '0' },
      });

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });

    it('returns alerts for NFT permit with tokenId as number 0', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockReturnValue({
        domain: { verifyingContract: '0xNFTAddress' },
        message: { tokenId: 0, value: '0' },
      });

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });

    it('returns alerts for non-permit signature', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(false);

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });

    it('returns alerts when signature request messageParams data is missing', () => {
      mockUseSignatureRequest.mockReturnValue({
        messageParams: {},
      } as unknown as SignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });

    it('returns alerts when parseAndNormalizeSignTypedData throws', () => {
      mockUseSignatureRequest.mockReturnValue(mockSignatureRequest);
      mockIsRecognizedPermit.mockReturnValue(true);
      mockParseAndNormalizeSignTypedData.mockImplementation(() => {
        throw new Error('Parse error');
      });

      setMaliciousAddressScanResult();

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignalAlerts(),
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].key).toBe(
        `${AlertKeys.AddressTrustSignalMalicious}_${RowAlertKey.FromToAddress}`,
      );
    });
  });
});
