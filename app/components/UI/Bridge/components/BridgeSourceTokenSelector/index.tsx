import React, { useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { debounce } from 'lodash';
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
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import { useAutoUpdateDestToken } from '../../hooks/useAutoUpdateDestToken';

export const BridgeSourceTokenSelector: React.FC = React.memo(() => {
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
  const { autoUpdateDestToken } = useAutoUpdateDestToken();

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

  const tokenToExclude = useMemo(
    () => (selectedDestToken ? [selectedDestToken] : []),
    [selectedDestToken],
  );
  const { allTokens, tokensToRender, pending } = useTokens({
    topTokensChainId: selectedSourceToken?.chainId,
    balanceChainIds,
    tokensToExclude: tokenToExclude,
  });

  const handleTokenPress = useCallback(
    async (token: BridgeToken) => {
      // Navigate back to the previous screen immediately so we unmount the component
      // And don't refetch the top tokens
      // The chain switching will still happen in the background
      // Chain switching is important for calling /suggestedGasFees endpoint for the right chain
      // and also the next time you open up the token selector to fetch top tokens for the right chain
      navigation.goBack();
      dispatch(setSourceToken(token));
      // Auto-update destination token when source chain changes AND dest wasn't manually set
      autoUpdateDestToken(token);

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
    },
    [
      navigation,
      dispatch,
      evmNetworkConfigurations,
      onSetRpcTarget,
      autoUpdateDestToken,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      onNonEvmNetworkChange,
      ///: END:ONLY_INCLUDE_IF
    ],
  );

  const debouncedTokenPress = useMemo(
    () => debounce(handleTokenPress, 500),
    [handleTokenPress],
  );

  // Cleanup debounced function on unmount and dependency changes
  useEffect(
    () => () => {
      debouncedTokenPress.cancel();
    },
    [debouncedTokenPress],
  );

  const renderItem = useCallback(
    ({ item }: { item: BridgeToken | null }) => {
      // This is to support a partial loading state for top tokens
      // We can show tokens with balance immediately, but we need to wait for the top tokens to load
      if (!item) {
        return <SkeletonItem />;
      }

      const networkName =
        NETWORK_TO_SHORT_NETWORK_NAME_MAP[item.chainId] ??
        allNetworkConfigurations[item.chainId]?.name;

      return (
        <TokenSelectorItem
          token={item}
          onPress={debouncedTokenPress}
          networkName={networkName}
          networkImageSource={getNetworkImageSource({ chainId: item.chainId })}
          isSelected={
            selectedSourceToken?.address === item.address &&
            selectedSourceToken?.chainId === item.chainId
          }
        />
      );
    },
    [allNetworkConfigurations, selectedSourceToken, debouncedTokenPress],
  );

  const networksToShow = useMemo(
    () =>
      sortedSourceNetworks.filter(({ chainId }) =>
        selectedSourceChainIds.includes(chainId),
      ),
    [selectedSourceChainIds, sortedSourceNetworks],
  );

  const networksBar = useMemo(
    () =>
      isBridgeOrUnified ? (
        <BridgeSourceNetworksBar
          networksToShow={networksToShow}
          networkConfigurations={allNetworkConfigurations}
          selectedSourceChainIds={selectedSourceChainIds as Hex[]}
          enabledSourceChains={enabledSourceChains}
        />
      ) : undefined,
    [
      isBridgeOrUnified,
      networksToShow,
      allNetworkConfigurations,
      selectedSourceChainIds,
      enabledSourceChains,
    ],
  );

  return (
    <BridgeTokenSelectorBase
      networksBar={networksBar}
      renderTokenItem={renderItem}
      allTokens={allTokens}
      tokensToRender={tokensToRender}
      pending={pending}
      chainIdToFetchMetadata={selectedChainId}
    />
  );
});

BridgeSourceTokenSelector.displayName = 'BridgeSourceTokenSelector';
