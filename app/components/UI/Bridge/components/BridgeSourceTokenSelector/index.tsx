import React, { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Hex,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipChainId,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/utils';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectNetworkConfigurations,
} from '../../../../../selectors/networkController';
import {
  selectSelectedSourceChainIds,
  selectEnabledSourceChains,
  setSourceToken,
  selectSourceToken,
  selectDestToken,
  selectBridgeViewMode,
} from '../../../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { useSortedSourceNetworks } from '../../hooks/useSortedSourceNetworks';
import { BridgeSourceNetworksBar } from '../BridgeSourceNetworksBar';
import {
  BridgeTokenSelectorBase,
  SkeletonItem,
} from '../BridgeTokenSelectorBase';
import { useTokens } from '../../hooks/useTokens';
import { BridgeToken, BridgeViewMode } from '../../types';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';

export const BridgeSourceTokenSelector: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const bridgeViewMode = useSelector(selectBridgeViewMode);

  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const { sortedSourceNetworks } = useSortedSourceNetworks();
  const selectedSourceToken = useSelector(selectSourceToken);
  const selectedDestToken = useSelector(selectDestToken);
  const selectedChainId = useSelector(selectChainId);

  const {
    chainId: selectedEvmChainId, // Will be the most recently selected EVM chain if you are on Solana
    domainIsConnectedDapp,
    networkName: selectedNetworkName,
  } = useNetworkInfo();
  const {
    onSetRpcTarget,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  } = useSwitchNetworks({
    domainIsConnectedDapp,
    selectedChainId: selectedEvmChainId,
    selectedNetworkName,
  });

  let balanceChainIds;
  const isBridgeOrUnified =
    bridgeViewMode === BridgeViewMode.Bridge ||
    bridgeViewMode === BridgeViewMode.Unified;
  if (isBridgeOrUnified) {
    balanceChainIds = selectedSourceChainIds;
  } else {
    // Really only for Solana Swap
    balanceChainIds = selectedSourceToken?.chainId
      ? [selectedSourceToken?.chainId]
      : undefined;
  }

  const { tokens: tokensList, pending } = useTokens({
    topTokensChainId: selectedSourceToken?.chainId,
    balanceChainIds,
    tokensToExclude: selectedDestToken ? [selectedDestToken] : [],
  });

  const renderItem = useCallback(
    ({ item }: { item: BridgeToken | null }) => {
      // This is to support a partial loading state for top tokens
      // We can show tokens with balance immediately, but we need to wait for the top tokens to load
      if (!item) {
        return <SkeletonItem />;
      }

      const handleTokenPress = async (token: BridgeToken) => {
        dispatch(setSourceToken(token));

        // Switch to the chain of the selected token
        const evmNetworkConfiguration =
          evmNetworkConfigurations[token.chainId as Hex];

        if (evmNetworkConfiguration) {
          await onSetRpcTarget(evmNetworkConfiguration);
        }

        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
        if (!evmNetworkConfiguration) {
          await onNonEvmNetworkChange(token.chainId as CaipChainId);
        }
        ///: END:ONLY_INCLUDE_IF

        navigation.goBack();
      };

      const networkName = allNetworkConfigurations[item.chainId]?.name;

      return (
        <TokenSelectorItem
          token={item}
          onPress={handleTokenPress}
          networkName={networkName}
          networkImageSource={getNetworkImageSource({ chainId: item.chainId })}
          isSelected={
            selectedSourceToken?.address === item.address &&
            selectedSourceToken?.chainId === item.chainId
          }
        />
      );
    },
    [
      dispatch,
      navigation,
      allNetworkConfigurations,
      selectedSourceToken,
      onSetRpcTarget,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      onNonEvmNetworkChange,
      ///: END:ONLY_INCLUDE_IF
      evmNetworkConfigurations,
    ],
  );

  const networksToShow = useMemo(
    () =>
      sortedSourceNetworks.filter(({ chainId }) =>
        selectedSourceChainIds.includes(chainId),
      ),
    [selectedSourceChainIds, sortedSourceNetworks],
  );

  return (
    <BridgeTokenSelectorBase
      networksBar={
        isBridgeOrUnified ? (
          <BridgeSourceNetworksBar
            networksToShow={networksToShow}
            networkConfigurations={allNetworkConfigurations}
            selectedSourceChainIds={selectedSourceChainIds as Hex[]}
            enabledSourceChains={enabledSourceChains}
          />
        ) : undefined
      }
      renderTokenItem={renderItem}
      tokensList={tokensList}
      pending={pending}
      chainIdToFetchMetadata={selectedChainId}
    />
  );
};
