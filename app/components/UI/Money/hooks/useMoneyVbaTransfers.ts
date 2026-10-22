import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { VbaTransfersResponse } from '@metamask/money-account-api-data-service';
import type { UseQueryResult } from '@tanstack/react-query';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import {
  selectMoneyVbaCompletedActivityEnabled,
  selectMoneyVbaPendingActivityEnabled,
} from '../selectors/featureFlags';

/**
 * Reads the current VBA transfers for the active Money Account wallet.
 * The data service handles SIWE authentication; this hook passes only the
 * selected wallet address and never handles the resulting session token.
 *
 * @returns The wallet-scoped transfers query.
 */
export function useMoneyVbaTransfers(): UseQueryResult<VbaTransfersResponse> {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const completedActivityEnabled = useSelector(
    selectMoneyVbaCompletedActivityEnabled,
  );
  const pendingActivityEnabled = useSelector(
    selectMoneyVbaPendingActivityEnabled,
  );
  const address = primaryMoneyAccount?.address;
  const normalizedAddress = address?.toLowerCase() ?? '';

  return useQuery<VbaTransfersResponse>({
    queryKey: [
      MoneyAccountApiDataServiceQueryKeys.FETCH_VBA_TRANSFERS,
      { address: normalizedAddress },
    ],
    enabled:
      Boolean(address) && (completedActivityEnabled || pendingActivityEnabled),
  }) as UseQueryResult<VbaTransfersResponse>;
}
