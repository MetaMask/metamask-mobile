import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { TokenI } from '../Tokens/types';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { selectSelectedSourceChainIds, selectEnabledSourceChains, setSourceToken } from '../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../util/networks';
import { TokenSelectorItem } from './TokenSelectorItem';
import { useSourceTokens, TokenIWithFiatAmount } from './useSourceTokens';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import Routes from '../../../constants/navigation/Routes';
import { useSortedSourceNetworks } from './useSortedSourceNetworks';
import { MAX_NETWORK_ICONS, SourceNetworksButtonLabel } from './SourceNetworksButtonLabel';
import { BridgeTokenSelectorBase } from './BridgeTokenSelectorBase';
import { IconName } from '../../../component-library/components/Icons/Icon';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
    },
  });
};

export const BridgeSourceTokenSelector: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const tokensList = useSourceTokens();
  const { sortedSourceNetworks } = useSortedSourceNetworks();

  const handleTokenPress = useCallback((token: TokenI) => {
    dispatch(setSourceToken(token));
    navigation.goBack();
  }, [dispatch, navigation]);


  const renderItem = useCallback(({ item }: { item: TokenIWithFiatAmount }) => (
    <TokenSelectorItem
      token={item}
      onPress={handleTokenPress}
      networkName={networkConfigurations[item.chainId as Hex].name}
      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      networkImageSource={getNetworkImageSource({ chainId: item.chainId as Hex })}
      />
    ),
    [handleTokenPress, networkConfigurations],
  );

  const navigateToNetworkSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_SOURCE_NETWORK_SELECTOR,
    });
  }, [navigation]);

  const networksToShow = useMemo(() =>
    sortedSourceNetworks
      .filter(({ chainId }) => selectedSourceChainIds.includes(chainId))
      .filter((_, i) => i < MAX_NETWORK_ICONS),
    [selectedSourceChainIds, sortedSourceNetworks],
  );

  return (
    <BridgeTokenSelectorBase
      renderNetworksBar={() => (
        <Button
          onPress={navigateToNetworkSelector}
          variant={ButtonVariants.Secondary}
          label={<SourceNetworksButtonLabel
            networksToShow={networksToShow}
            networkConfigurations={networkConfigurations}
            selectedSourceChainIds={selectedSourceChainIds as Hex[]}
            enabledSourceChains={enabledSourceChains}
          />}
          style={styles.networksButton}
          endIconName={IconName.ArrowDown}
        />
      )}
      renderTokenItem={renderItem}
      tokensList={tokensList}
    />
  );
};
