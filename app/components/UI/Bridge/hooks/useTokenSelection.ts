import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  setSourceToken,
  setDestToken,
  selectSourceToken,
  selectDestToken,
  selectDestAmount,
  setIsDestTokenManuallySet,
  setSourceAmount,
} from '../../../../core/redux/slices/bridge';
import { BridgeToken, TokenSelectorType } from '../types';
import { useSwitchTokens } from './useSwitchTokens';
import { useIsNetworkEnabled } from './useIsNetworkEnabled';
import { useAutoUpdateDestToken } from './useAutoUpdateDestToken';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { PopularList } from '../../../../util/networks/customNetworks';

/**
 * Hook to manage token selection logic for Bridge token selector
 * Handles both normal selection and token swapping when selecting the opposite token
 * @param type - Whether this is a source or dest token selector
 */
export const useTokenSelection = (type: TokenSelectorType) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const destAmount = useSelector(selectDestAmount);
  const { handleSwitchTokens } = useSwitchTokens();
  const isDestNetworkEnabled = useIsNetworkEnabled(destToken?.chainId);
  const { autoUpdateDestToken } = useAutoUpdateDestToken();
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const handleTokenPress = useCallback(
    async (token: BridgeToken) => {
      const isSourcePicker = type === TokenSelectorType.Source;
      const otherToken = isSourcePicker ? destToken : sourceToken;

      // Check if the selected token matches the "other" token
      const isSelectingOtherToken =
        otherToken &&
        token.address === otherToken.address &&
        token.chainId === otherToken.chainId;

      // Add the network if the user hasn't configured it yet
      const isNetworkAdded = Boolean(networkConfigurations?.[token.chainId]);
      if (!isNetworkAdded) {
        const popularNetwork = PopularList.find(
          (network) => network.chainId === token.chainId,
        );
        if (popularNetwork) {
          try {
            const hexChainId = toHex(popularNetwork.chainId) as Hex;
            const { blockExplorerUrl } = popularNetwork.rpcPrefs;
            await Engine.context.NetworkController.addNetwork({
              chainId: hexChainId,
              blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
              defaultRpcEndpointIndex: 0,
              defaultBlockExplorerUrlIndex: blockExplorerUrl ? 0 : undefined,
              name: popularNetwork.nickname,
              nativeCurrency: popularNetwork.ticker,
              rpcEndpoints: [
                {
                  url: popularNetwork.rpcUrl,
                  failoverUrls: popularNetwork.failoverRpcUrls,
                  name: popularNetwork.nickname,
                  type: RpcEndpointType.Custom,
                },
              ],
            });
          } catch {
            if (isSourcePicker) {
              // Source requires a configured network to sign transactions.
              // Abort selection if the network couldn't be added.
              navigation.goBack();
              return;
            }
            // Dest can fail silently
          }
        }
      }

      if (isSelectingOtherToken && sourceToken && destToken) {
        // Only allow swap if the destination network (which would become source) is enabled
        if (!isDestNetworkEnabled) {
          // Cannot swap - dest network is disabled, just go back
          navigation.goBack();
          return;
        }

        // Swap the tokens: old source becomes dest, old dest becomes source
        // Pass destAmount so it becomes the new sourceAmount after swap
        try {
          await handleSwitchTokens(destAmount)();
        } catch {
          // Network switch failed - still navigate back but state may be inconsistent
          // The user can retry from the main view
        }
      } else {
        // Normal selection: just update the current token
        dispatch(isSourcePicker ? setSourceToken(token) : setDestToken(token));
        if (!isSourcePicker) {
          dispatch(setIsDestTokenManuallySet(true));
        } else {
          // Zero the source amount and reset quotes when switching source token
          dispatch(setSourceAmount(undefined));
          if (Engine.context.BridgeController?.resetState) {
            Engine.context.BridgeController.resetState();
          }
          // Auto-update dest token when source token changes
          autoUpdateDestToken(token);
        }
      }

      navigation.goBack();
    },
    [
      type,
      sourceToken,
      destToken,
      destAmount,
      dispatch,
      navigation,
      handleSwitchTokens,
      isDestNetworkEnabled,
      autoUpdateDestToken,
      networkConfigurations,
    ],
  );

  const selectedToken =
    type === TokenSelectorType.Source ? sourceToken : destToken;

  return { handleTokenPress, selectedToken };
};
