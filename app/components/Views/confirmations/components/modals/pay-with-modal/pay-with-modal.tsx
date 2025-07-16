import React, { useCallback, useMemo } from 'react';
import {
  BridgeTokenSelectorBase,
  SkeletonItem,
} from '../../../../../UI/Bridge/components/BridgeTokenSelectorBase';
import {
  BridgeSourceNetworksBar,
  MAX_NETWORK_ICONS,
} from '../../../../../UI/Bridge/components/BridgeSourceNetworksBar';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import {
  selectEnabledSourceChains,
  selectSelectedSourceChainIds,
} from '../../../../../../core/redux/slices/bridge';
import { useSortedSourceNetworks } from '../../../../../UI/Bridge/hooks/useSortedSourceNetworks';
import { BridgeToken } from '../../../../../UI/Bridge/types';
import { useTokens } from '../../../../../UI/Bridge/hooks/useTokens';
import { TokenSelectorItem } from '../../../../../UI/Bridge/components/TokenSelectorItem';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { usePayAsset } from '../../../hooks/transactions/usePayAsset';

export function PayWithModal() {
  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const { sortedSourceNetworks } = useSortedSourceNetworks();
  const transactionMeta = useTransactionMetadataRequest();
  const navigation = useNavigation();
  const { payAsset, setPayAsset } = usePayAsset();

  const { chainId: transactionChainId } = transactionMeta || {};

  const { tokens: tokensList, pending } = useTokens({
    topTokensChainId: transactionChainId,
    balanceChainIds: selectedSourceChainIds,
    tokensToExclude: [],
  });

  const handleTokenSelect = useCallback(
    (token: BridgeToken) => {
      console.log('#MATT SELECTED TOKEN', token);

      setPayAsset({
        address: token.address as Hex,
        chainId: token.chainId as Hex,
      });

      navigation.goBack();
    },
    [navigation, setPayAsset],
  );

  const renderItem = useCallback(
    ({ item }: { item: BridgeToken | null }) => {
      if (!item) {
        return <SkeletonItem />;
      }

      const { chainId } = item;
      const networkName = allNetworkConfigurations[chainId]?.name;

      const isSelected =
        payAsset.chainId === chainId &&
        payAsset.address.toLowerCase() === item.address.toLowerCase();

      const networkImageSource = getNetworkImageSource({
        chainId,
      });

      return (
        <TokenSelectorItem
          token={item}
          onPress={handleTokenSelect}
          networkName={networkName}
          networkImageSource={networkImageSource}
          isSelected={isSelected}
        />
      );
    },
    [allNetworkConfigurations, handleTokenSelect, payAsset],
  );

  const handleNetworkPress = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_NETWORK_MODAL);
  }, [navigation]);

  const networksToShow = useMemo(
    () =>
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
          networkConfigurations={allNetworkConfigurations}
          selectedSourceChainIds={selectedSourceChainIds as Hex[]}
          enabledSourceChains={enabledSourceChains}
          onPress={handleNetworkPress}
        />
      }
      renderTokenItem={renderItem}
      tokensList={tokensList}
      pending={pending}
    />
  );
}
