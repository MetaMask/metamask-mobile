import { useQueries } from '@tanstack/react-query';

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  useAddressTrustSignals,
  useAddressTrustSignal,
} from './useAddressTrustSignals';
import {
  TrustSignalDisplayState,
  AddressScanResultType,
} from '../types/trustSignals';

jest.mock('@tanstack/react-query', () => ({
  useQueries: jest.fn(),
}));

const mockUseQueries = jest.mocked(useQueries);

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

function mockScanResults(
  results: ({ result_type: string; label?: string } | undefined)[],
) {
  mockUseQueries.mockReturnValue(
    results.map((data) => ({ data })) as ReturnType<typeof useQueries>,
  );
}

describe('useAddressTrustSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanResults([]);
  });

  it.each([
    [AddressScanResultType.Malicious, '', TrustSignalDisplayState.Malicious],
    [AddressScanResultType.Warning, '', TrustSignalDisplayState.Warning],
    [
      AddressScanResultType.Benign,
      'Coinbase',
      TrustSignalDisplayState.Verified,
    ],
    [AddressScanResultType.Benign, '', TrustSignalDisplayState.Unknown],
  ])(
    'returns %s result with label "%s" as %s state',
    (resultType, label, expectedState) => {
      mockScanResults([{ result_type: resultType, label }]);

      const { result } = renderHookWithProvider(() =>
        useAddressTrustSignals([{ address: TEST_ADDRESS, chainId: '0x1' }]),
      );

      expect(result.current).toEqual([
        {
          state: expectedState,
          label: label || null,
        },
      ]);
    },
  );

  it('queries the scan result per address using the resolved chain name', () => {
    mockScanResults([undefined]);

    renderHookWithProvider(() =>
      useAddressTrustSignals([{ address: TEST_ADDRESS, chainId: '0x1' }]),
    );

    expect(mockUseQueries).toHaveBeenCalledWith({
      queries: [
        {
          queryKey: [
            'PhishingDataService:scanAddress',
            'ethereum',
            TEST_ADDRESS,
          ],
          enabled: true,
          staleTime: 0,
          retry: false,
        },
      ],
    });
  });

  it('disables the query for unknown chains', () => {
    mockScanResults([undefined]);

    renderHookWithProvider(() =>
      useAddressTrustSignals([{ address: TEST_ADDRESS, chainId: '0x999' }]),
    );

    expect(mockUseQueries).toHaveBeenCalledWith({
      queries: [
        {
          queryKey: ['PhishingDataService:scanAddress', '', TEST_ADDRESS],
          enabled: false,
          staleTime: 0,
          retry: false,
        },
      ],
    });
  });

  it('returns Unknown state when there is no scan result', () => {
    mockScanResults([undefined]);

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignals([{ address: TEST_ADDRESS, chainId: '0x1' }]),
    );

    expect(result.current).toEqual([
      {
        state: TrustSignalDisplayState.Unknown,
        label: null,
      },
    ]);
  });

  it('returns an empty array for empty requests', () => {
    const { result } = renderHookWithProvider(() => useAddressTrustSignals([]));

    expect(result.current).toEqual([]);
  });
});

describe('useAddressTrustSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the trust signal for a single address', () => {
    mockScanResults([
      { result_type: AddressScanResultType.Malicious, label: '' },
    ]);

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignal(TEST_ADDRESS, '0x1'),
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Malicious,
      label: null,
    });
  });

  it('returns Unknown state when address is empty', () => {
    mockScanResults([]);

    const { result } = renderHookWithProvider(() =>
      useAddressTrustSignal('', '0x1'),
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });
});
