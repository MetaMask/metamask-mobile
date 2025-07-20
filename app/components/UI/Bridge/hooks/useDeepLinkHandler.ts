import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouteProp } from '@react-navigation/native';
import { BridgeViewMode } from '../types';
import {
  setSourceToken,
  setDestToken,
  setSourceAmount,
  setBridgeViewMode,
  selectSourceToken,
  selectIsUnifiedSwapsEnabled,
} from '../../../../core/redux/slices/bridge';
import { BridgeRouteParams } from '../Views/BridgeView';
import { useSwitchNetworks } from '../../../Views/NetworkSelector/useSwitchNetworks';
import {
  selectChainId,
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../selectors/networkController';
import { SolScope } from '@metamask/keyring-api';
import type { Hex } from '@metamask/utils';

interface UseDeepLinkHandlerProps {
  route: RouteProp<{ params: BridgeRouteParams }, 'params'>;
}

interface UseDeepLinkHandlerReturn {
  isDeepLink: boolean;
}

/**
 * Hook to handle deep link parameters for bridge functionality
 * Balance fetching is now handled in handleSwapUrl function
 */
export const useDeepLinkHandler = ({
  route,
}: UseDeepLinkHandlerProps): UseDeepLinkHandlerReturn => {
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const isUnifiedSwapsEnabled = useSelector(selectIsUnifiedSwapsEnabled);
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const [isDeepLink, setIsDeepLink] = useState(false);

  // Use the multichain-aware chain ID selector for comparison
  const selectedChainId = useSelector(selectChainId);
  // Use EVM chain ID for useSwitchNetworks (which expects Hex type)
  const selectedEvmChainId = useSelector(selectEvmChainId);

  const {
    onSetRpcTarget,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  } = useSwitchNetworks({
    domainIsConnectedDapp: false,
    selectedChainId: selectedEvmChainId,
    selectedNetworkName: '',
  });

  useEffect(() => {
    const {
      sourcePage,
      sourceToken: routeSourceToken,
      destToken: routeDestToken,
      sourceAmount,
    } = route.params || {};

    // Check if this is a deep link
    const isFromDeepLink = sourcePage === 'deeplink';
    setIsDeepLink(isFromDeepLink);

    if (!isFromDeepLink) {
      return;
    }

    // Set bridge view mode for unified swaps
    if (isUnifiedSwapsEnabled) {
      dispatch(setBridgeViewMode(BridgeViewMode.Unified));
    }

    // Set source token if provided and different from current
    if (
      routeSourceToken &&
      (!sourceToken || sourceToken.address !== routeSourceToken.address)
    ) {
      dispatch(setSourceToken(routeSourceToken));
    }

    // Set destination token if provided
    if (routeDestToken) {
      dispatch(setDestToken(routeDestToken));
    }

    // Set source amount if provided
    if (sourceAmount) {
      dispatch(setSourceAmount(sourceAmount));
    }

    // Change network if source token chain ID differs from selected chain ID
    if (
      routeSourceToken?.chainId &&
      routeSourceToken.chainId !== selectedChainId
    ) {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (routeSourceToken.chainId === SolScope.Mainnet) {
        onNonEvmNetworkChange(routeSourceToken.chainId);
      }
      ///: END:ONLY_INCLUDE_IF

      onSetRpcTarget(evmNetworkConfigurations[routeSourceToken.chainId as Hex]);
    }
  }, [
    route.params,
    dispatch,
    sourceToken,
    isUnifiedSwapsEnabled,
    selectedChainId,
    onSetRpcTarget,
    onNonEvmNetworkChange,
    evmNetworkConfigurations,
  ]);

  return { isDeepLink };
};
