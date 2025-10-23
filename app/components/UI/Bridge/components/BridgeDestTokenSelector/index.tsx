import React, { useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { debounce } from 'lodash';
import { useNavigation } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  selectBridgeViewMode,
  selectDestToken,
  selectSelectedDestChainId,
  selectSourceToken,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { BridgeDestNetworksBar } from '../BridgeDestNetworksBar';
import {
  BridgeTokenSelectorBase,
  SkeletonItem,
} from '../BridgeTokenSelectorBase';
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
import Engine from '../../../../../core/Engine';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import Routes from '../../../../../constants/navigation/Routes';

export const getNetworkName = (
  chainId: Hex,
  networkConfigurations: Record<string, MultichainNetworkConfiguration>,
) =>
  networkConfigurations?.[chainId as Hex]?.name ??
  PopularList.find((network) => network.chainId === chainId)?.nickname ??
  'Unknown Network';

const createStyles = () =>
  StyleSheet.create({
    infoButton: {
      marginRight: 12,
    },
  });
export const BridgeDestTokenSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const bridgeViewMode = useSelector(selectBridgeViewMode);

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const selectedDestToken = useSelector(selectDestToken);
  const selectedDestChainId = useSelector(selectSelectedDestChainId);
  const selectedSourceToken = useSelector(selectSourceToken);
  const { allTokens, tokensToRender, pending } = useTokens({
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

  const renderToken = useCallback(
    ({ item }: { item: BridgeToken | null }) => {
      // This is to support a partial loading state for top tokens
      // We can show tokens with balance immediately, but we need to wait for the top tokens to load
      if (!item) {
        return <SkeletonItem />;
      }

      // If the user hasn't added the network, it won't be in the networkConfigurations object
      // So we use the PopularList to get the network name
      const networkName = getNetworkName(
        item.chainId as Hex,
        networkConfigurations,
      );

      // Open the token insights bottom sheet
      const handleInfoButtonPress = () => {
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.TOKEN_INSIGHTS,
          params: {
            token: item,
            networkName,
          },
        });

        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
          // @ts-expect-error - Event name type mismatch
          'Unified SwapBridge Asset Detail Tooltip Clicked',
          {
            token_name: item.name ?? 'Unknown',
            token_symbol: item.symbol,
            token_contract: item.address,
            chain_name: networkName,
            chain_id: item.chainId,
          },
        );
      };

      return (
        <TokenSelectorItem
          token={item}
          onPress={debouncedTokenPress}
          networkName={networkName}
          networkImageSource={getNetworkImageSource({
            chainId: item.chainId as Hex,
          })}
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
      debouncedTokenPress,
      networkConfigurations,
      selectedDestToken,
      navigation,
      styles.infoButton,
    ],
  );

  return (
    <BridgeTokenSelectorBase
      networksBar={
        bridgeViewMode === BridgeViewMode.Bridge ||
        bridgeViewMode === BridgeViewMode.Unified ? (
          <BridgeDestNetworksBar />
        ) : undefined
      }
      renderTokenItem={renderToken}
      allTokens={allTokens}
      tokensToRender={tokensToRender}
      pending={pending}
      chainIdToFetchMetadata={selectedDestChainId}
      scrollResetKey={selectedDestChainId}
    />
  );
};
