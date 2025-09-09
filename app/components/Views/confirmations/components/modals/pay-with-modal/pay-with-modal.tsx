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
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { useTransactionRequiredTokens } from '../../../hooks/pay/useTransactionRequiredTokens';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isSolanaChainId } from '@metamask/bridge-controller';

export function PayWithModal() {
  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const { sortedSourceNetworks: sortedSourceNetworksRaw } =
    useSortedSourceNetworks();
  const navigation = useNavigation();
  const { payToken, setPayToken } = useTransactionPayToken();
  const { minimumFiatBalance } = useParams<{ minimumFiatBalance?: number }>();
  const { chainId: transactionChainId } = useTransactionMetadataRequest() ?? {};
  const requiredTokens = useTransactionRequiredTokens();

  const supportedSourceChains = useMemo(
    () =>
      enabledSourceChains.filter((chain) => !isSolanaChainId(chain.chainId)),
    [enabledSourceChains],
  );

  const sortedSourceNetworks = useMemo(
    () =>
      sortedSourceNetworksRaw.filter((chain) =>
        supportedSourceChains.some((c) => c.chainId === chain.chainId),
      ),
    [sortedSourceNetworksRaw, supportedSourceChains],
  );

  const targetTokens = useMemo(
    () => requiredTokens.filter((t) => !t.skipIfBalance),
    [requiredTokens],
  );

  const { tokens: tokensList, pending } = useTokens({
    balanceChainIds: selectedSourceChainIds,
    tokensToExclude: [],
  });

  const isTokenSupported = useCallback(
    (token: BridgeToken) => {
      const isSelected =
        payToken?.address.toLowerCase() === token.address.toLowerCase() &&
        payToken?.chainId === token.chainId;

      if (isSelected) {
        return true;
      }

      const isRequiredToken = targetTokens.some(
        (t) =>
          t.address.toLowerCase() === token.address.toLowerCase() &&
          transactionChainId === token.chainId,
      );

      if (isRequiredToken) {
        return true;
      }

      const isTokenBalanceSufficient =
        (token?.tokenFiatAmount ?? 0) >= (minimumFiatBalance ?? 0);

      if (!isTokenBalanceSufficient) {
        return false;
      }

      const nativeToken = tokensList.find(
        (t) =>
          t.address === NATIVE_TOKEN_ADDRESS && t.chainId === token.chainId,
      );

      const hasNativeBalance = (nativeToken?.tokenFiatAmount ?? 0) > 0;

      return hasNativeBalance;
    },
    [
      minimumFiatBalance,
      payToken,
      targetTokens,
      tokensList,
      transactionChainId,
    ],
  );

  const filteredTokensList = useMemo(
    () => tokensList.filter(isTokenSupported),
    [isTokenSupported, tokensList],
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
          enabledSourceChains={supportedSourceChains}
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
