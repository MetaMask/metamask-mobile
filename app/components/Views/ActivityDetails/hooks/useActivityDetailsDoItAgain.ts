import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  formatChainIdToCaip,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import { areAddressesEqual } from '../../../../util/address';
import { type BridgeToken, BridgeViewMode } from '../../../UI/Bridge/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuses the Bridge token-balance list to hydrate "swap again"; route-isolation backlog
import { useTokensWithBalance } from '../../../UI/Bridge/hooks/useTokensWithBalance';
import type { TokenAmount } from '../../../../util/activity-adapters';
import { toBridgeToken } from './activityDetailsDoItAgainUtils';

const ACTIVITY_DETAILS_SOURCE_PAGE = 'ActivityDetails';

/**
 * Replaces a skeleton bridge token (address/symbol/decimals/chainId only, from
 * {@link toBridgeToken}) with the user's held token of the same address + chain,
 * so the swap view opens with a real icon, balance, and fiat value instead of a
 * hollow placeholder that reads "Insufficient funds". Falls back to the skeleton
 * when the token isn't held (e.g. a fully-spent source).
 */
function hydrateFromHeldTokens(
  token: BridgeToken | undefined,
  heldTokens: BridgeToken[],
): BridgeToken | undefined {
  if (!token) {
    return undefined;
  }
  const match = heldTokens.find(
    (held) =>
      areAddressesEqual(held.address, token.address) &&
      formatChainIdToCaip(held.chainId) === formatChainIdToCaip(token.chainId),
  );
  return match ?? token;
}

export function useActivityDetailsDoItAgain({
  sourceToken,
  destinationToken,
  fallbackCaipChainId,
}: {
  sourceToken?: TokenAmount;
  destinationToken?: TokenAmount;
  fallbackCaipChainId: CaipChainId;
}) {
  const navigation = useNavigation();
  const sourceBridgeToken = useMemo(
    () => toBridgeToken(sourceToken, fallbackCaipChainId),
    [fallbackCaipChainId, sourceToken],
  );
  const destinationBridgeToken = useMemo(
    () => toBridgeToken(destinationToken, fallbackCaipChainId),
    [destinationToken, fallbackCaipChainId],
  );
  const sourceChainId = sourceBridgeToken?.chainId;
  const destinationChainId = destinationBridgeToken?.chainId;
  const bridgeViewMode =
    sourceChainId && destinationChainId && sourceChainId !== destinationChainId
      ? BridgeViewMode.Bridge
      : BridgeViewMode.Swap;

  // The swap view uses the passed tokens as-is (no balance/icon lookup), so
  // hydrate them from the user's holdings before navigating. Right after a swap
  // the user holds both legs, so both resolve to real tokens.
  const chainIds = useMemo(() => {
    const ids: (Hex | CaipChainId)[] = [];
    if (sourceChainId) {
      ids.push(sourceChainId);
    }
    if (destinationChainId && destinationChainId !== sourceChainId) {
      ids.push(destinationChainId);
    }
    return ids;
  }, [sourceChainId, destinationChainId]);
  const heldTokens = useTokensWithBalance({ chainIds });
  const hydratedSourceToken = useMemo(
    () => hydrateFromHeldTokens(sourceBridgeToken, heldTokens),
    [sourceBridgeToken, heldTokens],
  );
  const hydratedDestinationToken = useMemo(
    () => hydrateFromHeldTokens(destinationBridgeToken, heldTokens),
    [destinationBridgeToken, heldTokens],
  );

  return useCallback(() => {
    if (!hydratedSourceToken) {
      return;
    }

    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params: {
        sourcePage: ACTIVITY_DETAILS_SOURCE_PAGE,
        bridgeViewMode,
        sourceToken: hydratedSourceToken,
        destToken: hydratedDestinationToken,
        // No sourceAmount: "swap again" opens with an empty amount so the user
        // enters a fresh value instead of reusing the original swap's amount.
        location: MetaMetricsSwapsEventSource.MainView,
        scrollToTopOnNav: true,
      },
    });
  }, [
    bridgeViewMode,
    hydratedDestinationToken,
    navigation,
    hydratedSourceToken,
  ]);
}

export function canRenderActivityDetailsDoItAgain(
  sourceToken: TokenAmount | undefined,
  fallbackCaipChainId: CaipChainId,
) {
  return Boolean(toBridgeToken(sourceToken, fallbackCaipChainId));
}
