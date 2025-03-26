import React, { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectSelectedSourceChainIds, selectEnabledSourceChains, setSourceToken, selectSourceToken, selectDestToken } from '../../../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { useSortedSourceNetworks } from '../../hooks/useSortedSourceNetworks';
import { BridgeSourceNetworksBar, MAX_NETWORK_ICONS } from '../BridgeSourceNetworksBar';
import { BridgeTokenSelectorBase } from '../BridgeTokenSelectorBase';
import { useTokens } from '../../hooks/useTokens';
import { BridgeToken } from '../../types';

export const BridgeSourceTokenSelector: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const { sortedSourceNetworks } = useSortedSourceNetworks();
  const selectedSourceToken = useSelector(selectSourceToken);
  const selectedDestToken = useSelector(selectDestToken);

  const tokensList = useTokens({
    topTokensChainId: selectedSourceToken?.chainId as Hex,
    balanceChainIds: selectedSourceChainIds as Hex[],
    tokensToExclude: selectedDestToken ? [selectedDestToken] : [],
  });

  const renderItem = useCallback(({ item }: { item: BridgeToken }) => {
    const handleTokenPress = (token: BridgeToken) => {
      dispatch(setSourceToken(token));
      navigation.goBack();
    };

    return (
      <TokenSelectorItem
        token={item}
        onPress={handleTokenPress}
        networkName={networkConfigurations[item.chainId as Hex].name}
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        networkImageSource={getNetworkImageSource({ chainId: item.chainId as Hex })}
        isSelected={
          selectedSourceToken?.address === item.address &&
          selectedSourceToken?.chainId === item.chainId
        }
      />
    );
  }, [dispatch, navigation, networkConfigurations, selectedSourceToken]);

  const networksToShow = useMemo(() =>
    sortedSourceNetworks
      .filter(({ chainId }) => selectedSourceChainIds.includes(chainId))
      .filter((_, i) => i < MAX_NETWORK_ICONS),
    [selectedSourceChainIds, sortedSourceNetworks],
  );

  return (
    <BridgeTokenSelectorBase
      networksBar={
        <BridgeSourceNetworksBar
          networksToShow={networksToShow}
          networkConfigurations={networkConfigurations}
          selectedSourceChainIds={selectedSourceChainIds as Hex[]}
          enabledSourceChains={enabledSourceChains}
        />
      }
      renderTokenItem={renderItem}
      tokensList={tokensList}
    />
  );
};
