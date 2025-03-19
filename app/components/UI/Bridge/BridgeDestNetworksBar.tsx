import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../component-library/components/Texts/Text';
import Routes from '../../../constants/navigation/Routes';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { StyleSheet, ScrollView } from 'react-native';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useDispatch, useSelector } from 'react-redux';
import { selectEnabledDestChains, setSelectedDestChainId } from '../../../core/redux/slices/bridge';
import { ETH_CHAIN_ID, BASE_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { Hex } from '@metamask/utils';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
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

const ChainPopularity: Record<Hex, number> = {
  [ETH_CHAIN_ID]: 1,
  // TODO add solana as 2nd
  [BASE_CHAIN_ID]: 3,
};

export const BridgeDestNetworksBar = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { styles } = useStyles(createStyles, {});
  const enabledDestChains = useSelector(selectEnabledDestChains);

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
      {sortedDestChains.map((chain) => (
        <Button
          key={chain.chainId}
          variant={ButtonVariants.Secondary}
          label={<Text>{chain.name}</Text>}
          style={styles.networksButton}
          onPress={() => handleSelectNetwork(chain.chainId)}
        />
      ))}
    </ScrollView>
  );
};
