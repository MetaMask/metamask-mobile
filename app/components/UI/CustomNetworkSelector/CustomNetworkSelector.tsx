// third party dependencies
import { ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import React, { useCallback } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';

// external dependencies
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { useStyles } from '../../../component-library/hooks/useStyles';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from './../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { isTestNet } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import Device from '../../../util/device';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import { useNetworksToUse } from '../../hooks/useNetworksToUse/useNetworksToUse';

// internal dependencies
import createStyles from './CustomNetworkSelector.styles';
import {
  CustomNetworkItem,
  CustomNetworkSelectorProps,
} from './CustomNetworkSelector.types';
import { NETWORK_MULTI_SELECTOR_TEST_IDS } from '../NetworkMultiSelector/NetworkMultiSelector.constants';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

const CustomNetworkSelector = ({
  openModal,
  dismissModal,
}: CustomNetworkSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const { navigate } = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  // Use custom hooks for network management
  const { networks, areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Custom,
  });

  const { networksToUse } = useNetworksToUse({
    networks,
    networkType: NetworkType.Custom,
    areAllNetworksSelected,
  });

  const { selectCustomNetwork } = useNetworkSelection({
    networks: networksToUse,
  });

  const goToNetworkSettings = useCallback(() => {
    navigate(Routes.ADD_NETWORK, {
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  }, [navigate]);

  const renderNetworkItem: ListRenderItem<CustomNetworkItem> = useCallback(
    ({ item }) => {
      const { name, caipChainId, networkTypeOrRpcUrl, isSelected } = item;
      const rawChainId = parseCaipChainId(caipChainId).reference;
      const chainId = isEvmSelected ? toHex(rawChainId) : rawChainId;

      const handlePress = async () => {
        await selectCustomNetwork(caipChainId, dismissModal);
      };

      const handleMenuPress = () => {
        openModal({
          isVisible: true,
          caipChainId,
          displayEdit: !isTestNet(chainId),
          networkTypeOrRpcUrl: networkTypeOrRpcUrl || '',
          isReadOnly: false,
        });
      };

      return (
        <View>
          <Cell
            variant={CellVariant.SelectWithMenu}
            isSelected={isSelected}
            title={name}
            onPress={handlePress}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource: item.imageSource as ImageSourcePropType,
              size: AvatarSize.Sm,
            }}
            buttonIcon={IconName.MoreVertical}
            buttonProps={{
              onButtonClick: handleMenuPress,
            }}
            testID={NETWORK_MULTI_SELECTOR_TEST_IDS.NETWORK_LIST_ITEM(
              caipChainId,
              isSelected,
            )}
          />
        </View>
      );
    },
    [selectCustomNetwork, openModal, dismissModal, isEvmSelected],
  );

  const renderFooter = useCallback(
    () => (
      <TouchableOpacity
        style={styles.addNetworkButtonContainer}
        onPress={goToNetworkSettings}
      >
        <Icon
          name={IconName.Add}
          size={IconSize.Lg}
          color={colors.icon.alternative}
          style={styles.iconContainer}
        />

        <Text variant={TextVariant.BodyMD} color={colors.text.alternative}>
          {strings('app_settings.network_add_custom_network')}
        </Text>
      </TouchableOpacity>
    ),
    [goToNetworkSettings, colors, styles],
  );

  return (
    <ScrollView
      testID={NETWORK_MULTI_SELECTOR_TEST_IDS.CUSTOM_NETWORKS_CONTAINER}
      style={styles.container}
    >
      <FlashList
        data={networksToUse}
        renderItem={renderNetworkItem}
        keyExtractor={(item) => item.caipChainId}
        ListFooterComponent={renderFooter}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom:
            safeAreaInsets.bottom + Device.getDeviceHeight() * 0.05,
        }}
      />
    </ScrollView>
  );
};

export default CustomNetworkSelector;
