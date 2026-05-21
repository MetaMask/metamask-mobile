import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import Engine from '../../../../core/Engine';
import {
  parseCaipChainId,
  toCaipAccountId,
  type CaipAccountId,
} from '@metamask/utils';

/**
 * Derives the selected account's CAIP-10 ID and fetches its VIP tier from
 * the RewardsController.
 *
 * @returns The numeric VIP tier (`null` while loading, on error, or when the
 * account has no VIP tier).
 */
export function useVipTier(): number | null {
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const accountId: CaipAccountId | null = useMemo(() => {
    if (!selectedAccount) return null;
    try {
      const [scope] = selectedAccount.scopes;
      const { namespace, reference } = parseCaipChainId(scope);
      return toCaipAccountId(namespace, reference, selectedAccount.address);
    } catch {
      return null;
    }
  }, [selectedAccount]);

  const [vipTier, setVipTier] = useState<number | null>(null);

  useEffect(() => {
    if (!accountId) {
      setVipTier(null);
      return;
    }

    let cancelled = false;
    setVipTier(null);

    Engine.context.RewardsController.getVipTierForAccount(accountId)
      .then((result) => {
        if (!cancelled) setVipTier(result);
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('Error fetching vip tier:', error);
          setVipTier(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return vipTier;
}
