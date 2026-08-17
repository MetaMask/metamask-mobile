import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  AddressScanResult,
  resolveChainName,
} from '@metamask/phishing-controller';
import {
  TrustSignalDisplayState,
  TrustSignalResult,
  AddressScanResultType,
  AddressTrustSignalRequest,
} from '../types/trustSignals';

// Benign + label = Verified (matches extension behavior)
function getTrustState(
  resultType: string | undefined,
  label: string | null | undefined,
): TrustSignalDisplayState {
  if (!resultType) {
    return TrustSignalDisplayState.Unknown;
  }

  switch (resultType) {
    case AddressScanResultType.Malicious:
      return TrustSignalDisplayState.Malicious;
    case AddressScanResultType.Warning:
      return TrustSignalDisplayState.Warning;
    case AddressScanResultType.Loading:
      return TrustSignalDisplayState.Loading;
    case AddressScanResultType.Trusted:
      return TrustSignalDisplayState.Verified;
    case AddressScanResultType.Benign:
      return label
        ? TrustSignalDisplayState.Verified
        : TrustSignalDisplayState.Unknown;
    default:
      return TrustSignalDisplayState.Unknown;
  }
}

export function useAddressTrustSignals(
  requests: AddressTrustSignalRequest[],
): TrustSignalResult[] {
  const queries = useMemo(
    () =>
      requests.map(({ address, chainId }) => {
        const chain = chainId
          ? resolveChainName(String(chainId).toLowerCase())
          : undefined;
        return {
          queryKey: [
            'PhishingDataService:scanAddress',
            chain ?? '',
            address?.toLowerCase() ?? '',
          ],
          enabled: Boolean(address && chain),
          staleTime: 0,
          retry: false,
        };
      }),
    [requests],
  );

  const scanResults = useQueries({ queries });

  return useMemo(
    () =>
      scanResults.map(({ data }) => {
        const scanResult = data as AddressScanResult | undefined;
        const label = scanResult?.label || null;
        return {
          state: getTrustState(scanResult?.result_type, label),
          label,
        };
      }),
    [scanResults],
  );
}

export function useAddressTrustSignal(
  address: string,
  chainId: string,
): TrustSignalResult {
  const requests = useMemo(() => {
    if (!address || !chainId) {
      return [];
    }
    return [{ address, chainId }];
  }, [address, chainId]);

  const results = useAddressTrustSignals(requests);

  return (
    results[0] || {
      state: TrustSignalDisplayState.Unknown,
      label: null,
    }
  );
}
