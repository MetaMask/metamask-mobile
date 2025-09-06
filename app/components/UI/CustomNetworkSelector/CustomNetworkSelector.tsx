// third party dependencies
import { ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { KnownCaipNamespace, parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';

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
  useNetworksByCustomNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';

// internal dependencies
import createStyles from './CustomNetworkSelector.styles';
import {
  CustomNetworkItem,
  CustomNetworkSelectorProps,
} from './CustomNetworkSelector.types';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

const CustomNetworkSelector = ({
  openModal,
  dismissModal,
}: CustomNetworkSelectorProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, { colors });
  const { navigate } = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();

  // Use custom hooks for network management
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Custom,
  });

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const { networks: evmNetworks } = useNetworksByCustomNamespace({
    networkType: NetworkType.Custom,
    namespace: KnownCaipNamespace.Eip155,
  });

  const { networks: solanaNetworks } = useNetworksByCustomNamespace({
    networkType: NetworkType.Custom,
    namespace: KnownCaipNamespace.Solana,
  });

  const networksToUse = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      if (evmNetworks && solanaNetworks) {
        return [...evmNetworks, ...solanaNetworks];
      } else if (evmNetworks) {
        return evmNetworks;
      } else if (solanaNetworks) {
        return solanaNetworks;
      }
      return networks;
    }
    return networks;
  }, [
    isMultichainAccountsState2Enabled,
    networks,
    evmNetworks,
    solanaNetworks,
  ]);

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
      const chainId = toHex(rawChainId);

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
        <View testID={`${name}-${isSelected ? 'selected' : 'not-selected'}`}>
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
          />
        </View>
      );
    },
    [selectCustomNetwork, openModal, dismissModal],
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
    <ScrollView style={styles.container}>
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
