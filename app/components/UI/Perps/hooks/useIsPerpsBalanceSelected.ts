import { useSelector } from 'react-redux';
import {
  selectIsPerpsBalanceSelected,
  selectPerpsPayWithToken,
} from '../selectors/perpsController';

/**
 * Returns whether the user selected the synthetic "Perps balance" option.
 * Reads from PerpsController Redux state: selectedPaymentToken === null means Perps balance selected.
 */
export function useIsPerpsBalanceSelected(): boolean {
  return useSelector(selectIsPerpsBalanceSelected);
}

export function usePerpsPayWithToken(): {
  description?: string;
  address: string;
  chainId: string;
} | null {
  const selectedPaymentToken = useSelector(selectPerpsPayWithToken);
  if (!selectedPaymentToken) return null;
  if (typeof selectedPaymentToken !== 'object') return null;
  const description = (selectedPaymentToken as { description?: unknown })
    .description;
  const address = (selectedPaymentToken as { address?: unknown }).address;
  const chainId = (selectedPaymentToken as { chainId?: unknown }).chainId;
  if (typeof address !== 'string' || typeof chainId !== 'string') return null;
  return {
    description: typeof description === 'string' ? description : undefined,
    address,
    chainId,
  };
}
