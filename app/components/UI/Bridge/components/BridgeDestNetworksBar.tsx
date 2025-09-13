import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { StyleSheet } from 'react-native';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectBridgeViewMode,
  selectEnabledDestChains,
  selectSelectedDestChainId,
  setSelectedDestChainId,
} from '../../../../core/redux/slices/bridge';
import {
  ETH_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  LINEA_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  ARBITRUM_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
} from '@metamask/swaps-controller/dist/constants';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { CaipChainId, Hex } from '@metamask/utils';
import { Box } from '../../Box/Box';
import { getNetworkImageSource } from '../../../../util/networks';
import { AlignItems, FlexDirection } from '../../Box/box.types';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { selectChainId } from '../../../../selectors/networkController';
// Using ScrollView from react-native-gesture-handler to fix scroll issues with the bottom sheet
import { ScrollView } from 'react-native-gesture-handler';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
import { BridgeViewMode } from '../types';
///: END:ONLY_INCLUDE_IF
const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
    },
    selectedNetworkIcon: {
      borderColor: theme.colors.primary.muted,
      backgroundColor: theme.colors.primary.muted,
    },
    scrollView: {
      flexGrow: 0,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 4,
    },
  });
};

/**
 * Sorting chains by popularity
 * 1 = most popular
 * Infinity = least popular
 */
const ChainPopularity: Record<Hex | CaipChainId, number> = {
  [ETH_CHAIN_ID]: 1,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  [SolScope.Mainnet]: 2,
  ///: END:ONLY_INCLUDE_IF
  [BASE_CHAIN_ID]: 3,
  [BSC_CHAIN_ID]: 4,
  [LINEA_CHAIN_ID]: 5,
  [OPTIMISM_CHAIN_ID]: 6,
  [ARBITRUM_CHAIN_ID]: 7,
  [AVALANCHE_CHAIN_ID]: 9,
  [POLYGON_CHAIN_ID]: 8,
  [ZKSYNC_ERA_CHAIN_ID]: 10,
  [NETWORKS_CHAIN_ID.SEI]: 11,
};

const ShortChainNames: Record<Hex | CaipChainId, string> = {
  [ETH_CHAIN_ID]: 'Ethereum',
};

export const BridgeDestNetworksBar = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const enabledDestChains = useSelector(selectEnabledDestChains);
  const selectedDestChainId = useSelector(selectSelectedDestChainId);
  const currentChainId = useSelector(selectChainId);
  const { styles } = useStyles(createStyles, { selectedDestChainId });
  const bridgeViewMode = useSelector(selectBridgeViewMode);

  const sortedDestChains = useMemo(
    () =>
      [...enabledDestChains]
        .filter((chain) => {
          if (bridgeViewMode === BridgeViewMode.Unified) {
            return true;
          }
          return chain.chainId !== currentChainId;
        })
        .sort((a, b) => {
          const aPopularity = ChainPopularity[a.chainId] ?? Infinity;
          const bPopularity = ChainPopularity[b.chainId] ?? Infinity;
          return aPopularity - bPopularity;
        }),
    [enabledDestChains, currentChainId, bridgeViewMode],
  );

  const navigateToNetworkSelector = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR);
  };

  const renderDestChains = useCallback(
    () =>
      sortedDestChains.map((chain) => {
        const networkImage = getNetworkImageSource({ chainId: chain.chainId });

        const handleSelectNetwork = (chainId: Hex | CaipChainId) =>
          dispatch(setSelectedDestChainId(chainId));

        return (
          <Button
            key={chain.chainId}
            variant={ButtonVariants.Secondary}
            label={
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={4}
              >
                {selectedDestChainId === chain.chainId ? (
                  <AvatarNetwork
                    imageSource={networkImage}
                    size={AvatarSize.Xs}
                  />
                ) : null}
                <Text>{ShortChainNames[chain.chainId] ?? chain.name}</Text>
              </Box>
            }
            style={
              selectedDestChainId === chain.chainId
                ? styles.selectedNetworkIcon
                : styles.networksButton
            }
            onPress={() => handleSelectNetwork(chain.chainId)}
          />
        );
      }),
    [dispatch, selectedDestChainId, styles, sortedDestChains],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
    >
      <Button
        onPress={navigateToNetworkSelector}
        variant={ButtonVariants.Secondary}
        label={<Text>{strings('bridge.see_all')}</Text>}
        style={styles.networksButton}
        endIconName={IconName.ArrowDown}
      />
      {renderDestChains()}
    </ScrollView>
  );
};
