import { useMemo } from 'react';
import { parseCaipChainId, type CaipChainId } from '@metamask/utils';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses the Earn token map + lending redirect; route-isolation backlog */
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

/** The Earn token map is keyed by decimal chain id — the `eip155` reference. */
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
 * underlying token (USDC, not the aToken) to its Earn map entry and reopens the
 * earn deposit flow with it.
 *
 * `EarnInputView` dereferences `earnToken.experience` unguarded, so it needs the
 * resolved `EarnTokenDetails`, not the activity item's skeleton token. Tokens
 * the map doesn't expose as stablecoin lending resolve to `undefined` and the
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

    const address = getActivityTokenAddress(token);
    if (!chainKey || !address) {
      return undefined;
    }

    const candidate =
      earnTokensByChainIdAndAddress?.[chainKey]?.[address.toLowerCase()];
    return candidate?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING
      ? candidate
      : undefined;
  }, [earnTokensByChainIdAndAddress, fallbackCaipChainId, token]);
  const onLendAgain = useStablecoinLendingRedirect({
    asset: earnToken,
    location: EVENT_LOCATIONS.ACTIVITY_DETAILS,
  });

  return { canLendAgain: Boolean(earnToken), onLendAgain };
}
