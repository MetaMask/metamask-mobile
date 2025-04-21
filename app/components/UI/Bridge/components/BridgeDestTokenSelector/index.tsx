import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  selectDestToken,
  selectSelectedDestChainId,
  selectSourceToken,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { BridgeDestNetworksBar } from '../BridgeDestNetworksBar';
import { BridgeTokenSelectorBase } from '../BridgeTokenSelectorBase';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useStyles } from '../../../../../component-library/hooks';
import { StyleSheet } from 'react-native';
import { useTokens } from '../../hooks/useTokens';
import { BridgeToken, BridgeViewMode } from '../../types';
import { PopularList } from '../../../../../util/networks/customNetworks';

export interface BridgeDestTokenSelectorRouteParams {
  bridgeViewMode: BridgeViewMode;
}

const createStyles = () => StyleSheet.create({
  infoButton: {
    marginRight: 12,
  },
});
export const BridgeDestTokenSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: BridgeDestTokenSelectorRouteParams }, 'params'>>();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const selectedDestToken = useSelector(selectDestToken);
  const selectedDestChainId = useSelector(selectSelectedDestChainId);
  const selectedSourceToken = useSelector(selectSourceToken);
  const { tokens: tokensList, pending } = useTokens({
    topTokensChainId: selectedDestChainId,
    balanceChainIds: selectedDestChainId ? [selectedDestChainId] : [],
    tokensToExclude: selectedSourceToken ? [selectedSourceToken] : [],
  });
  const handleTokenPress = useCallback(
    (token: BridgeToken) => {
      dispatch(setDestToken(token));
      navigation.goBack();
    },
    [dispatch, navigation],
  );

  const renderToken = useCallback(
    ({ item }: { item: BridgeToken }) => {
      // Open the asset details screen as a bottom sheet
      const handleInfoButtonPress = () =>
        navigation.navigate('Asset', { ...item });

      // If the user hasn't added the network, it won't be in the networkConfigurations object
      // So we use the PopularList to get the network name
      const networkName =
        networkConfigurations?.[item.chainId as Hex]?.name ??
        PopularList.find((network) => network.chainId === item.chainId)
          ?.nickname ??
        'Unknown Network';

      return (
        <TokenSelectorItem
          token={item}
          onPress={handleTokenPress}
          networkName={networkName}
          //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
          networkImageSource={getNetworkImageSource({
            chainId: item.chainId as Hex,
          })}
          shouldShowBalance={false}
          isSelected={
            selectedDestToken?.address === item.address &&
            selectedDestToken?.chainId === item.chainId
          }
        >
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSizes.Md}
            onPress={handleInfoButtonPress}
            iconColor={IconColor.Alternative}
            style={styles.infoButton}
            testID="token-info-button"
          />
        </TokenSelectorItem>
      );
    },
    [
      handleTokenPress,
      networkConfigurations,
      selectedDestToken,
      navigation,
      styles.infoButton,
    ],
  );

  return (
    <BridgeTokenSelectorBase
      networksBar={route.params.bridgeViewMode === BridgeViewMode.Bridge ? <BridgeDestNetworksBar /> : undefined}
      renderTokenItem={renderToken}
      tokensList={tokensList}
      pending={pending}
      chainIdToFetchMetadata={selectedDestChainId}
    />
  );
};
