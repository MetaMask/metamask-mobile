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
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { CaipChainId, Hex } from '@metamask/utils';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../constants/bridge';
import { Box } from '../../Box/Box';
import { getNetworkImageSource } from '../../../../util/networks';
import { AlignItems, FlexDirection } from '../../Box/box.types';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { selectChainId } from '../../../../selectors/networkController';
// Using ScrollView from react-native-gesture-handler to fix scroll issues with the bottom sheet
import { ScrollView } from 'react-native-gesture-handler';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { BtcScope, SolScope, TrxScope } from '@metamask/keyring-api';
import { BridgeViewMode } from '../types';
///: END:ONLY_INCLUDE_IF
const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
      backgroundColor: theme.colors.background.default,
      borderRadius: 10,
    },
    selectedNetworkIcon: {
      borderColor: theme.colors.border.muted,
      backgroundColor: theme.colors.background.muted,
      borderRadius: 10,
    },
    scrollView: {
      flexGrow: 0,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 4,
    },
  });
};

/**
 * Sorting chains by popularity
 * 1 = most popular
 * Infinity = least popular
 */
export const ChainPopularity: Record<Hex | CaipChainId, number> = {
  [CHAIN_IDS.MAINNET]: 1,
  [CHAIN_IDS.BSC]: 2,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  [BtcScope.Mainnet]: 3,
  [SolScope.Mainnet]: 4,
  [TrxScope.Mainnet]: 5,
  ///: END:ONLY_INCLUDE_IF
  [CHAIN_IDS.BASE]: 6,
  [CHAIN_IDS.ARBITRUM]: 7,
  [CHAIN_IDS.LINEA_MAINNET]: 8,
  [CHAIN_IDS.POLYGON]: 9,
  [CHAIN_IDS.AVALANCHE]: 10,
  [CHAIN_IDS.OPTIMISM]: 11,
  [CHAIN_IDS.ZKSYNC_ERA]: 12,
  [NETWORKS_CHAIN_ID.SEI]: 13,
  [NETWORKS_CHAIN_ID.MONAD]: 14,
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
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
    });
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
                gap={8}
              >
                {selectedDestChainId === chain.chainId ? (
                  <AvatarNetwork
                    imageSource={networkImage}
                    size={AvatarSize.Xs}
                  />
                ) : null}
                <Text>
                  {NETWORK_TO_SHORT_NETWORK_NAME_MAP[chain.chainId] ??
                    chain.name}
                </Text>
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
