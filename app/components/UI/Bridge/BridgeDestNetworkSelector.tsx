import React from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import {
  selectEnabledDestChains,
  setSelectedDestChainId,
} from '../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../util/networks';
import Icon, { IconName } from '../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../component-library/components/Icons/Icon/Icon.types';
import { strings } from '../../../../locales/i18n';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';
import ListItem from '../../../component-library/components/List/ListItem/ListItem';
import { VerticalAlignment } from '../../../component-library/components/List/ListItem/ListItem.types';
import { Hex } from '@metamask/utils';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      position: 'absolute',
      right: 0,
    },
    closeIconBox: {
      padding: 8,
    },
    listContent: {
      padding: 8,
    },
    networkIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    networkName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text.default,
    },
    chainName: {
      flex: 1,
    },
  });
};

export const BridgeDestNetworkSelector: React.FC = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const enabledDestChains = useSelector(selectEnabledDestChains);

  const handleChainSelect = (chainId: Hex) => {
    dispatch(setSelectedDestChainId(chainId));
    navigation.goBack();
  };

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <Box gap={4}>
          <BottomSheetHeader>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
            >
              <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
                {strings('bridge.select_network')}
              </Text>
              <Box style={[styles.closeButton, styles.closeIconBox]}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  testID="bridge-network-selector-close-button"
                >
                  <Icon
                    name={IconName.Close}
                    size={IconSize.Sm}
                    color={theme.colors.icon.default}
                  />
                </TouchableOpacity>
              </Box>
            </Box>
          </BottomSheetHeader>
        </Box>

        <Box style={styles.listContent}>
          {enabledDestChains.map((chain) => {
            // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            const networkImage = getNetworkImageSource({ chainId: chain.chainId });

            return (
              <TouchableOpacity
                key={chain.chainId}
                onPress={() => handleChainSelect(chain.chainId)}
                testID={`chain-${chain.chainId}`}
              >
                <ListItem
                  verticalAlignment={VerticalAlignment.Center}
                >
                  <Image source={networkImage} style={styles.networkIcon} />
                  <Box style={styles.chainName}>
                    <Text style={styles.networkName}>{chain.name}</Text>
                  </Box>
                </ListItem>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>
    </BottomSheet>
  );
};
