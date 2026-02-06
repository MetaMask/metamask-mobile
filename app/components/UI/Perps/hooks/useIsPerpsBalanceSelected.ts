import { useSelector } from 'react-redux';
import { selectIsPerpsBalanceSelected } from '../selectors/perpsController';

/**
 * Returns whether the user selected the synthetic "Perps balance" option.
 * Reads from PerpsController Redux state: selectedPaymentToken === null means Perps balance selected.
 */
export function useIsPerpsBalanceSelected(): boolean {
  return useSelector(selectIsPerpsBalanceSelected);
}
