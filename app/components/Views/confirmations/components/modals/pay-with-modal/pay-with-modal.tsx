import React, { useCallback, useMemo } from 'react';
import {
  BridgeTokenSelectorBase,
  SkeletonItem,
} from '../../../../../UI/Bridge/components/BridgeTokenSelectorBase';
import { BridgeSourceNetworksBar } from '../../../../../UI/Bridge/components/BridgeSourceNetworksBar';
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
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';

export function PayWithModal() {
  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const { sortedSourceNetworks } = useSortedSourceNetworks();
  const navigation = useNavigation();
  const { payToken, setPayToken } = useTransactionPayToken();
  const { minimumFiatBalance } = useParams<{ minimumFiatBalance?: number }>();

  const { tokens: tokensList, pending } = useTokens({
    balanceChainIds: selectedSourceChainIds,
    tokensToExclude: [],
  });

  const filteredTokensList = useMemo(
    () =>
      tokensList.filter(
        (token) => (token.tokenFiatAmount ?? 0) >= (minimumFiatBalance ?? 0),
      ),
    [tokensList, minimumFiatBalance],
  );

  const handleTokenSelect = useCallback(
    (token: BridgeToken) => {
      setPayToken({
        address: token.address as Hex,
        chainId: token.chainId as Hex,
      });

      navigation.goBack();
    },
    [navigation, setPayToken],
  );

  const renderItem = useCallback(
    ({ item }: { item: BridgeToken | null }) => {
      if (!item) {
        return <SkeletonItem />;
      }

      const { chainId } = item;
      const networkName = allNetworkConfigurations[chainId]?.name;

      const isSelected =
        payToken?.chainId === chainId &&
        payToken?.address.toLowerCase() === item.address.toLowerCase();

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
    [allNetworkConfigurations, handleTokenSelect, payToken],
  );

  const handleNetworkPress = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_NETWORK_MODAL);
  }, [navigation]);

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
        <BridgeSourceNetworksBar
          networksToShow={networksToShow}
          networkConfigurations={allNetworkConfigurations}
          selectedSourceChainIds={selectedSourceChainIds as Hex[]}
          enabledSourceChains={enabledSourceChains}
          onPress={handleNetworkPress}
        />
      }
      renderTokenItem={renderItem}
      tokensList={filteredTokensList}
      pending={pending}
      title={strings('pay_with_modal.title')}
    />
  );
}
