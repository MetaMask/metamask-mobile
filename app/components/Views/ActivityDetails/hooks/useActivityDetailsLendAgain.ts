import { useMemo } from 'react';
import { parseCaipChainId, type CaipChainId } from '@metamask/utils';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses the Earn token map + lending redirect so "lend again" reopens the earn flow; route-isolation backlog */
import { EVENT_LOCATIONS } from '../../../UI/Earn/constants/events/earnEvents';
import { EARN_EXPERIENCES } from '../../../UI/Earn/constants/experiences';
import useEarnTokens from '../../../UI/Earn/hooks/useEarnTokens';
import { useStablecoinLendingRedirect } from '../../../UI/Earn/hooks/useStablecoinLendingRedirect';
/* eslint-enable import-x/no-restricted-paths */
import type { TokenAmount } from '../../../../util/activity-adapters';
import {
  getActivityTokenAddress,
  getActivityTokenCaipChainId,
} from './activityDetailsDoItAgainUtils';

/**
 * The Earn token map is keyed by decimal chain id, which for EVM is exactly the
 * `eip155` reference. Returns undefined for non-EVM chains, which have no
 * lending markets.
 */
function toEarnMapChainKey(caipChainId: CaipChainId): string | undefined {
  try {
    const { namespace, reference } = parseCaipChainId(caipChainId);
    return namespace === 'eip155' ? reference : undefined;
  } catch {
    return undefined;
  }
}

/**
 * "Lend again" CTA for lending-deposit details: resolves the deposited
 * underlying token (e.g. USDC, not the aToken) against the live Earn token map
 * and reopens the earn deposit flow seeded with it.
 *
 * The resolved `EarnTokenDetails` — not the activity item's skeleton token — is
 * what gets handed to `EarnInputView`, because that screen looks the token up in
 * the same map and dereferences `earnToken.experience` unguarded. Anything the
 * map doesn't currently expose as a stablecoin-lending token (feature flag off,
 * market delisted, unsupported chain, non-EVM) resolves to `undefined` and the
 * caller hides the CTA rather than navigating into a crash.
 */
export function useActivityDetailsLendAgain({
  token,
  fallbackCaipChainId,
}: {
  token?: TokenAmount;
  fallbackCaipChainId: CaipChainId;
}) {
  const { earnTokensByChainIdAndAddress } = useEarnTokens();

  const earnToken = useMemo(() => {
    const chainKey = toEarnMapChainKey(
      getActivityTokenCaipChainId(token, fallbackCaipChainId),
    );
    // Lending is ERC-20 only, so a missing contract address (native asset)
    // can never resolve to a lendable token.
    const address = getActivityTokenAddress(token);
    if (!chainKey || !address) {
      return undefined;
    }

    const candidate =
      earnTokensByChainIdAndAddress?.[chainKey]?.[address.toLowerCase()];

    // Mirrors the branch `EarnInputView` itself takes: only a primary
    // stablecoin-lending experience lands in the lending flow. A pooled-staking
    // token would silently fall through to the staking path instead.
    return candidate?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING
      ? candidate
      : undefined;
  }, [earnTokensByChainIdAndAddress, fallbackCaipChainId, token]);

  // Switches to the token's network, emits the earn CTA analytics, then opens
  // the deposit input view. No-ops while `earnToken` is undefined.
  const onLendAgain = useStablecoinLendingRedirect({
    asset: earnToken,
    location: EVENT_LOCATIONS.ACTIVITY_DETAILS,
  });

  return { canLendAgain: Boolean(earnToken), onLendAgain };
}
