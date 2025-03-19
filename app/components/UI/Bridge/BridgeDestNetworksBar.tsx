import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../component-library/components/Texts/Text';
import Routes from '../../../constants/navigation/Routes';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { StyleSheet, ScrollView, Image } from 'react-native';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useDispatch, useSelector } from 'react-redux';
import { selectEnabledDestChains, selectSelectedDestChainId, setSelectedDestChainId } from '../../../core/redux/slices/bridge';
import { ETH_CHAIN_ID, BASE_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { Hex } from '@metamask/utils';
import { Box } from '../Box/Box';
import { getNetworkImageSource } from '../../../util/networks';
import { AlignItems, FlexDirection } from '../Box/box.types';

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
    networkIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
  });
};

const ChainPopularity: Record<Hex, number> = {
  [ETH_CHAIN_ID]: 1,
  // TODO add solana as 2nd
  [BASE_CHAIN_ID]: 3,
};

const ShortChainNames: Record<Hex, string> = {
  [ETH_CHAIN_ID]: 'Ethereum',
};

export const BridgeDestNetworksBar = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { styles } = useStyles(createStyles, {});
  const enabledDestChains = useSelector(selectEnabledDestChains);
  const selectedDestChainId = useSelector(selectSelectedDestChainId);

  const sortedDestChains = enabledDestChains.sort((a, b) => {
    const aPopularity = ChainPopularity[a.chainId] ?? Infinity;
    const bPopularity = ChainPopularity[b.chainId] ?? Infinity;
    return aPopularity - bPopularity;
  });

  const navigateToNetworkSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_DEST_NETWORK_SELECTOR,
    });
  }, [navigation]);

  const handleSelectNetwork = (chainId: Hex) => {
    dispatch(setSelectedDestChainId(chainId));
  };

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
      {sortedDestChains.map((chain) => {
        // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        const networkImage = getNetworkImageSource({ chainId: chain.chainId});

        return (
          <Button
            key={chain.chainId}
            variant={ButtonVariants.Secondary}
            label={
              <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center} gap={4}>
                {selectedDestChainId === chain.chainId ? <Image source={networkImage} style={styles.networkIcon} /> : null}
                <Text>{ShortChainNames[chain.chainId] ?? chain.name}</Text>
              </Box>
            }
            style={selectedDestChainId === chain.chainId ? styles.selectedNetworkIcon : styles.networksButton}
            onPress={() => handleSelectNetwork(chain.chainId)}
          />
        );
      })}
    </ScrollView>
  );
};
