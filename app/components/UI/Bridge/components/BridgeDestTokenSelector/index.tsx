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
  setIsDestTokenManuallySet,
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
import { UnifiedSwapBridgeEventName } from '@metamask/bridge-controller';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';

export const getNetworkName = (
  chainId: Hex,
  networkConfigurations: Record<string, MultichainNetworkConfiguration>,
) =>
  NETWORK_TO_SHORT_NETWORK_NAME_MAP[chainId] ??
  networkConfigurations?.[chainId as Hex]?.name ??
  PopularList.find((network) => network.chainId === chainId)?.nickname ??
  'Unknown Network';

const createStyles = () =>
  StyleSheet.create({
    infoButton: {
      marginRight: 12,
    },
  });
export const BridgeDestTokenSelector: React.FC = React.memo(() => {
  const dispatch = useDispatch();
  const { styles } = useStyles(createStyles);
  const navigation = useNavigation();
  const bridgeViewMode = useSelector(selectBridgeViewMode);

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const selectedDestToken = useSelector(selectDestToken);
  const selectedDestChainId = useSelector(selectSelectedDestChainId);
  const selectedSourceToken = useSelector(selectSourceToken);

  const balanceChainIds = useMemo(
    () => (selectedDestChainId ? [selectedDestChainId] : []),
    [selectedDestChainId],
  );
  const tokensToExclude = useMemo(
    () => (selectedSourceToken ? [selectedSourceToken] : []),
    [selectedSourceToken],
  );
  const { allTokens, tokensToRender, pending } = useTokens({
    topTokensChainId: selectedDestChainId,
    balanceChainIds,
    tokensToExclude,
  });

  const handleTokenPress = useCallback(
    (token: BridgeToken) => {
      // Mark as manually set to prevent auto-updating dest when source chain changes
      dispatch(setDestToken(token));
      dispatch(setIsDestTokenManuallySet(true));
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

      // Open the asset details screen as a bottom sheet
      // Use dispatch with unique key to force new modal instance
      const handleInfoButtonPress = () => {
        navigation.dispatch({
          type: 'NAVIGATE',
          payload: {
            name: 'Asset',
            key: `Asset-${item.address}-${item.chainId}-${Date.now()}`,
            params: { ...item },
          },
        });

        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
          UnifiedSwapBridgeEventName.AssetDetailTooltipClicked,
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

  const networksBar = useMemo(
    () =>
      bridgeViewMode === BridgeViewMode.Bridge ||
      bridgeViewMode === BridgeViewMode.Unified ? (
        <BridgeDestNetworksBar />
      ) : undefined,
    [bridgeViewMode],
  );

  return (
    <BridgeTokenSelectorBase
      networksBar={networksBar}
      renderTokenItem={renderToken}
      allTokens={allTokens}
      tokensToRender={tokensToRender}
      pending={pending}
      chainIdToFetchMetadata={selectedDestChainId}
      scrollResetKey={selectedDestChainId}
    />
  );
});

BridgeDestTokenSelector.displayName = 'BridgeDestTokenSelector';
