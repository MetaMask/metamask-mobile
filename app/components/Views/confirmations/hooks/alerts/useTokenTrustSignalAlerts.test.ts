import { useQueries } from '@tanstack/react-query';
import { TransactionMeta } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { useTokenTrustSignalAlerts } from './useTokenTrustSignalAlerts';
import { Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueries: jest.fn(),
}));

const TEST_TOKEN = '0x1234567890123456789012345678901234567890';

const mockUseQueries = jest.mocked(useQueries);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

function mockScanResults(
  results: ({ result_type: string } | undefined | null)[],
) {
  mockUseQueries.mockReturnValue(
    results.map((data) => ({ data })) as ReturnType<typeof useQueries>,
  );
}

describe('useTokenTrustSignalAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanResults([]);
    mockUseTransactionMetadataRequest.mockReturnValue({
      simulationData: {
        tokenBalanceChanges: [
          {
            address: TEST_TOKEN,
          },
        ],
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);
  });

  it('queries the scan result per incoming token', () => {
    mockScanResults([undefined]);

    renderHookWithProvider(() => useTokenTrustSignalAlerts());

    expect(mockUseQueries).toHaveBeenCalledWith({
      queries: [
        {
          queryKey: ['PhishingDataService:scanToken', 'ethereum', TEST_TOKEN],
          enabled: true,
          staleTime: 0,
          retry: false,
        },
      ],
    });
  });

  it('returns a malicious alert if the token scan result is malicious', () => {
    mockScanResults([{ result_type: 'Malicious' }]);

    const { result } = renderHookWithProvider(() =>
      useTokenTrustSignalAlerts(),
    );

    expect(result.current).toEqual([
      expect.objectContaining({
        key: AlertKeys.TokenTrustSignalMalicious,
        field: RowAlertKey.IncomingTokens,
        severity: Severity.Danger,
        isBlocking: false,
      }),
    ]);
  });

  it('returns a warning alert if the token scan result is a warning', () => {
    mockScanResults([{ result_type: 'Warning' }]);

    const { result } = renderHookWithProvider(() =>
      useTokenTrustSignalAlerts(),
    );

    expect(result.current).toEqual([
      expect.objectContaining({
        key: AlertKeys.TokenTrustSignalWarning,
        field: RowAlertKey.IncomingTokens,
        severity: Severity.Warning,
        isBlocking: false,
      }),
    ]);
  });

  it('prefers the malicious alert when both malicious and warning results exist', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      simulationData: {
        tokenBalanceChanges: [
          { address: TEST_TOKEN },
          { address: '0xabcdef1234567890123456789012345678901234' },
        ],
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);
    mockScanResults([
      { result_type: 'Warning' },
      { result_type: 'Malicious' },
    ]);

    const { result } = renderHookWithProvider(() =>
      useTokenTrustSignalAlerts(),
    );

    expect(result.current).toEqual([
      expect.objectContaining({
        key: AlertKeys.TokenTrustSignalMalicious,
        severity: Severity.Danger,
      }),
    ]);
  });

  it('returns no alerts for benign results', () => {
    mockScanResults([{ result_type: 'Benign' }]);

    const { result } = renderHookWithProvider(() =>
      useTokenTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts when there are no scan results', () => {
    mockScanResults([null]);

    const { result } = renderHookWithProvider(() =>
      useTokenTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts when there is no transaction metadata', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockScanResults([]);

    const { result } = renderHookWithProvider(() =>
      useTokenTrustSignalAlerts(),
    );

    expect(result.current).toEqual([]);
  });

  it('excludes decreasing token balances from the scan', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      simulationData: {
        tokenBalanceChanges: [
          { address: TEST_TOKEN, isDecrease: true },
          { address: '0xabcdef1234567890123456789012345678901234' },
        ],
      },
      chainId: '0x1',
    } as unknown as TransactionMeta);
    mockScanResults([undefined]);

    renderHookWithProvider(() => useTokenTrustSignalAlerts());

    expect(mockUseQueries).toHaveBeenCalledWith({
      queries: [
        {
          queryKey: [
            'PhishingDataService:scanToken',
            'ethereum',
            '0xabcdef1234567890123456789012345678901234',
          ],
          enabled: true,
          staleTime: 0,
          retry: false,
        },
      ],
    });
  });
});
