import { createDeepEqualSelector } from './util';
import { RootState } from '../reducers';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';

// Empty array constant to avoid creating new references
const EMPTY_WITHDRAWAL_REQUESTS: {
  id: string;
  amount: string;
  asset: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  success: boolean;
  txHash?: string;
  errorMessage?: string;
  accountAddress?: string;
  transactionId?: string;
}[] = [];

/**
 * Selects the PerpsController state from the root state.
 * @param state - The root Redux state
 * @returns The PerpsController state or undefined
 */
export const selectPerpsControllerState = (state: RootState) =>
  state.engine?.backgroundState?.PerpsController;

/**
 * Selects all withdrawal requests from PerpsController state.
 * Uses deep equality to prevent unnecessary re-renders.
 */
export const selectAllWithdrawalRequests = createDeepEqualSelector(
  selectPerpsControllerState,
  (perpsState) => perpsState?.withdrawalRequests ?? EMPTY_WITHDRAWAL_REQUESTS,
);

/**
 * Selects the EVM address for the currently selected account.
 * This selector properly extracts the address from the curried selectSelectedInternalAccountByScope selector.
 */
export const selectSelectedEvmAddress = createDeepEqualSelector(
  [(state: RootState) => selectSelectedInternalAccountByScope(state)],
  (getAccountByScope) => getAccountByScope('eip155:1')?.address,
);

/**
 * Selects withdrawal requests filtered by the currently selected account.
 * Returns a stable empty array reference when no address is selected or no matching requests exist.
 * Uses deep equality comparison to prevent unnecessary re-renders.
 */
export const selectWithdrawalRequestsBySelectedAccount =
  createDeepEqualSelector(
    [selectAllWithdrawalRequests, selectSelectedEvmAddress],
    (allWithdrawals, selectedAddress) => {
      // Return stable empty array if no selected address
      if (!selectedAddress) {
        return EMPTY_WITHDRAWAL_REQUESTS;
      }

      const normalizedSelectedAddress = selectedAddress.toLowerCase();

      // Filter by current account
      const filtered = allWithdrawals.filter(
        (req) =>
          req.accountAddress?.toLowerCase() === normalizedSelectedAddress,
      );

      // Return stable empty array if no matching requests
      if (filtered.length === 0) {
        return EMPTY_WITHDRAWAL_REQUESTS;
      }

      return filtered;
    },
  );
