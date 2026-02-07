import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectMultipleAddressScanResults } from '../../../../selectors/phishingController';
import { RootState } from '../../../../reducers';
import {
  TrustSignalDisplayState,
  TrustSignalResult,
  AddressScanResultType,
  AddressTrustSignalRequest,
} from '../types/trustSignals';

/**
 * Get the trust signal display state from an address scan result type.
 *
 * When the result type is Benign and a label is present, we consider
 * the address as Verified. This aligns with the extension's behavior
 * where labeled benign addresses are shown as verified.
 *
 * @param resultType - The result type from the address scan
 * @param label - Optional label from the scan result
 * @returns The trust signal display state
 */
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
    case AddressScanResultType.Benign:
      // Benign with label = Verified, without = Unknown
      return label
        ? TrustSignalDisplayState.Verified
        : TrustSignalDisplayState.Unknown;
    default:
      return TrustSignalDisplayState.Unknown;
  }
}

/**
 * Hook to get trust signals for multiple addresses.
 *
 * @param requests - Array of address trust signal requests
 * @returns Array of trust signal results
 */
export function useAddressTrustSignals(
  requests: AddressTrustSignalRequest[],
): TrustSignalResult[] {
  const addressScanResults = useSelector((state: RootState) =>
    selectMultipleAddressScanResults(state, { addresses: requests }),
  );

  return useMemo(
    () =>
      addressScanResults.map(({ scanResult }) => {
        const label = scanResult?.label || null;
        return {
          state: getTrustState(scanResult?.result_type, label),
          label,
        };
      }),
    [addressScanResults],
  );
}

/**
 * Hook to get trust signal for a single address.
 *
 * @param address - The address to check
 * @param chainId - The chain ID
 * @returns Trust signal result with state and label
 */
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
