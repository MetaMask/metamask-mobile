import { is, object, optional, string } from '@metamask/superstruct';
import { useSelector } from 'react-redux';
import {
  selectIsPerpsBalanceSelected,
  selectPerpsPayWithToken,
} from '../selectors/perpsController';

/** Schema for pay-with token from PerpsController state (address + chainId required, description optional) */
export const PayWithTokenSchema = object({
  address: string(),
  chainId: string(),
  description: optional(string()),
});

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
  if (!is(selectedPaymentToken, PayWithTokenSchema)) {
    return null;
  }
  return {
    description: selectedPaymentToken.description,
    address: selectedPaymentToken.address,
    chainId: selectedPaymentToken.chainId,
  };
}
