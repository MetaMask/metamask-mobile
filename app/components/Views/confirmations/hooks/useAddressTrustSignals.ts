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
 * Get the trust signal display state from an address scan result type
 *
 * @param resultType - The result type from the address scan
 * @returns The trust signal display state
 */
function getTrustState(
  resultType: string | undefined,
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
      addressScanResults.map(({ scanResult }) => ({
        state: getTrustState(scanResult?.result_type),
        label: scanResult?.label || null,
      })),
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
