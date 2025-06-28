// third party dependencies
import { ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import React, { useMemo, useCallback, useState } from 'react';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

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
import { getNetworkImageSource } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import Device from '../../../util/device';
import { selectCustomNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';

// internal dependencies
import createStyles from './CustomNetworkSelector.styles';
import {
  CustomNetworkItem,
  CustomNetworkSelectorProps,
} from './CustomNetworkSelector.types';

const CustomNetworkSelector = ({ openModal }: CustomNetworkSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const { navigate } = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();

  const customNetworkConfigurations = useSelector(
    selectCustomNetworkConfigurationsByCaipChainId,
  );

  const [selectedNetwork, setSelectedNetwork] = useState('');

  const goToNetworkSettings = useCallback(() => {
    navigate(Routes.ADD_NETWORK, {
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  }, [navigate]);

  const customNetworks = useMemo(
    () =>
      customNetworkConfigurations.map((network) => {
        const rpcUrl =
          'rpcEndpoints' in network
            ? network.rpcEndpoints?.[network.defaultRpcEndpointIndex]?.url
            : undefined;
        return {
          id: network.caipChainId,
          name: network.name,
          caipChainId: network.caipChainId,
          isSelected: selectedNetwork === network.caipChainId,
          imageSource: getNetworkImageSource({
            chainId: network.caipChainId,
          }),
          networkTypeOrRpcUrl: rpcUrl,
        };
      }),
    [customNetworkConfigurations, selectedNetwork],
  );

  const renderNetworkItem: ListRenderItem<CustomNetworkItem> = useCallback(
    ({ item }) => {
      const { name, caipChainId, networkTypeOrRpcUrl } = item;
      return (
        <View
          testID={`${name}-${selectedNetwork ? 'selected' : 'not-selected'}`}
        >
          <Cell
            variant={CellVariant.SelectWithMenu}
            isSelected={selectedNetwork === caipChainId}
            title={name}
            onPress={() => setSelectedNetwork(caipChainId)}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource: item.imageSource as ImageSourcePropType,
              size: AvatarSize.Sm,
            }}
            buttonIcon={IconName.MoreVertical}
            buttonProps={{
              onButtonClick: () => {
                openModal({
                  isVisible: true,
                  caipChainId,
                  displayEdit: false,
                  networkTypeOrRpcUrl: networkTypeOrRpcUrl || '',
                  isReadOnly: false,
                });
              },
            }}
          ></Cell>
        </View>
      );
    },
    [selectedNetwork, openModal],
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
    [
      goToNetworkSettings,
      colors.icon.alternative,
      colors.text.alternative,
      styles.addNetworkButtonContainer,
      styles.iconContainer,
    ],
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={customNetworks}
        renderItem={renderNetworkItem}
        keyExtractor={(item) => item.caipChainId}
        estimatedItemSize={60}
        ListFooterComponent={renderFooter}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom:
            safeAreaInsets.bottom + Device.getDeviceHeight() * 0.05,
        }}
      />
    </View>
  );
};

export default CustomNetworkSelector;
