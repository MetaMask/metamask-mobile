import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  CardProviderIds,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { selectCardActiveProviderId } from '../../../../../../selectors/cardController';

/**
 * True when spendingCap is a known numeric value greater than zero.
 * Mirrors ImmersveProvider.isRevokedAllowance (finite && === 0) so Unlink
 * is offered only for an active allowance, never for empty/unknown/garbage caps.
 */
export function hasPositiveSpendingCap(
  spendingCap: string | undefined,
): boolean {
  if (!spendingCap) {
    return false;
  }
  const cap = Number(spendingCap);
  return Number.isFinite(cap) && cap > 0;
}

/**
 * Whether the active Card provider should show Unlink for the current
 * funding allowance. Card Home never branches on the provider itself.
 */
export function useCardRevokeAllowance(
  data: CardHomeData | null | undefined,
): boolean {
  const providerId = useSelector(selectCardActiveProviderId);

  return useMemo(() => {
    if (providerId !== CardProviderIds.Immersve) {
      return false;
    }
    return hasPositiveSpendingCap(data?.primaryFundingAsset?.spendingCap);
  }, [providerId, data?.primaryFundingAsset?.spendingCap]);
}
