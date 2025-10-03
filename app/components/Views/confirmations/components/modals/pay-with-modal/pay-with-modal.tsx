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
import { TokenSelectorItem } from '../../../../../UI/Bridge/components/TokenSelectorItem';
import { getNetworkImageSource } from '../../../../../../util/networks';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { View } from 'react-native';

export function PayWithModal() {
  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const navigation = useNavigation();
  const { payToken, setPayToken } = useTransactionPayToken();

  const { availableTokens, availableChainIds } =
    useTransactionPayAvailableTokens();

  const tokens = useMemo(
    () =>
      availableTokens.filter((token) =>
        selectedSourceChainIds.includes(token.chainId as Hex),
      ),
    [availableTokens, selectedSourceChainIds],
  );

  const { sortedSourceNetworks: sortedSourceNetworksRaw } =
    useSortedSourceNetworks();

  const supportedChains = useMemo(
    () =>
      enabledSourceChains.filter(
        (chain) =>
          !isSolanaChainId(chain.chainId) &&
          availableChainIds.includes(chain.chainId as Hex),
      ),
    [availableChainIds, enabledSourceChains],
  );

  const networksWithIcon = useMemo(
    () =>
      sortedSourceNetworksRaw.filter(
        (chain) =>
          supportedChains.some((c) => c.chainId === chain.chainId) &&
          selectedSourceChainIds.includes(chain.chainId),
      ),
    [selectedSourceChainIds, sortedSourceNetworksRaw, supportedChains],
  );

  const chainIdsInCount = useMemo(
    () => networksWithIcon.map((n) => n.chainId),
    [networksWithIcon],
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
        <View testID={`available-token-${item.address}-${item.chainId}`}>
          <TokenSelectorItem
            token={item}
            onPress={handleTokenSelect}
            networkName={networkName}
            networkImageSource={networkImageSource}
            isSelected={isSelected}
          />
        </View>
      );
    },
    [allNetworkConfigurations, handleTokenSelect, payToken],
  );

  const handleNetworkPress = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_NETWORK_MODAL);
  }, [navigation]);

  return (
    <BridgeTokenSelectorBase
      networksBar={
        <BridgeSourceNetworksBar
          networksToShow={networksWithIcon}
          networkConfigurations={allNetworkConfigurations}
          selectedSourceChainIds={chainIdsInCount as Hex[]}
          enabledSourceChains={supportedChains}
          onPress={handleNetworkPress}
        />
      }
      renderTokenItem={renderItem}
      allTokens={tokens}
      tokensToRender={tokens}
      title={strings('pay_with_modal.title')}
    />
  );
}
