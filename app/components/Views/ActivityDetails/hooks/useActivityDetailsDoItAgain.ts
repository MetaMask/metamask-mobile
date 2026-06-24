import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import Routes from '../../../../constants/navigation/Routes';
import { BridgeViewMode } from '../../../UI/Bridge/types';
import {
  getHumanReadableTokenAmount,
  type TokenAmount,
} from '../../../../util/activity-adapters';
import { toBridgeToken } from './activityDetailsDoItAgainUtils';

const ACTIVITY_DETAILS_SOURCE_PAGE = 'ActivityDetails';

export function useActivityDetailsDoItAgain({
  sourceToken,
  destinationToken,
  fallbackChainId,
}: {
  sourceToken?: TokenAmount;
  destinationToken?: TokenAmount;
  fallbackChainId: string;
}) {
  const navigation = useNavigation();
  const sourceBridgeToken = useMemo(
    () => toBridgeToken(sourceToken, fallbackChainId),
    [fallbackChainId, sourceToken],
  );
  const destinationBridgeToken = useMemo(
    () => toBridgeToken(destinationToken, fallbackChainId),
    [destinationToken, fallbackChainId],
  );
  const sourceAmount = useMemo(
    () => (sourceToken ? getHumanReadableTokenAmount(sourceToken) : undefined),
    [sourceToken],
  );
  const sourceChainId = sourceBridgeToken?.chainId;
  const destinationChainId = destinationBridgeToken?.chainId;
  const bridgeViewMode =
    sourceChainId && destinationChainId && sourceChainId !== destinationChainId
      ? BridgeViewMode.Bridge
      : BridgeViewMode.Swap;

  return useCallback(() => {
    if (!sourceBridgeToken) {
      return;
    }

    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params: {
        sourcePage: ACTIVITY_DETAILS_SOURCE_PAGE,
        bridgeViewMode,
        sourceToken: sourceBridgeToken,
        destToken: destinationBridgeToken,
        sourceAmount,
        location: MetaMetricsSwapsEventSource.MainView,
        scrollToTopOnNav: true,
      },
    });
  }, [
    bridgeViewMode,
    destinationBridgeToken,
    navigation,
    sourceAmount,
    sourceBridgeToken,
  ]);
}

export function canRenderActivityDetailsDoItAgain(
  sourceToken: TokenAmount | undefined,
  fallbackChainId: string,
) {
  return Boolean(toBridgeToken(sourceToken, fallbackChainId));
}
