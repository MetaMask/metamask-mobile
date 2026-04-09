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
