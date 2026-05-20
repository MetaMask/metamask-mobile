import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectChainId } from '../../../../selectors/networkController';
import Engine from '../../../../core/Engine';
import { formatAccountToCaipAccountId } from '../../Bridge/hooks/useRewards/useRewards';

/**
 * Derives the selected account's CAIP-10 ID and fetches its VIP tier from
 * the RewardsController.
 *
 * @returns The numeric VIP tier (`null` while loading, on error, or when the
 * account has no VIP tier).
 */
export function useVipTier(): number | null {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const chainId = useSelector(selectChainId);

  const accountId = useMemo(
    () =>
      selectedAddress
        ? formatAccountToCaipAccountId(selectedAddress, chainId)
        : null,
    [selectedAddress, chainId],
  );

  const [vipTier, setVipTier] = useState<number | null>(null);

  useEffect(() => {
    if (!accountId) {
      setVipTier(null);
      return;
    }

    Engine.context.RewardsController.getVipTierForAccount(accountId)
      .then((result) => {
        setVipTier(result);
      })
      .catch((error) => {
        console.warn('Error fetching vip tier:', error);
        setVipTier(null);
      });
  }, [accountId]);

  return vipTier;
}
