import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectIsPerpsBalanceSelected,
  selectPerpsPayWithToken,
} from '../selectors/perpsController';
import { parsePayWithToken } from '../utils/parsePayWithToken';

/**
 * Returns whether the user selected the synthetic "Perps balance" option.
 * Reads from PerpsController Redux state: selectedPaymentToken === null means Perps balance selected.
 */
export function useIsPerpsBalanceSelected(): boolean {
  return useSelector(selectIsPerpsBalanceSelected);
}

/** Return type matches PerpsSelectedPaymentToken from app/controllers/perps/types */
export function usePerpsPayWithToken(): {
  description?: string;
  address: string;
  chainId: string;
} | null {
  const selectedPaymentToken = useSelector(selectPerpsPayWithToken);
  const parsed = parsePayWithToken(selectedPaymentToken);

  const address = parsed?.address ?? null;
  const chainId = parsed?.chainId ?? null;
  const description = parsed?.description;

  return useMemo(() => {
    if (address === null || chainId === null) return null;
    return {
      address,
      chainId,
      ...(description !== undefined && description !== null && { description }),
    };
  }, [address, chainId, description]);
}
